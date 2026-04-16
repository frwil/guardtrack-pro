<?php

namespace App\Controller\Api;

use App\Entity\Incident;
use App\Entity\User;
use App\Repository\IncidentRepository;
use App\Repository\SiteRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/incidents')]
class IncidentController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private IncidentRepository $incidentRepository,
        private SiteRepository $siteRepository,
        private UserRepository $userRepository
    ) {
    }

    #[Route('', name: 'api_incidents_list', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['reportedAt' => 'DESC'];
        
        if ($siteId = $request->query->get('siteId')) {
            $criteria['site'] = $siteId;
        }
        if ($status = $request->query->get('status')) {
            $criteria['status'] = $status;
        }
        if ($severity = $request->query->get('severity')) {
            $criteria['severity'] = $severity;
        }
        if ($category = $request->query->get('category')) {
            $criteria['category'] = $category;
        }
        
        $incidents = $this->incidentRepository->findBy($criteria, $orderBy);
        
        return $this->json(array_map(fn(Incident $i) => $this->formatIncident($i), $incidents));
    }

    #[Route('/open', name: 'api_incidents_open', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function open(): JsonResponse
    {
        $incidents = $this->incidentRepository->findBy(
            ['status' => 'OPEN'],
            ['severity' => 'DESC', 'reportedAt' => 'DESC']
        );
        
        return $this->json(array_map(fn(Incident $i) => $this->formatIncident($i), $incidents));
    }

    #[Route('/my', name: 'api_incidents_my', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function myIncidents(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $incidents = $this->incidentRepository->findBy(
            ['reporter' => $user],
            ['reportedAt' => 'DESC']
        );
        
        return $this->json(array_map(fn(Incident $i) => $this->formatIncident($i, true), $incidents));
    }

    #[Route('/assigned', name: 'api_incidents_assigned', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function assigned(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $incidents = $this->incidentRepository->findBy(
            ['assignedTo' => $user, 'status' => ['OPEN', 'IN_PROGRESS']],
            ['severity' => 'DESC', 'reportedAt' => 'ASC']
        );
        
        return $this->json(array_map(fn(Incident $i) => $this->formatIncident($i, true), $incidents));
    }

    #[Route('/{id}', name: 'api_incidents_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $user */
        $user = $this->getUser();
        
        // Vérifier les permissions
        if ($user->getRole() === User::ROLE_AGENT && $incident->getReporter()->getId() !== $user->getId()) {
            if (!$incident->getAssignedTo() || $incident->getAssignedTo()->getId() !== $user->getId()) {
                return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
            }
        }
        
        return $this->json($this->formatIncident($incident, true));
    }

    #[Route('', name: 'api_incidents_create', methods: ['POST'])]
    #[IsGranted('ROLE_AGENT')]
    public function create(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);
        
        $site = $this->siteRepository->find($data['siteId']);
        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_BAD_REQUEST);
        }
        
        $incident = new Incident();
        $incident->setTitle($data['title']);
        $incident->setDescription($data['description']);
        $incident->setCategory($data['category']);
        $incident->setSeverity($data['severity'] ?? 'MEDIUM');
        $incident->setReporter($user);
        $incident->setSite($site);
        $incident->setReportedAt(new \DateTimeImmutable());
        $incident->setStatus('OPEN');
        $incident->setPhotos($data['photos'] ?? null);
        $incident->setWitnesses($data['witnesses'] ?? null);
        
        $this->entityManager->persist($incident);
        $this->entityManager->flush();
        
        // Notifier les superviseurs (à implémenter)
        
        return $this->json([
            'id' => $incident->getId(),
            'title' => $incident->getTitle(),
            'status' => $incident->getStatus(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_incidents_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        // Seul le rapporteur, l'assigné ou un superviseur+ peut modifier
        $canEdit = $user->getId() === $incident->getReporter()->getId()
            || ($incident->getAssignedTo() && $user->getId() === $incident->getAssignedTo()->getId())
            || $user->isSuperviseur();
        
        if (!$canEdit) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        $data = json_decode($request->getContent(), true);
        
        if (isset($data['title'])) $incident->setTitle($data['title']);
        if (isset($data['description'])) $incident->setDescription($data['description']);
        if (isset($data['category'])) $incident->setCategory($data['category']);
        if (isset($data['severity']) && $user->isSuperviseur()) {
            $incident->setSeverity($data['severity']);
        }
        if (isset($data['photos'])) $incident->setPhotos($data['photos']);
        if (isset($data['witnesses'])) $incident->setWitnesses($data['witnesses']);
        
        $this->entityManager->flush();
        
        return $this->json(['message' => 'Incident updated successfully']);
    }

    #[Route('/{id}/assign', name: 'api_incidents_assign', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function assign(int $id, Request $request): JsonResponse
    {
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        $data = json_decode($request->getContent(), true);
        
        $assignedTo = null;
        if (isset($data['userId'])) {
            $assignedTo = $this->userRepository->find($data['userId']);
        }
        
        $incident->setAssignedTo($assignedTo);
        $incident->setStatus($assignedTo ? 'IN_PROGRESS' : 'OPEN');
        
        $this->entityManager->flush();
        
        return $this->json([
            'assignedTo' => $assignedTo ? [
                'id' => $assignedTo->getId(),
                'fullName' => $assignedTo->getFullName(),
            ] : null,
            'status' => $incident->getStatus(),
        ]);
    }

    #[Route('/{id}/resolve', name: 'api_incidents_resolve', methods: ['PATCH'])]
    public function resolve(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        // Vérifier les permissions
        $canResolve = $user->isSuperviseur()
            || ($incident->getAssignedTo() && $user->getId() === $incident->getAssignedTo()->getId());
        
        if (!$canResolve) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        $data = json_decode($request->getContent(), true);
        
        $incident->setStatus('RESOLVED');
        $incident->setResolvedAt(new \DateTimeImmutable());
        $incident->setResolution($data['resolution'] ?? null);
        
        $this->entityManager->flush();
        
        return $this->json([
            'status' => 'RESOLVED',
            'resolvedAt' => $incident->getResolvedAt()->format('c'),
        ]);
    }

    #[Route('/{id}/escalate', name: 'api_incidents_escalate', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function escalate(int $id): JsonResponse
    {
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        // Augmenter la sévérité
        $severityLevels = ['LOW' => 0, 'MEDIUM' => 1, 'HIGH' => 2, 'CRITICAL' => 3];
        $currentLevel = $severityLevels[$incident->getSeverity()] ?? 0;
        $newLevel = min($currentLevel + 1, 3);
        $newSeverity = array_search($newLevel, $severityLevels);
        
        $incident->setSeverity($newSeverity);
        
        $this->entityManager->flush();
        
        return $this->json([
            'severity' => $newSeverity,
        ]);
    }

    #[Route('/{id}/close', name: 'api_incidents_close', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function close(int $id): JsonResponse
    {
        $incident = $this->incidentRepository->find($id);
        
        if (!$incident) {
            return $this->json(['error' => 'Incident not found'], Response::HTTP_NOT_FOUND);
        }
        
        $incident->setStatus('CLOSED');
        $incident->setResolvedAt(new \DateTimeImmutable());
        
        $this->entityManager->flush();
        
        return $this->json(['status' => 'CLOSED']);
    }

    #[Route('/categories', name: 'api_incidents_categories', methods: ['GET'])]
    public function categories(): JsonResponse
    {
        return $this->json([
            'categories' => [
                'INTRUSION', 'VOL', 'DEGRADATION', 'INCENDIE', 'ACCIDENT',
                'MEDICAL', 'TECHNIQUE', 'COMPORTEMENT', 'AUTRE'
            ],
            'severities' => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        ]);
    }

    private function formatIncident(Incident $incident, bool $includeDetails = false): array
    {
        $data = [
            'id' => $incident->getId(),
            'title' => $incident->getTitle(),
            'category' => $incident->getCategory(),
            'severity' => $incident->getSeverity(),
            'status' => $incident->getStatus(),
            'reporter' => [
                'id' => $incident->getReporter()->getId(),
                'fullName' => $incident->getReporter()->getFullName(),
            ],
            'site' => [
                'id' => $incident->getSite()->getId(),
                'name' => $incident->getSite()->getName(),
            ],
            'reportedAt' => $incident->getReportedAt()->format('c'),
            'assignedTo' => $incident->getAssignedTo() ? [
                'id' => $incident->getAssignedTo()->getId(),
                'fullName' => $incident->getAssignedTo()->getFullName(),
            ] : null,
            'hasPhotos' => !empty($incident->getPhotos()),
        ];
        
        if ($includeDetails) {
            $data['description'] = $incident->getDescription();
            $data['photos'] = $incident->getPhotos();
            $data['witnesses'] = $incident->getWitnesses();
            $data['resolution'] = $incident->getResolution();
            $data['resolvedAt'] = $incident->getResolvedAt()?->format('c');
        }
        
        return $data;
    }
}
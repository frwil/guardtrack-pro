<?php

namespace App\Controller\Api;

use App\Entity\Assignment;
use App\Entity\User;
use App\Repository\AssignmentRepository;
use App\Repository\SiteRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/assignments')]
class AssignmentController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private AssignmentRepository $assignmentRepository,
        private UserRepository $userRepository,
        private SiteRepository $siteRepository
    ) {
    }

    #[Route('', name: 'api_assignments_list', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['startDate' => 'DESC'];
        
        if ($agentId = $request->query->get('agentId')) {
            $criteria['agent'] = $agentId;
        }
        if ($siteId = $request->query->get('siteId')) {
            $criteria['site'] = $siteId;
        }
        if ($status = $request->query->get('status')) {
            $criteria['status'] = $status;
        }
        
        // Filtrer par date
        if ($from = $request->query->get('from')) {
            $criteria['startDate'] = ['>=', new \DateTimeImmutable($from)];
        }
        
        $assignments = $this->assignmentRepository->findBy($criteria, $orderBy);
        
        return $this->json(array_map(fn(Assignment $a) => [
            'id' => $a->getId(),
            'agent' => [
                'id' => $a->getAgent()->getId(),
                'fullName' => $a->getAgent()->getFullName(),
            ],
            'site' => [
                'id' => $a->getSite()->getId(),
                'name' => $a->getSite()->getName(),
            ],
            'status' => $a->getStatus(),
            'startDate' => $a->getStartDate()->format('c'),
            'endDate' => $a->getEndDate()?->format('c'),
            'replaces' => $a->getReplaces() ? [
                'id' => $a->getReplaces()->getId(),
                'agent' => $a->getReplaces()->getAgent()->getFullName(),
            ] : null,
        ], $assignments));
    }

    #[Route('/active', name: 'api_assignments_active', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function active(): JsonResponse
    {
        $assignments = $this->assignmentRepository->findBy(['status' => 'ACTIVE'], ['startDate' => 'DESC']);
        
        return $this->json(array_map(fn(Assignment $a) => [
            'id' => $a->getId(),
            'agent' => [
                'id' => $a->getAgent()->getId(),
                'fullName' => $a->getAgent()->getFullName(),
            ],
            'site' => [
                'id' => $a->getSite()->getId(),
                'name' => $a->getSite()->getName(),
                'address' => $a->getSite()->getAddress(),
            ],
            'startDate' => $a->getStartDate()->format('c'),
        ], $assignments));
    }

    #[Route('/my', name: 'api_assignments_my', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function myAssignments(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        if (!$user) {
            return $this->json(['error' => 'User not authenticated'], Response::HTTP_UNAUTHORIZED);
        }
        
        $activeAssignments = $user->getAssignments()->filter(fn($a) => $a->getStatus() === 'ACTIVE');
        
        if ($activeAssignments->isEmpty()) {
            return $this->json([]);
        }
        
        return $this->json(array_map(fn(Assignment $a) => [
            'id' => $a->getId(),
            'site' => [
                'id' => $a->getSite()->getId(),
                'name' => $a->getSite()->getName(),
                'address' => $a->getSite()->getAddress(),
                'latitude' => $a->getSite()->getLatitude(),
                'longitude' => $a->getSite()->getLongitude(),
                'geofencingRadius' => $a->getSite()->getGeofencingRadius(),
            ],
            'startDate' => $a->getStartDate()->format('c'),
            'endDate' => $a->getEndDate()?->format('c'),
        ], $activeAssignments->toArray()));
    }

    #[Route('/{id}', name: 'api_assignments_show', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function show(int $id): JsonResponse
    {
        $assignment = $this->assignmentRepository->find($id);
        
        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $user */
        $user = $this->getUser();
        
        // Un agent peut voir sa propre affectation
        if ($user->getRole() === User::ROLE_AGENT && $assignment->getAgent()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        return $this->json([
            'id' => $assignment->getId(),
            'agent' => [
                'id' => $assignment->getAgent()->getId(),
                'fullName' => $assignment->getAgent()->getFullName(),
                'email' => $assignment->getAgent()->getEmail(),
                'phone' => $assignment->getAgent()->getPhone(),
            ],
            'site' => [
                'id' => $assignment->getSite()->getId(),
                'name' => $assignment->getSite()->getName(),
                'address' => $assignment->getSite()->getAddress(),
                'client' => $assignment->getSite()->getClient()->getName(),
            ],
            'status' => $assignment->getStatus(),
            'startDate' => $assignment->getStartDate()->format('c'),
            'endDate' => $assignment->getEndDate()?->format('c'),
            'replaces' => $assignment->getReplaces() ? [
                'id' => $assignment->getReplaces()->getId(),
                'agent' => $assignment->getReplaces()->getAgent()->getFullName(),
            ] : null,
            'createdAt' => $assignment->getCreatedAt()->format('c'),
            'presencesCount' => $assignment->getPresences()->count(),
        ]);
    }

    #[Route('', name: 'api_assignments_create', methods: ['POST'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['agentId'], $data['siteId'], $data['startDate'])) {
            return $this->json(['error' => 'Missing required fields'], Response::HTTP_BAD_REQUEST);
        }
        
        $agent = $this->userRepository->find($data['agentId']);
        $site = $this->siteRepository->find($data['siteId']);
        
        if (!$agent || !$site) {
            return $this->json(['error' => 'Agent or site not found'], Response::HTTP_BAD_REQUEST);
        }
        
        // Vérifier si l'agent est déjà assigné à ce site avec statut ACTIVE
        $existingAssignment = $this->assignmentRepository->findOneBy([
            'agent' => $agent,
            'site' => $site,
            'status' => 'ACTIVE'
        ]);
        
        if ($existingAssignment) {
            return $this->json(['error' => 'Agent already assigned to this site'], Response::HTTP_CONFLICT);
        }
        
        $assignment = new Assignment();
        $assignment->setAgent($agent);
        $assignment->setSite($site);
        $assignment->setStartDate(new \DateTimeImmutable($data['startDate']));
        $assignment->setEndDate(isset($data['endDate']) ? new \DateTimeImmutable($data['endDate']) : null);
        $assignment->setStatus($data['status'] ?? 'ACTIVE');
        
        if (isset($data['replacesId'])) {
            $replaces = $this->assignmentRepository->find($data['replacesId']);
            if ($replaces) {
                $assignment->setReplaces($replaces);
                // Désactiver l'ancienne affectation
                $replaces->setStatus('REPLACED');
            }
        }
        
        $this->entityManager->persist($assignment);
        $this->entityManager->flush();
        
        return $this->json([
            'id' => $assignment->getId(),
            'message' => 'Assignment created successfully',
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_assignments_update', methods: ['PUT'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function update(int $id, Request $request): JsonResponse
    {
        $assignment = $this->assignmentRepository->find($id);
        
        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], Response::HTTP_NOT_FOUND);
        }
        
        $data = json_decode($request->getContent(), true);
        
        if (isset($data['status'])) {
            $assignment->setStatus($data['status']);
        }
        if (isset($data['endDate'])) {
            $assignment->setEndDate($data['endDate'] ? new \DateTimeImmutable($data['endDate']) : null);
        }
        if (isset($data['startDate'])) {
            $assignment->setStartDate(new \DateTimeImmutable($data['startDate']));
        }
        
        $this->entityManager->flush();
        
        return $this->json(['message' => 'Assignment updated successfully']);
    }

    #[Route('/{id}/cancel', name: 'api_assignments_cancel', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function cancel(int $id): JsonResponse
    {
        $assignment = $this->assignmentRepository->find($id);
        
        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($assignment->getStatus() === 'CANCELLED') {
            return $this->json(['error' => 'Assignment already cancelled'], Response::HTTP_CONFLICT);
        }
        
        $assignment->setStatus('CANCELLED');
        $assignment->setEndDate(new \DateTimeImmutable());
        $this->entityManager->flush();
        
        return $this->json([
            'message' => 'Assignment cancelled',
            'status' => 'CANCELLED',
        ]);
    }

    #[Route('/{id}/complete', name: 'api_assignments_complete', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function complete(int $id): JsonResponse
    {
        $assignment = $this->assignmentRepository->find($id);
        
        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($assignment->getStatus() === 'COMPLETED') {
            return $this->json(['error' => 'Assignment already completed'], Response::HTTP_CONFLICT);
        }
        
        $assignment->setStatus('COMPLETED');
        $assignment->setEndDate(new \DateTimeImmutable());
        $this->entityManager->flush();
        
        return $this->json([
            'message' => 'Assignment completed',
            'status' => 'COMPLETED',
        ]);
    }

    #[Route('/{id}/reactivate', name: 'api_assignments_reactivate', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function reactivate(int $id): JsonResponse
    {
        $assignment = $this->assignmentRepository->find($id);
        
        if (!$assignment) {
            return $this->json(['error' => 'Assignment not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($assignment->getStatus() === 'ACTIVE') {
            return $this->json(['error' => 'Assignment already active'], Response::HTTP_CONFLICT);
        }
        
        $assignment->setStatus('ACTIVE');
        $assignment->setEndDate(null);
        $this->entityManager->flush();
        
        return $this->json([
            'message' => 'Assignment reactivated',
            'status' => 'ACTIVE',
        ]);
    }
}
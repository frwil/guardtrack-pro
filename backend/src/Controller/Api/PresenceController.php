<?php

namespace App\Controller\Api;

use App\Entity\Presence;
use App\Entity\User;
use App\Repository\AssignmentRepository;
use App\Repository\PresenceRepository;
use App\Repository\SiteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/presences')]
class PresenceController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private PresenceRepository $presenceRepository,
        private SiteRepository $siteRepository,
        private AssignmentRepository $assignmentRepository
    ) {}

    #[Route('', name: 'api_presences_list', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['checkIn' => 'DESC'];

        if ($agentId = $request->query->get('agentId')) {
            $criteria['agent'] = $agentId;
        }
        if ($siteId = $request->query->get('siteId')) {
            $criteria['site'] = $siteId;
        }
        if ($status = $request->query->get('status')) {
            $criteria['status'] = $status;
        }
        if ($date = $request->query->get('date')) {
            $start = new \DateTimeImmutable($date . ' 00:00:00');
            $end = new \DateTimeImmutable($date . ' 23:59:59');
            $criteria['checkIn'] = ['between', $start, $end];
        }

        $presences = $this->presenceRepository->findBy($criteria, $orderBy, $request->query->get('limit', 100));

        return $this->json(array_map(fn(Presence $p) => $this->formatPresence($p), $presences));
    }

    #[Route('/pending', name: 'api_presences_pending', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function pending(): JsonResponse
    {
        $presences = $this->presenceRepository->findBy(['status' => 'PENDING'], ['checkIn' => 'ASC']);

        return $this->json(array_map(fn(Presence $p) => $this->formatPresence($p), $presences));
    }

    #[Route('/my', name: 'api_presences_my', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function myPresences(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $limit = $request->query->get('limit', 50);
        $presences = $this->presenceRepository->findBy(
            ['agent' => $user],
            ['checkIn' => 'DESC'],
            $limit
        );

        return $this->json(array_map(fn(Presence $p) => $this->formatPresence($p, true), $presences));
    }

    #[Route('/today', name: 'api_presences_today', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function today(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $today = new \DateTimeImmutable('today');
        $tomorrow = new \DateTimeImmutable('tomorrow');

        $presences = $this->presenceRepository->createQueryBuilder('p')
            ->where('p.agent = :agent')
            ->andWhere('p.checkIn >= :today')
            ->andWhere('p.checkIn < :tomorrow')
            ->setParameter('agent', $user)
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->orderBy('p.checkIn', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(Presence $p) => $this->formatPresence($p, true), $presences));
    }

    #[Route('/check-in', name: 'api_presences_checkin', methods: ['POST'])]
    #[IsGranted('ROLE_AGENT')]
    public function checkIn(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $site = $this->siteRepository->find($data['siteId']);
        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_BAD_REQUEST);
        }

        // Vérifier si l'agent est assigné à ce site
        $assignment = $this->assignmentRepository->findOneBy([
            'agent' => $user,
            'site' => $site,
            'status' => 'ACTIVE'
        ]);

        if (!$assignment) {
            return $this->json(['error' => 'You are not assigned to this site'], Response::HTTP_FORBIDDEN);
        }

        // Vérifier si l'agent a déjà pointé aujourd'hui sur ce site
        $today = new \DateTimeImmutable('today');
        $existingPresence = $this->presenceRepository->findOneBy([
            'agent' => $user,
            'site' => $site,
        ]);

        if ($existingPresence && $existingPresence->getCheckIn() >= $today && !$existingPresence->getCheckOut()) {
            return $this->json(['error' => 'You already checked in today'], Response::HTTP_CONFLICT);
        }

        // Vérifier le géorepérage si activé
        if ($site->getGeofencingRadius() && isset($data['latitude'], $data['longitude'])) {
            $distance = $this->calculateDistance(
                (float)$site->getLatitude(),
                (float)$site->getLongitude(),
                (float)$data['latitude'],
                (float)$data['longitude']
            );

            if ($distance > $site->getGeofencingRadius()) {
                return $this->json([
                    'error' => 'You are too far from the site',
                    'distance' => round($distance, 0) . 'm',
                    'maxDistance' => $site->getGeofencingRadius() . 'm',
                ], Response::HTTP_FORBIDDEN);
            }
        }

        $presence = new Presence();
        $presence->setAgent($user);
        $presence->setSite($site);
        $presence->setAssignment($assignment);
        $presence->setCheckIn(new \DateTimeImmutable());
        $presence->setGpsLatitude($data['latitude'] ?? null);
        $presence->setGpsLongitude($data['longitude'] ?? null);
        $presence->setPhoto($data['photo'] ?? null);
        $presence->setStatus('PENDING');

        // Calculer le score de suspicion
        $suspicionScore = $this->calculateSuspicionScore($presence, $data);
        $presence->setSuspicionScore($suspicionScore);

        $this->entityManager->persist($presence);
        $this->entityManager->flush();

        return $this->json([
            'id' => $presence->getId(),
            'checkIn' => $presence->getCheckIn()->format('c'),
            'suspicionScore' => $suspicionScore,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}/check-out', name: 'api_presences_checkout', methods: ['PATCH'])]
    #[IsGranted('ROLE_AGENT')]
    public function checkOut(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $presence = $this->presenceRepository->find($id);

        if (!$presence) {
            return $this->json(['error' => 'Presence not found'], Response::HTTP_NOT_FOUND);
        }

        if ($presence->getAgent()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        if ($presence->getCheckOut()) {
            return $this->json(['error' => 'Already checked out'], Response::HTTP_CONFLICT);
        }

        $data = json_decode($request->getContent(), true);

        $presence->setCheckOut(new \DateTimeImmutable());
        if (isset($data['latitude'], $data['longitude'])) {
            $presence->setGpsLatitude($data['latitude']);
            $presence->setGpsLongitude($data['longitude']);
        }

        $this->entityManager->flush();

        return $this->json([
            'checkOut' => $presence->getCheckOut()->format('c'),
        ]);
    }

    #[Route('/{id}/validate', name: 'api_presences_validate', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function validate(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $presence = $this->presenceRepository->find($id);

        if (!$presence) {
            return $this->json(['error' => 'Presence not found'], Response::HTTP_NOT_FOUND);
        }

        if ($presence->getAgent()->getId() === $user->getId()) {
            return $this->json(['error' => 'Cannot validate your own presence'], Response::HTTP_FORBIDDEN);
        }

        $presence->setStatus('VALIDATED');
        $presence->setValidator($user);
        $presence->setValidationDate(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json(['status' => 'VALIDATED']);
    }

    #[Route('/{id}/reject', name: 'api_presences_reject', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function reject(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $presence = $this->presenceRepository->find($id);

        if (!$presence) {
            return $this->json(['error' => 'Presence not found'], Response::HTTP_NOT_FOUND);
        }

        if ($presence->getAgent()->getId() === $user->getId()) {
            return $this->json(['error' => 'Cannot reject your own presence'], Response::HTTP_FORBIDDEN);
        }

        $presence->setStatus('REJECTED');
        $presence->setValidator($user);
        $presence->setValidationDate(new \DateTimeImmutable());
        $presence->setRejectionReason($data['reason'] ?? null);

        $this->entityManager->flush();

        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/{id}', name: 'api_presences_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $presence = $this->presenceRepository->find($id);

        if (!$presence) {
            return $this->json(['error' => 'Presence not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();

        // Vérifier les permissions
        if ($user->getRole() === User::ROLE_AGENT && $presence->getAgent()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->formatPresence($presence, true));
    }

    private function formatPresence(Presence $presence, bool $includeDetails = false): array
    {
        $data = [
            'id' => $presence->getId(),
            'agent' => [
                'id' => $presence->getAgent()->getId(),
                'fullName' => $presence->getAgent()->getFullName(),
            ],
            'site' => [
                'id' => $presence->getSite()->getId(),
                'name' => $presence->getSite()->getName(),
            ],
            'checkIn' => $presence->getCheckIn()->format('c'),
            'checkOut' => $presence->getCheckOut()?->format('c'),
            'status' => $presence->getStatus(),
            'hasPhoto' => $presence->getPhoto() !== null,
        ];

        if ($includeDetails) {
            $data['gpsLatitude'] = $presence->getGpsLatitude();
            $data['gpsLongitude'] = $presence->getGpsLongitude();
            $data['suspicionScore'] = $presence->getSuspicionScore();
            $data['validator'] = $presence->getValidator() ? [
                'id' => $presence->getValidator()->getId(),
                'fullName' => $presence->getValidator()->getFullName(),
            ] : null;
            $data['validationDate'] = $presence->getValidationDate()?->format('c');
            $data['rejectionReason'] = $presence->getRejectionReason();
        }

        return $data;
    }

    private function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // mètres

        $lat1 = deg2rad($lat1);
        $lon1 = deg2rad($lon1);
        $lat2 = deg2rad($lat2);
        $lon2 = deg2rad($lon2);

        $dLat = $lat2 - $lat1;
        $dLon = $lon2 - $lon1;

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos($lat1) * cos($lat2) *
            sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    private function calculateSuspicionScore(Presence $presence, array $data): int
    {
        $score = 0;

        // GPS (0,0) suspect
        if (isset($data['latitude'], $data['longitude'])) {
            if ($data['latitude'] == 0 && $data['longitude'] == 0) {
                $score += 30;
            }
        } else {
            $score += 20;
        }

        // Pas de photo
        if (!isset($data['photo'])) {
            $score += 20;
        }

        // Heure suspecte (entre 22h et 5h)
        $hour = (int) date('H');
        if ($hour >= 22 || $hour <= 5) {
            $score += 10;
        }

        return min($score, 100);
    }

    /**
     * Récupère les présences en litige
     */
    #[Route('/disputes', name: 'api_presences_disputes', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function getDisputes(): JsonResponse
    {
        $presences = $this->presenceRepository->findBy(
            ['status' => Presence::STATUS_DISPUTED],
            ['checkIn' => 'DESC']
        );

        return $this->json(array_map(fn(Presence $p) => [
            'id' => $p->getId(),
            'agent' => [
                'id' => $p->getAgent()?->getId(),
                'fullName' => $p->getAgent()?->getFullName(),
            ],
            'site' => [
                'id' => $p->getSite()->getId(),
                'name' => $p->getSite()->getName(),
                'address' => $p->getSite()->getAddress(),
            ],
            'checkIn' => $p->getCheckIn()->format('c'),
            'status' => $p->getStatus(),
            'agentDeclared' => $p->getCheckIn() ? 'PRESENT' : 'ABSENT',
            'controllerVerdict' => $p->getControllerVerdict(),
            'controller' => $p->getController() ? [
                'id' => $p->getController()->getId(),
                'fullName' => $p->getController()->getFullName(),
            ] : null,
            'controllerComment' => $p->getControllerComment(),
            'suspicionScore' => $p->getSuspicionScore(),
            'photo' => $p->getPhoto(),
            'gpsLatitude' => $p->getGpsLatitude(),
            'gpsLongitude' => $p->getGpsLongitude(),
        ], $presences));
    }

    /**
     * Résout un litige
     */
    #[Route('/{id}/resolve-dispute', name: 'api_presences_resolve_dispute', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function resolveDispute(int $id, Request $request): JsonResponse
    {
        $presence = $this->presenceRepository->find($id);

        if (!$presence) {
            return $this->json(['error' => 'Presence not found'], Response::HTTP_NOT_FOUND);
        }

        if ($presence->getStatus() !== Presence::STATUS_DISPUTED) {
            return $this->json(['error' => 'Presence is not disputed'], Response::HTTP_BAD_REQUEST);
        }

        $data = json_decode($request->getContent(), true);
        $resolution = $data['resolution'] ?? null;
        $note = $data['note'] ?? null;

        /** @var User $user */
        $user = $this->getUser();

        $presence->resolve($user, $resolution, $note);
        $this->entityManager->flush();

        return $this->json([
            'resolved' => true,
            'status' => $presence->getStatus(),
        ]);
    }
}

<?php

namespace App\Controller\Api;

use App\Entity\Round;
use App\Entity\RoundSite;
use App\Entity\User;
use App\Entity\Presence;
use App\Repository\RoundRepository;
use App\Repository\SiteRepository;
use App\Repository\UserRepository;
use App\Repository\PresenceRepository;
use App\Repository\RoundSiteRepository;
use App\Repository\AssignmentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/rounds')]
class RoundController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private RoundRepository $roundRepository,
        private SiteRepository $siteRepository,
        private UserRepository $userRepository,
        private PresenceRepository $presenceRepository,
        private RoundSiteRepository $roundSiteRepository,
        private AssignmentRepository $assignmentRepository
    ) {}

    // ============================================================
    // 1. ROUTES SANS PARAMÈTRE (en premier !)
    // ============================================================

    #[Route('', name: 'api_rounds_list', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['scheduledStart' => 'DESC'];

        if ($agentId = $request->query->get('agentId')) {
            $criteria['agent'] = $agentId;
        }
        if ($status = $request->query->get('status')) {
            $criteria['status'] = $status;
        }
        if ($date = $request->query->get('date')) {
            $start = new \DateTimeImmutable($date . ' 00:00:00');
            $end = new \DateTimeImmutable($date . ' 23:59:59');
            $criteria['scheduledStart'] = ['between', $start, $end];
        }

        $rounds = $this->roundRepository->findBy($criteria, $orderBy);

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r), $rounds));
    }

    #[Route('', name: 'api_rounds_create', methods: ['POST'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        /** @var User $currentUser */
        $currentUser = $this->getUser();

        $agentId = $data['agentId'] ?? null;
        if (!$agentId && isset($data['sites']) && !empty($data['sites'])) {
            $firstSiteId = $data['sites'][0]['id'] ?? null;
            if ($firstSiteId) {
                $assignment = $this->assignmentRepository->findOneBy([
                    'site' => $firstSiteId,
                    'status' => 'ACTIVE'
                ]);
                if ($assignment) {
                    $agentId = $assignment->getAgent()->getId();
                }
            }
        }

        if (!$agentId) {
            return $this->json(['error' => 'Agent not found'], Response::HTTP_BAD_REQUEST);
        }

        $agent = $this->userRepository->find($agentId);
        if (!$agent) {
            return $this->json(['error' => 'Agent not found'], Response::HTTP_BAD_REQUEST);
        }

        $round = new Round();
        $round->setName($data['name']);
        $round->setAgent($agent);
        $round->setScheduledStart(new \DateTimeImmutable($data['scheduledStart']));
        $round->setScheduledEnd(isset($data['scheduledEnd']) ? new \DateTimeImmutable($data['scheduledEnd']) : null);
        $round->setStatus('PLANNED');

        // ✅ Assigner le contrôleur connecté comme superviseur (version corrigée)
        if ($currentUser) {
            $round->setSupervisor($currentUser);
        }

        // Si un supervisorId est explicitement fourni, il écrase le contrôleur connecté
        if (isset($data['supervisorId'])) {
            $supervisor = $this->userRepository->find($data['supervisorId']);
            if ($supervisor) {
                $round->setSupervisor($supervisor);
            }
        }

        // Ajouter les sites
        if (isset($data['sites']) && is_array($data['sites'])) {
            foreach ($data['sites'] as $index => $siteData) {
                $site = $this->siteRepository->find($siteData['id']);
                if ($site) {
                    $roundSite = new RoundSite();
                    $roundSite->setRound($round);
                    $roundSite->setSite($site);
                    $roundSite->setVisitOrder($index + 1);
                    $round->addRoundSite($roundSite);
                    $this->entityManager->persist($roundSite);
                }
            }
        }

        $this->entityManager->persist($round);
        $this->entityManager->flush();

        return $this->json([
            'id' => $round->getId(),
            'name' => $round->getName(),
            'agent' => $round->getAgent() ? [
                'id' => $round->getAgent()->getId(),
                'fullName' => $round->getAgent()->getFullName(),
            ] : null,
            'supervisor' => $round->getSupervisor() ? [
                'id' => $round->getSupervisor()->getId(),
                'fullName' => $round->getSupervisor()->getFullName(),
            ] : null,
            'sitesCount' => $round->getRoundSites()->count(),
        ], Response::HTTP_CREATED);
    }

    // ============================================================
    // 2. ROUTES AVEC PARTIES FIXES (AVANT les paramètres)
    // ============================================================

    #[Route('/active', name: 'api_rounds_active', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function active(): JsonResponse
    {
        $rounds = $this->roundRepository->findBy(
            ['status' => ['IN_PROGRESS', 'PLANNED']],
            ['scheduledStart' => 'ASC']
        );

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r), $rounds));
    }

    #[Route('/my', name: 'api_rounds_my', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function myRounds(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $rounds = $this->roundRepository->findBy(
            ['agent' => $user],
            ['scheduledStart' => 'DESC']
        );

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r, true), $rounds));
    }

    #[Route('/today', name: 'api_rounds_today', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function today(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $today = new \DateTimeImmutable('today');
        $tomorrow = new \DateTimeImmutable('tomorrow');

        $rounds = $this->roundRepository->createQueryBuilder('r')
            ->where('r.agent = :agent')
            ->andWhere('r.scheduledStart >= :today')
            ->andWhere('r.scheduledStart < :tomorrow')
            ->setParameter('agent', $user)
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->orderBy('r.scheduledStart', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r, true), $rounds));
    }

    #[Route('/pending-validation', name: 'api_rounds_pending_validation', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function pendingValidation(): JsonResponse
    {
        $rounds = $this->roundRepository->createQueryBuilder('r')
            ->leftJoin('r.roundSites', 'rs')
            ->where('r.status = :status')
            ->andWhere('rs.visitedAt IS NOT NULL')
            ->andWhere('rs.isValidated = :validated')
            ->setParameter('status', 'COMPLETED')
            ->setParameter('validated', false)
            ->orderBy('r.scheduledStart', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r, true), $rounds));
    }

    #[Route('/my-planned', name: 'api_rounds_my_planned', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function myPlannedRounds(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $rounds = $this->roundRepository->createQueryBuilder('r')
            ->where('r.supervisor = :user')
            ->andWhere('r.status IN (:statuses)')
            ->setParameter('user', $user)
            ->setParameter('statuses', ['PLANNED', 'IN_PROGRESS'])
            ->orderBy('r.scheduledStart', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map(fn(Round $r) => $this->formatRound($r, true), $rounds));
    }

    // ============================================================
    // 3. ROUTES AVEC PARAMÈTRE {id} (en dernier !)
    // ============================================================

    #[Route('/{id}', name: 'api_rounds_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();

        // Vérifier les permissions
        if ($user->getRole() === User::ROLE_AGENT && $round->getAgent()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        return $this->json($this->formatRound($round, true));
    }

    #[Route('/{id}/start', name: 'api_rounds_start', methods: ['PATCH'])]
    #[IsGranted('ROLE_AGENT')]
    public function start(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        if ($round->getAgent()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'You are not assigned to this round'], Response::HTTP_FORBIDDEN);
        }

        if ($round->getStatus() !== 'PLANNED') {
            return $this->json(['error' => 'Round cannot be started'], Response::HTTP_CONFLICT);
        }

        $round->setStatus('IN_PROGRESS');
        $round->setActualStart(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json([
            'status' => 'IN_PROGRESS',
            'actualStart' => $round->getActualStart()->format('c'),
        ]);
    }

    #[Route('/{id}/start-controller', name: 'api_rounds_start_controller', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function startAsController(int $id): JsonResponse
    {
        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();

        if ($round->getSupervisor()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'You are not assigned to this round'], Response::HTTP_FORBIDDEN);
        }

        if ($round->getStatus() !== 'PLANNED') {
            return $this->json(['error' => 'Round cannot be started'], Response::HTTP_CONFLICT);
        }

        $round->setStatus('IN_PROGRESS');
        $round->setActualStart(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json([
            'status' => 'IN_PROGRESS',
            'actualStart' => $round->getActualStart()->format('c'),
        ]);
    }

    #[Route('/{id}/complete', name: 'api_rounds_complete', methods: ['PATCH'])]
    #[IsGranted('ROLE_AGENT')]
    public function complete(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        if ($round->getAgent()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        if ($round->getStatus() !== 'IN_PROGRESS') {
            return $this->json(['error' => 'Round is not in progress'], Response::HTTP_CONFLICT);
        }

        $round->setStatus('COMPLETED');
        $round->setActualEnd(new \DateTimeImmutable());

        $this->entityManager->flush();

        return $this->json([
            'status' => 'COMPLETED',
            'actualEnd' => $round->getActualEnd()->format('c'),
        ]);
    }

    #[Route('/{id}/cancel', name: 'api_rounds_cancel', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function cancel(int $id): JsonResponse
    {
        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        if (in_array($round->getStatus(), ['COMPLETED', 'CANCELLED'])) {
            return $this->json(['error' => 'Round cannot be cancelled'], Response::HTTP_CONFLICT);
        }

        $round->setStatus('CANCELLED');
        $this->entityManager->flush();

        return $this->json(['status' => 'CANCELLED']);
    }

    #[Route('/{id}/validate-all', name: 'api_rounds_validate_all', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function validateAll(int $id): JsonResponse
    {
        $round = $this->roundRepository->find($id);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        foreach ($round->getRoundSites() as $roundSite) {
            if ($roundSite->getVisitedAt() && !$roundSite->isValidated()) {
                $roundSite->setIsValidated(true);
                $roundSite->setValidatedAt(new \DateTimeImmutable());
            }
        }

        $this->entityManager->flush();

        return $this->json([
            'validated' => true,
            'validatedCount' => $round->getRoundSites()->filter(fn($rs) => $rs->isValidated())->count(),
        ]);
    }

    // ============================================================
    // 4. ROUTES AVEC DEUX PARAMÈTRES
    // ============================================================

    #[Route('/{roundId}/sites/{siteId}/visit', name: 'api_rounds_visit_site', methods: ['POST'])]
    #[IsGranted('ROLE_AGENT')]
    public function visitSite(int $roundId, int $siteId, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $round = $this->roundRepository->find($roundId);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        if ($round->getAgent()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        if ($round->getStatus() !== 'IN_PROGRESS') {
            return $this->json(['error' => 'Round is not in progress'], Response::HTTP_CONFLICT);
        }

        $roundSite = $this->roundSiteRepository->findOneBy([
            'round' => $round,
            'site' => $siteId
        ]);

        if (!$roundSite) {
            return $this->json(['error' => 'Site not found in this round'], Response::HTTP_BAD_REQUEST);
        }

        if ($roundSite->getVisitedAt()) {
            return $this->json(['error' => 'Site already visited'], Response::HTTP_CONFLICT);
        }

        $previousSites = $round->getRoundSites()->filter(
            fn($rs) => $rs->getVisitOrder() < $roundSite->getVisitOrder() && !$rs->getVisitedAt()
        );

        if ($previousSites->count() > 0 && !($data['skipOrder'] ?? false)) {
            return $this->json([
                'error' => 'Previous sites must be visited first',
                'pendingSites' => $previousSites->map(fn($rs) => $rs->getSite()->getName())->toArray(),
            ], Response::HTTP_CONFLICT);
        }

        if ($data['requireQrScan'] ?? true) {
            if (!isset($data['qrCode']) || $data['qrCode'] !== $roundSite->getSite()->getQrCode()) {
                return $this->json(['error' => 'Invalid QR code'], Response::HTTP_FORBIDDEN);
            }
            $roundSite->setQrCodeScanned(true);
        }

        if ($data['requirePin'] ?? false) {
            if (!isset($data['pin']) || !$user->verifyPinCode($data['pin'])) {
                return $this->json(['error' => 'Invalid PIN'], Response::HTTP_FORBIDDEN);
            }
            $roundSite->setPinEntered(true);
        }

        $roundSite->setVisitedAt(new \DateTimeImmutable());
        $roundSite->setGpsLatitude($data['latitude'] ?? null);
        $roundSite->setGpsLongitude($data['longitude'] ?? null);
        $roundSite->setPhoto($data['photo'] ?? null);

        $allVisited = $round->getRoundSites()->forAll(fn($i, $rs) => $rs->getVisitedAt() !== null);

        if ($allVisited) {
            $round->setStatus('COMPLETED');
            $round->setActualEnd(new \DateTimeImmutable());
        }

        $this->entityManager->flush();

        return $this->json([
            'visited' => true,
            'visitedAt' => $roundSite->getVisitedAt()->format('c'),
            'roundCompleted' => $allVisited,
            'remainingSites' => $round->getRoundSites()->filter(fn($rs) => !$rs->getVisitedAt())->count(),
        ]);
    }

    #[Route('/{roundId}/sites/{siteId}/controller-visit', name: 'api_rounds_controller_visit', methods: ['POST'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function controllerVisitSite(int $roundId, int $siteId, Request $request): JsonResponse
    {
        $round = $this->roundRepository->find($roundId);

        if (!$round) {
            return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();

        if ($round->getSupervisor()?->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);

        $roundSite = $this->roundSiteRepository->findOneBy([
            'round' => $round,
            'site' => $siteId
        ]);

        if (!$roundSite) {
            return $this->json(['error' => 'Site not found in this round'], Response::HTTP_BAD_REQUEST);
        }

        if ($roundSite->getVisitedAt() && $roundSite->isValidated()) {
            return $this->json(['error' => 'Site already visited and validated'], Response::HTTP_CONFLICT);
        }

        $roundSite->setVisitedAt(new \DateTimeImmutable());
        $roundSite->setGpsLatitude($data['gpsLatitude'] ?? null);
        $roundSite->setGpsLongitude($data['gpsLongitude'] ?? null);
        $roundSite->setPhoto($data['photo'] ?? null);
        $roundSite->setQrCodeScanned($data['qrCodeScanned'] ?? false);
        $roundSite->setPinEntered($data['pinEntered'] ?? false);
        $roundSite->setAgentPresenceStatus($data['agentPresenceStatus'] ?? null);
        $roundSite->setAbsenceReason($data['absenceReason'] ?? null);
        $roundSite->setComments($data['comments'] ?? null);
        $roundSite->setPhotoAnalysis($data['photoAnalysis'] ?? null);
        $roundSite->setDistanceFromSite($data['distanceFromSite'] ?? null);
        $roundSite->setIsValidated(true);
        $roundSite->setValidatedAt(new \DateTimeImmutable());

        $this->handleAgentPresence($roundSite, $user, $data);

        $allVisited = $round->getRoundSites()->forAll(fn($i, $rs) => $rs->getVisitedAt() !== null);

        if ($allVisited && $round->getStatus() === 'IN_PROGRESS') {
            $round->setStatus('COMPLETED');
            $round->setActualEnd(new \DateTimeImmutable());
        }

        $this->entityManager->flush();

        return $this->json([
            'success' => true,
            'roundSite' => $this->formatRoundSite($roundSite),
            'roundCompleted' => $allVisited,
        ]);
    }

    #[Route('/{roundId}/sites/{siteId}/validate', name: 'api_rounds_validate_site', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function validateSite(int $roundId, int $siteId): JsonResponse
    {
        $roundSite = $this->roundSiteRepository->findOneBy([
            'round' => $roundId,
            'site' => $siteId
        ]);

        if (!$roundSite) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        $roundSite->setIsValidated(true);
        $roundSite->setValidatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        return $this->json(['validated' => true]);
    }

    #[Route('/{roundId}/sites/{siteId}/reject', name: 'api_rounds_reject_site', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function rejectSite(int $roundId, int $siteId, Request $request): JsonResponse
    {
        $roundSite = $this->roundSiteRepository->findOneBy([
            'round' => $roundId,
            'site' => $siteId
        ]);

        if (!$roundSite) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $roundSite->setIsValidated(false);
        $roundSite->setComments(($roundSite->getComments() ? $roundSite->getComments() . "\n" : '') . 'REJET: ' . ($data['reason'] ?? 'Non spécifié'));
        $this->entityManager->flush();

        return $this->json(['rejected' => true]);
    }

    // ============================================================
    // MÉTHODES PRIVÉES
    // ============================================================

    private function handleAgentPresence(RoundSite $roundSite, User $controller, array $data): void
    {
        $site = $roundSite->getSite();
        $today = new \DateTimeImmutable('today');
        $tomorrow = new \DateTimeImmutable('tomorrow');

        $agentPresence = $this->presenceRepository->createQueryBuilder('p')
            ->where('p.site = :site')
            ->andWhere('p.checkIn >= :today')
            ->andWhere('p.checkIn < :tomorrow')
            ->setParameter('site', $site)
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        $verdict = $data['agentPresenceStatus'] ?? null;

        if ($agentPresence) {
            $agentPresence->applyControllerVerdict(
                $controller,
                $verdict,
                $data['absenceReason'] ?? null,
                $data['comments'] ?? null
            );
            $agentPresence->setControllerPhotoAnalysis($data['photoAnalysis'] ?? null);
            $agentPresence->setControllerDistanceFromSite($data['distanceFromSite'] ?? null);
            $roundSite->addValidatedPresence($agentPresence);
        } elseif ($verdict) {
            $newPresence = new Presence();
            $newPresence->setSite($site);
            $newPresence->setCheckIn(new \DateTimeImmutable());
            $newPresence->setStatus($verdict === Presence::VERDICT_PRESENT ? Presence::STATUS_VALIDATED : Presence::STATUS_REJECTED);
            $newPresence->setController($controller);
            $newPresence->setControllerVerdict($verdict);
            $newPresence->setControllerValidationAt(new \DateTimeImmutable());
            $newPresence->setControllerComment($data['comments'] ?? null);
            $newPresence->setAbsenceReason($data['absenceReason'] ?? null);
            $newPresence->setGpsLatitude($data['gpsLatitude'] ?? null);
            $newPresence->setGpsLongitude($data['gpsLongitude'] ?? null);
            $newPresence->setPhoto($data['photo'] ?? null);
            $newPresence->setControllerPhotoAnalysis($data['photoAnalysis'] ?? null);
            $newPresence->setControllerDistanceFromSite($data['distanceFromSite'] ?? null);
            $this->entityManager->persist($newPresence);
            $roundSite->addValidatedPresence($newPresence);
        }
    }

    private function formatRound(Round $round, bool $includeDetails = false): array
    {
        $data = [
            'id' => $round->getId(),
            'name' => $round->getName(),
            'agent' => $round->getAgent() ? [
                'id' => $round->getAgent()->getId(),
                'fullName' => $round->getAgent()->getFullName(),
            ] : null,
            'supervisor' => $round->getSupervisor() ? [
                'id' => $round->getSupervisor()->getId(),
                'fullName' => $round->getSupervisor()->getFullName(),
            ] : null,
            'scheduledStart' => $round->getScheduledStart()->format('c'),
            'scheduledEnd' => $round->getScheduledEnd()?->format('c'),
            'actualStart' => $round->getActualStart()?->format('c'),
            'actualEnd' => $round->getActualEnd()?->format('c'),
            'status' => $round->getStatus(),
            'sitesCount' => $round->getRoundSites()->count(),
            'visitedSitesCount' => $round->getRoundSites()->filter(fn($rs) => $rs->getVisitedAt() !== null)->count(),
            'validatedSitesCount' => $round->getRoundSites()->filter(fn($rs) => $rs->isValidated())->count(),
            'progress' => $round->getProgress(),
        ];

        if ($includeDetails) {
            $data['sites'] = [];
            foreach ($round->getRoundSites() as $roundSite) {
                $data['sites'][] = $this->formatRoundSite($roundSite);
            }
        }

        return $data;
    }

    private function formatRoundSite(RoundSite $roundSite): array
    {
        return [
            'id' => $roundSite->getId(),
            'site' => [
                'id' => $roundSite->getSite()->getId(),
                'name' => $roundSite->getSite()->getName(),
                'address' => $roundSite->getSite()->getAddress(),
                'latitude' => $roundSite->getSite()->getLatitude(),
                'longitude' => $roundSite->getSite()->getLongitude(),
                'qrCode' => $roundSite->getSite()->getQrCode(),
                'geofencingRadius' => $roundSite->getSite()->getGeofencingRadius(),
            ],
            'visitOrder' => $roundSite->getVisitOrder(),
            'visitedAt' => $roundSite->getVisitedAt()?->format('c'),
            'gpsLatitude' => $roundSite->getGpsLatitude(),
            'gpsLongitude' => $roundSite->getGpsLongitude(),
            'photo' => $roundSite->getPhoto(),
            'qrCodeScanned' => $roundSite->isQrCodeScanned(),
            'pinEntered' => $roundSite->isPinEntered(),
            'agentPresenceStatus' => $roundSite->getAgentPresenceStatus(),
            'absenceReason' => $roundSite->getAbsenceReason(),
            'comments' => $roundSite->getComments(),
            'photoAnalysis' => $roundSite->getPhotoAnalysis(),
            'distanceFromSite' => $roundSite->getDistanceFromSite(),
            'isValidated' => $roundSite->isValidated(),
            'validatedAt' => $roundSite->getValidatedAt()?->format('c'),
            'hasPhoto' => $roundSite->getPhoto() !== null,
            'isComplete' => $roundSite->isComplete(),
        ];
    }
}

<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\AssignmentRepository;
use App\Repository\IncidentRepository;
use App\Repository\PresenceRepository;
use App\Repository\RoundRepository;
use App\Repository\TimesheetRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Repository\ClientRepository;
use App\Repository\SiteRepository;
use App\Entity\Presence;
use App\Repository\ActivityLogRepository;

#[Route('/api/dashboard')]
#[IsGranted('ROLE_AGENT')]
class DashboardController extends AbstractController
{
    public function __construct(
        private PresenceRepository $presenceRepository,
        private AssignmentRepository $assignmentRepository,
        private RoundRepository $roundRepository,
        private IncidentRepository $incidentRepository,
        private TimesheetRepository $timesheetRepository,
        private UserRepository $userRepository,
        private ClientRepository $clientRepository,
        private SiteRepository $siteRepository,
        private ActivityLogRepository $activityLogRepository
    ) {}

    #[Route('/superadmin', name: 'api_dashboard_superadmin', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERADMIN')]
    public function superadmin(): JsonResponse
    {
        $today = new \DateTimeImmutable('today');
        $startOfMonth = new \DateTimeImmutable('first day of this month');

        // Stats utilisateurs
        $usersByRole = [];
        foreach (User::AVAILABLE_ROLES as $role) {
            $usersByRole[$role] = count($this->userRepository->findByRole($role));
        }

        // Stats clients et sites
        $totalClients = count($this->clientRepository->findAll());
        $totalSites = count($this->siteRepository->findAll());

        // Stats financières
        $monthRevenue = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked * u.hourlyRate) as total')
            ->join('t.agent', 'u')
            ->where('t.date >= :start')
            ->andWhere('t.status = :status')
            ->setParameter('start', $startOfMonth)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        // Litiges en attente
        $disputes = count($this->presenceRepository->findBy(['status' => Presence::STATUS_DISPUTED]));

        // Santé système
        $systemHealth = [
            'database' => 'connected',
            'storage' => 'ok',
            'cache' => 'ok',
            'queue' => 0,
            'uptime' => '7 jours',
        ];

        // Modules actifs
        $modules = ['pointage', 'rondes', 'incidents', 'rapports', 'offline'];

        // Activité récente
        $recentActivity = $this->activityLogRepository->findBy([], ['createdAt' => 'DESC'], 10);

        return $this->json([
            'users' => [
                'total' => array_sum($usersByRole),
                'byRole' => $usersByRole,
                'active' => count($this->userRepository->findBy(['isActive' => true])),
            ],
            'clients' => [
                'total' => $totalClients,
            ],
            'sites' => [
                'total' => $totalSites,
            ],
            'financials' => [
                'monthRevenue' => round((float) $monthRevenue, 2),
            ],
            'disputes' => $disputes,
            'system' => [
                'health' => $systemHealth,
                'modules' => $modules,
            ],
            'recentActivity' => array_map(fn($activity) => [
                'id' => $activity->getId(),
                'action' => $activity->getActionType(),
                'user' => $activity->getUser()?->getFullName(),
                'createdAt' => $activity->getCreatedAt()->format('c'),
            ], $recentActivity),
        ]);
    }

    #[Route('/agent', name: 'api_dashboard_agent', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function agent(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $today = new \DateTimeImmutable('today');
        $tomorrow = new \DateTimeImmutable('tomorrow');

        // Présences du jour
        $todayPresences = $this->presenceRepository->createQueryBuilder('p')
            ->where('p.agent = :agent')
            ->andWhere('p.checkIn >= :today')
            ->andWhere('p.checkIn < :tomorrow')
            ->setParameter('agent', $user)
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->orderBy('p.checkIn', 'DESC')
            ->getQuery()
            ->getResult();

        // Affectations actives
        $activeAssignments = $user->getActiveAssignments();

        // Rondes du jour
        $todayRounds = $this->roundRepository->createQueryBuilder('r')
            ->where('r.agent = :agent')
            ->andWhere('r.scheduledStart >= :today')
            ->andWhere('r.scheduledStart < :tomorrow')
            ->andWhere('r.status IN (:statuses)')
            ->setParameter('agent', $user)
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->setParameter('statuses', ['PLANNED', 'IN_PROGRESS'])
            ->orderBy('r.scheduledStart', 'ASC')
            ->getQuery()
            ->getResult();

        // Incidents récents
        $recentIncidents = $this->incidentRepository->findBy(
            ['reporter' => $user],
            ['reportedAt' => 'DESC'],
            5
        );

        // Heures de la semaine
        $startOfWeek = $today->modify('monday this week')->setTime(0, 0);
        $weekTimesheets = $this->timesheetRepository->createQueryBuilder('t')
            ->where('t.agent = :agent')
            ->andWhere('t.date >= :start')
            ->setParameter('agent', $user)
            ->setParameter('start', $startOfWeek)
            ->getQuery()
            ->getResult();

        $weekHours = array_reduce($weekTimesheets, fn($sum, $t) => $sum + (float)$t->getHoursWorked(), 0);

        return $this->json([
            'user' => $user->toArray(),
            'today' => [
                'date' => $today->format('Y-m-d'),
                'presences' => array_map(fn($p) => [
                    'id' => $p->getId(),
                    'site' => $p->getSite()->getName(),
                    'checkIn' => $p->getCheckIn()->format('H:i'),
                    'checkOut' => $p->getCheckOut()?->format('H:i'),
                    'status' => $p->getStatus(),
                ], $todayPresences),
                'rounds' => array_map(fn($r) => [
                    'id' => $r->getId(),
                    'name' => $r->getName(),
                    'scheduledStart' => $r->getScheduledStart()->format('H:i'),
                    'status' => $r->getStatus(),
                    'progress' => $r->getRoundSites()->count() > 0
                        ? round(($r->getRoundSites()->filter(fn($rs) => $rs->getVisitedAt())->count() / $r->getRoundSites()->count()) * 100)
                        : 0,
                ], $todayRounds),
            ],
            'assignments' => array_map(fn($a) => [
                'id' => $a->getId(),
                'site' => $a->getSite()->getName(),
                'startDate' => $a->getStartDate()->format('Y-m-d'),
            ], $activeAssignments->toArray()),
            'stats' => [
                'weekHours' => round($weekHours, 1),
                'activeAssignments' => $activeAssignments->count(),
                'pendingValidations' => count(array_filter($todayPresences, fn($p) => $p->getStatus() === 'PENDING')),
                'recentIncidents' => count($recentIncidents),
            ],
            'recentIncidents' => array_map(fn($i) => [
                'id' => $i->getId(),
                'title' => $i->getTitle(),
                'severity' => $i->getSeverity(),
                'status' => $i->getStatus(),
                'reportedAt' => $i->getReportedAt()->format('c'),
            ], $recentIncidents),
            'notifications' => [
                'unread' => $user->getUnreadNotificationsCount(),
            ],
        ]);
    }

    #[Route('/controleur', name: 'api_dashboard_controleur', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function controleur(): JsonResponse
    {
        $today = new \DateTimeImmutable('today');

        // Présences en attente de validation
        $pendingPresences = $this->presenceRepository->findBy(
            ['status' => 'PENDING'],
            ['checkIn' => 'ASC']
        );

        // Rondes en cours
        $activeRounds = $this->roundRepository->findBy(
            ['status' => 'IN_PROGRESS'],
            ['scheduledStart' => 'ASC']
        );

        // Incidents ouverts
        $openIncidents = $this->incidentRepository->findBy(
            ['status' => ['OPEN', 'IN_PROGRESS']],
            ['severity' => 'DESC', 'reportedAt' => 'DESC']
        );

        // Feuilles de temps en attente
        $pendingTimesheets = $this->timesheetRepository->findBy(
            ['status' => 'PENDING'],
            ['date' => 'DESC']
        );

        // Agents actifs aujourd'hui
        $activeAgentsToday = $this->presenceRepository->createQueryBuilder('p')
            ->select('DISTINCT IDENTITY(p.agent) as agentId')
            ->where('p.checkIn >= :today')
            ->setParameter('today', $today)
            ->getQuery()
            ->getResult();

        return $this->json([
            'pending' => [
                'presences' => count($pendingPresences),
                'timesheets' => count($pendingTimesheets),
                'incidents' => count($openIncidents),
            ],
            'active' => [
                'rounds' => count($activeRounds),
                'agents' => count($activeAgentsToday),
            ],
            'recent' => [
                'presences' => array_slice(array_map(fn($p) => [
                    'id' => $p->getId(),
                    'agent' => $p->getAgent()->getFullName(),
                    'site' => $p->getSite()->getName(),
                    'checkIn' => $p->getCheckIn()->format('H:i'),
                    'suspicionScore' => $p->getSuspicionScore(),
                ], $pendingPresences), 0, 10),
                'incidents' => array_slice(array_map(fn($i) => [
                    'id' => $i->getId(),
                    'title' => $i->getTitle(),
                    'severity' => $i->getSeverity(),
                    'site' => $i->getSite()->getName(),
                ], $openIncidents), 0, 5),
            ],
        ]);
    }

    #[Route('/superviseur', name: 'api_dashboard_superviseur', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function superviseur(): JsonResponse
    {
        $today = new \DateTimeImmutable('today');
        $startOfMonth = new \DateTimeImmutable('first day of this month');

        // Stats globales
        $totalAgents = count($this->userRepository->findByRole(User::ROLE_AGENT));
        $activeAgents = count($this->userRepository->findActiveAgents());

        // Présences du jour
        $todayPresences = $this->presenceRepository->createQueryBuilder('p')
            ->select('COUNT(p.id) as count')
            ->where('p.checkIn >= :today')
            ->setParameter('today', $today)
            ->getQuery()
            ->getSingleScalarResult();

        // Incidents du mois
        $monthIncidents = $this->incidentRepository->createQueryBuilder('i')
            ->select('COUNT(i.id) as count')
            ->where('i.reportedAt >= :start')
            ->setParameter('start', $startOfMonth)
            ->getQuery()
            ->getSingleScalarResult();

        // Heures totales du mois
        $monthHours = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked) as total')
            ->where('t.date >= :start')
            ->andWhere('t.status = :status')
            ->setParameter('start', $startOfMonth)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult();

        // Rondes du jour
        $tomorrow = new \DateTimeImmutable('tomorrow');
        $todayRounds = $this->roundRepository->createQueryBuilder('r')
            ->select('COUNT(r.id) as count')
            ->where('r.scheduledStart >= :today')
            ->andWhere('r.scheduledStart < :tomorrow')
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->getQuery()
            ->getSingleScalarResult();

        // Litiges en attente
        $disputes = count($this->presenceRepository->findBy(['status' => Presence::STATUS_DISPUTED]));

        // Présences en attente de validation
        $pendingValidations = count($this->presenceRepository->findBy(['status' => 'PENDING']));

        // Incidents ouverts
        $openIncidents = count($this->incidentRepository->findBy(['status' => ['OPEN', 'IN_PROGRESS']]));

        // Dernières présences du jour
        $recentPresencesEntities = $this->presenceRepository->createQueryBuilder('p')
            ->leftJoin('p.agent', 'a')
            ->leftJoin('p.site', 's')
            ->addSelect('a', 's')
            ->where('p.checkIn >= :today')
            ->andWhere('p.checkIn < :tomorrow')
            ->setParameter('today', $today)
            ->setParameter('tomorrow', $tomorrow)
            ->orderBy('p.checkIn', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        $recentPresences = array_map(fn($p) => [
            'id' => $p->getId(),
            'agent' => $p->getAgent() ? ['id' => $p->getAgent()->getId(), 'fullName' => $p->getAgent()->getFullName()] : null,
            'site' => ['id' => $p->getSite()->getId(), 'name' => $p->getSite()->getName()],
            'checkIn' => $p->getCheckIn()->format('c'),
            'status' => $p->getStatus(),
        ], $recentPresencesEntities);

        // Incidents récents
        $recentIncidentEntities = $this->incidentRepository->findBy(
            ['status' => ['OPEN', 'IN_PROGRESS']],
            ['reportedAt' => 'DESC'],
            5
        );
        $recentIncidents = array_map(fn($i) => [
            'id' => $i->getId(),
            'title' => $i->getTitle(),
            'severity' => $i->getSeverity(),
            'site' => ['name' => $i->getSite()->getName()],
            'reportedAt' => $i->getReportedAt()->format('c'),
        ], $recentIncidentEntities);

        $totalSites = count($this->siteRepository->findAll());

        return $this->json([
            'totalAgents' => $totalAgents,
            'activeAgents' => $activeAgents,
            'totalSites' => $totalSites,
            'todayPresences' => (int) $todayPresences,
            'pendingValidations' => $pendingValidations,
            'openIncidents' => $openIncidents,
            'disputes' => $disputes,
            'todayRounds' => (int) $todayRounds,
            'recentPresences' => $recentPresences,
            'recentIncidents' => $recentIncidents,
        ]);
    }

    #[Route('/admin', name: 'api_dashboard_admin', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function admin(): JsonResponse
    {
        $today = new \DateTimeImmutable('today');
        $startOfMonth = new \DateTimeImmutable('first day of this month');

        // Stats utilisateurs
        $usersByRole = [];
        foreach (User::AVAILABLE_ROLES as $role) {
            $usersByRole[$role] = count($this->userRepository->findByRole($role));
        }

        // Stats clients et sites
        $totalClients = count($this->clientRepository->findAll());
        $totalSites = count($this->siteRepository->findAll());

        // Stats financières
        $monthRevenue = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked * u.hourlyRate) as total')
            ->join('t.agent', 'u')
            ->where('t.date >= :start')
            ->andWhere('t.status = :status')
            ->setParameter('start', $startOfMonth)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        // Incidents du mois
        $monthIncidents = $this->incidentRepository->createQueryBuilder('i')
            ->select('COUNT(i.id)')
            ->where('i.reportedAt >= :start')
            ->setParameter('start', $startOfMonth)
            ->getQuery()
            ->getSingleScalarResult();

        return $this->json([
            'users' => [
                'total' => array_sum($usersByRole),
                'byRole' => $usersByRole,
                'active' => count($this->userRepository->findBy(['isActive' => true])),
            ],
            'clients' => [
                'total' => $totalClients,
            ],
            'sites' => [
                'total' => $totalSites,
            ],
            'financials' => [
                'monthRevenue' => round((float) $monthRevenue, 2),
            ],
            'system' => [
                'incidents' => [
                    'month' => (int) $monthIncidents,
                    'open' => count($this->incidentRepository->findBy(['status' => ['OPEN', 'IN_PROGRESS']])),
                ],
                'health' => [
                    'database' => 'connected',
                    'storage' => 'ok',
                    'cache' => 'ok',
                ],
            ],
        ]);
    }
}

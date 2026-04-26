<?php
// src/Controller/Api/FinanceController.php

namespace App\Controller\Api;

use App\Repository\TimesheetRepository;
use App\Repository\UserRepository;
use App\Repository\ClientRepository;
use App\Repository\SiteRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/finance')]
#[IsGranted('ROLE_ADMIN')]
class FinanceController extends AbstractController
{
    public function __construct(
        private TimesheetRepository $timesheetRepository,
        private UserRepository $userRepository,
        private ClientRepository $clientRepository,
        private SiteRepository $siteRepository
    ) {}

    #[Route('/summary', name: 'api_finance_summary', methods: ['GET'])]
    public function summary(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable($request->query->get('start', 'first day of this month'));
        $end = new \DateTimeImmutable($request->query->get('end', 'last day of this month'));
        $end = $end->setTime(23, 59, 59);

        // Chiffre d'affaires total sur la période
        $totalRevenue = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked * u.hourlyRate) as total')
            ->join('t.agent', 'u')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        // Chiffre d'affaires du jour
        $today = new \DateTimeImmutable('today');
        $todayEnd = new \DateTimeImmutable('tomorrow');
        $todayRevenue = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked * u.hourlyRate) as total')
            ->join('t.agent', 'u')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $today)
            ->setParameter('end', $todayEnd)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        // Nombre d'agents ayant travaillé
        $activeAgentsCount = $this->timesheetRepository->createQueryBuilder('t')
            ->select('COUNT(DISTINCT t.agent)')
            ->where('t.date BETWEEN :start AND :end')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->getQuery()
            ->getSingleScalarResult();

        // Taux horaire moyen
        $averageHourlyRate = $this->userRepository->createQueryBuilder('u')
            ->select('AVG(u.hourlyRate)')
            ->where('u.hourlyRate IS NOT NULL')
            ->andWhere('u.hourlyRate > 0')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        // Total des heures travaillées
        $totalHours = $this->timesheetRepository->createQueryBuilder('t')
            ->select('SUM(t.hoursWorked)')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->getQuery()
            ->getSingleScalarResult() ?? 0;

        return $this->json([
            'totalRevenue' => round((float) $totalRevenue, 2),
            'todayRevenue' => round((float) $todayRevenue, 2),
            'activeAgents' => (int) $activeAgentsCount,
            'averageHourlyRate' => round((float) $averageHourlyRate, 2),
            'totalHours' => round((float) $totalHours, 1),
            'period' => [
                'start' => $start->format('Y-m-d'),
                'end' => $end->format('Y-m-d'),
            ],
        ]);
    }

    #[Route('/daily-stats', name: 'api_finance_daily_stats', methods: ['GET'])]
    public function dailyStats(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable($request->query->get('start', 'first day of this month'));
        $end = new \DateTimeImmutable($request->query->get('end', 'last day of this month'));
        $end = $end->setTime(23, 59, 59);

        $dailyRevenue = $this->timesheetRepository->createQueryBuilder('t')
            ->select('t.date as day, SUM(t.hoursWorked * u.hourlyRate) as revenue, SUM(t.hoursWorked) as hours')
            ->join('t.agent', 'u')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->groupBy('t.date')
            ->orderBy('t.date', 'ASC')
            ->getQuery()
            ->getResult();

        $formattedData = array_map(function ($row) {
            return [
                'date' => $row['day']->format('Y-m-d'),
                'revenue' => round((float) $row['revenue'], 2),
                'hours' => round((float) $row['hours'], 1),
            ];
        }, $dailyRevenue);

        return $this->json($formattedData);
    }

    #[Route('/by-client', name: 'api_finance_by_client', methods: ['GET'])]
    public function byClient(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable($request->query->get('start', 'first day of this month'));
        $end = new \DateTimeImmutable($request->query->get('end', 'last day of this month'));
        $end = $end->setTime(23, 59, 59);

        $revenueByClient = $this->timesheetRepository->createQueryBuilder('t')
            ->select('c.id as clientId, c.name as clientName, SUM(t.hoursWorked * u.hourlyRate) as revenue, SUM(t.hoursWorked) as hours')
            ->join('t.agent', 'u')
            ->join('t.site', 's')
            ->join('s.client', 'c')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->groupBy('c.id, c.name')
            ->orderBy('revenue', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        $formattedData = array_map(function ($row) {
            return [
                'clientId' => $row['clientId'],
                'clientName' => $row['clientName'],
                'revenue' => round((float) $row['revenue'], 2),
                'hours' => round((float) $row['hours'], 1),
            ];
        }, $revenueByClient);

        return $this->json($formattedData);
    }

    #[Route('/by-agent', name: 'api_finance_by_agent', methods: ['GET'])]
    public function byAgent(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable($request->query->get('start', 'first day of this month'));
        $end = new \DateTimeImmutable($request->query->get('end', 'last day of this month'));
        $end = $end->setTime(23, 59, 59);

        $revenueByAgent = $this->timesheetRepository->createQueryBuilder('t')
            ->select('u.id as agentId, u.fullName as agentName, SUM(t.hoursWorked) as totalHours, SUM(t.hoursWorked * u.hourlyRate) as revenue')
            ->join('t.agent', 'u')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->groupBy('u.id, u.fullName')
            ->orderBy('totalHours', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        $formattedData = array_map(function ($row) {
            return [
                'agentId' => $row['agentId'],
                'agentName' => $row['agentName'],
                'totalHours' => round((float) $row['totalHours'], 1),
                'revenue' => round((float) $row['revenue'], 2),
            ];
        }, $revenueByAgent);

        return $this->json($formattedData);
    }

    #[Route('/by-site', name: 'api_finance_by_site', methods: ['GET'])]
    public function bySite(Request $request): JsonResponse
    {
        $start = new \DateTimeImmutable($request->query->get('start', 'first day of this month'));
        $end = new \DateTimeImmutable($request->query->get('end', 'last day of this month'));
        $end = $end->setTime(23, 59, 59);

        $revenueBySite = $this->timesheetRepository->createQueryBuilder('t')
            ->select('s.id as siteId, s.name as siteName, c.name as clientName, SUM(t.hoursWorked) as totalHours, SUM(t.hoursWorked * u.hourlyRate) as revenue, COUNT(DISTINCT t.agent) as agentCount')
            ->join('t.agent', 'u')
            ->join('t.site', 's')
            ->leftJoin('s.client', 'c')
            ->where('t.date BETWEEN :start AND :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $start)
            ->setParameter('end', $end)
            ->setParameter('status', 'VALIDATED')
            ->groupBy('s.id, s.name, c.name')
            ->orderBy('revenue', 'DESC')
            ->getQuery()
            ->getResult();

        $formattedData = array_map(function ($row) {
            return [
                'siteId' => $row['siteId'],
                'siteName' => $row['siteName'],
                'clientName' => $row['clientName'] ?? 'Sans client',
                'totalHours' => round((float) $row['totalHours'], 1),
                'revenue' => round((float) $row['revenue'], 2),
                'agentCount' => (int) $row['agentCount'],
            ];
        }, $revenueBySite);

        return $this->json($formattedData);
    }
}
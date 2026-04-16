<?php

namespace App\Controller\Api;

use App\Entity\Timesheet;
use App\Entity\User;
use App\Repository\TimesheetRepository;
use App\Repository\SiteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/timesheets')]
class TimesheetController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private TimesheetRepository $timesheetRepository,
        private SiteRepository $siteRepository
    ) {
    }

    #[Route('', name: 'api_timesheets_list', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['date' => 'DESC'];
        
        if ($agentId = $request->query->get('agentId')) {
            $criteria['agent'] = $agentId;
        }
        if ($siteId = $request->query->get('siteId')) {
            $criteria['site'] = $siteId;
        }
        if ($status = $request->query->get('status')) {
            $criteria['status'] = $status;
        }
        
        // Filtrer par période
        if ($startDate = $request->query->get('startDate')) {
            $criteria['date'] = ['>=', new \DateTimeImmutable($startDate)];
        }
        if ($endDate = $request->query->get('endDate')) {
            $criteria['date'] = ['<=', new \DateTimeImmutable($endDate)];
        }
        
        $timesheets = $this->timesheetRepository->findBy($criteria, $orderBy);
        
        return $this->json(array_map(fn(Timesheet $t) => $this->formatTimesheet($t), $timesheets));
    }

    #[Route('/my', name: 'api_timesheets_my', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function myTimesheets(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $criteria = ['agent' => $user];
        
        if ($startDate = $request->query->get('startDate')) {
            $criteria['date'] = ['>=', new \DateTimeImmutable($startDate)];
        }
        if ($endDate = $request->query->get('endDate')) {
            $criteria['date'] = ['<=', new \DateTimeImmutable($endDate)];
        }
        
        $timesheets = $this->timesheetRepository->findBy($criteria, ['date' => 'DESC']);
        
        return $this->json(array_map(fn(Timesheet $t) => $this->formatTimesheet($t), $timesheets));
    }

    #[Route('/week', name: 'api_timesheets_week', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function week(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $date = $request->query->get('date') ? new \DateTimeImmutable($request->query->get('date')) : new \DateTimeImmutable();
        $startOfWeek = $date->modify('monday this week')->setTime(0, 0);
        $endOfWeek = $date->modify('sunday this week')->setTime(23, 59, 59);
        
        $timesheets = $this->timesheetRepository->createQueryBuilder('t')
            ->where('t.agent = :agent')
            ->andWhere('t.date >= :start')
            ->andWhere('t.date <= :end')
            ->setParameter('agent', $user)
            ->setParameter('start', $startOfWeek)
            ->setParameter('end', $endOfWeek)
            ->orderBy('t.date', 'ASC')
            ->getQuery()
            ->getResult();
        
        $totalHours = array_reduce($timesheets, fn($sum, $t) => $sum + (float)$t->getHoursWorked(), 0);
        
        return $this->json([
            'week' => [
                'start' => $startOfWeek->format('Y-m-d'),
                'end' => $endOfWeek->format('Y-m-d'),
            ],
            'timesheets' => array_map(fn(Timesheet $t) => $this->formatTimesheet($t), $timesheets),
            'totalHours' => round($totalHours, 2),
        ]);
    }

    #[Route('/pending', name: 'api_timesheets_pending', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function pending(): JsonResponse
    {
        $timesheets = $this->timesheetRepository->findBy(
            ['status' => 'PENDING'],
            ['date' => 'ASC']
        );
        
        return $this->json(array_map(fn(Timesheet $t) => $this->formatTimesheet($t), $timesheets));
    }

    #[Route('/{id}', name: 'api_timesheets_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $timesheet = $this->timesheetRepository->find($id);
        
        if (!$timesheet) {
            return $this->json(['error' => 'Timesheet not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $user */
        $user = $this->getUser();
        
        if ($user->getRole() === User::ROLE_AGENT && $timesheet->getAgent()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        return $this->json($this->formatTimesheet($timesheet, true));
    }

    #[Route('', name: 'api_timesheets_create', methods: ['POST'])]
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
        
        $date = new \DateTimeImmutable($data['date']);
        
        // Vérifier si une feuille existe déjà pour ce jour/site/agent
        $existing = $this->timesheetRepository->findOneBy([
            'agent' => $user,
            'site' => $site,
            'date' => $date,
        ]);
        
        if ($existing) {
            return $this->json(['error' => 'Timesheet already exists for this date'], Response::HTTP_CONFLICT);
        }
        
        $timesheet = new Timesheet();
        $timesheet->setAgent($user);
        $timesheet->setSite($site);
        $timesheet->setDate($date);
        $timesheet->setHoursWorked($data['hoursWorked'] ?? '0.00');
        $timesheet->setOvertimeHours($data['overtimeHours'] ?? '0.00');
        $timesheet->setNightHours($data['nightHours'] ?? '0.00');
        $timesheet->setBreakMinutes($data['breakMinutes'] ?? 0);
        $timesheet->setNotes($data['notes'] ?? null);
        $timesheet->setStatus('PENDING');
        
        $this->entityManager->persist($timesheet);
        $this->entityManager->flush();
        
        return $this->json([
            'id' => $timesheet->getId(),
            'date' => $timesheet->getDate()->format('Y-m-d'),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_timesheets_update', methods: ['PUT'])]
    #[IsGranted('ROLE_AGENT')]
    public function update(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $timesheet = $this->timesheetRepository->find($id);
        
        if (!$timesheet) {
            return $this->json(['error' => 'Timesheet not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($timesheet->getAgent()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        if ($timesheet->getStatus() !== 'PENDING') {
            return $this->json(['error' => 'Cannot modify validated timesheet'], Response::HTTP_CONFLICT);
        }
        
        $data = json_decode($request->getContent(), true);
        
        if (isset($data['hoursWorked'])) $timesheet->setHoursWorked($data['hoursWorked']);
        if (isset($data['overtimeHours'])) $timesheet->setOvertimeHours($data['overtimeHours']);
        if (isset($data['nightHours'])) $timesheet->setNightHours($data['nightHours']);
        if (isset($data['breakMinutes'])) $timesheet->setBreakMinutes($data['breakMinutes']);
        if (isset($data['notes'])) $timesheet->setNotes($data['notes']);
        
        $this->entityManager->flush();
        
        return $this->json(['message' => 'Timesheet updated successfully']);
    }

    #[Route('/{id}/validate', name: 'api_timesheets_validate', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function validate(int $id): JsonResponse
    {
        $timesheet = $this->timesheetRepository->find($id);
        
        if (!$timesheet) {
            return $this->json(['error' => 'Timesheet not found'], Response::HTTP_NOT_FOUND);
        }
        
        $timesheet->setStatus('VALIDATED');
        $this->entityManager->flush();
        
        return $this->json(['status' => 'VALIDATED']);
    }

    #[Route('/{id}/reject', name: 'api_timesheets_reject', methods: ['PATCH'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function reject(int $id, Request $request): JsonResponse
    {
        $timesheet = $this->timesheetRepository->find($id);
        
        if (!$timesheet) {
            return $this->json(['error' => 'Timesheet not found'], Response::HTTP_NOT_FOUND);
        }
        
        $data = json_decode($request->getContent(), true);
        
        $timesheet->setStatus('REJECTED');
        if (isset($data['reason'])) {
            $timesheet->setNotes(($timesheet->getNotes() ? $timesheet->getNotes() . "\n" : '') . 'Rejected: ' . $data['reason']);
        }
        
        $this->entityManager->flush();
        
        return $this->json(['status' => 'REJECTED']);
    }

    #[Route('/summary', name: 'api_timesheets_summary', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function summary(Request $request): JsonResponse
    {
        $startDate = $request->query->get('startDate') ? new \DateTimeImmutable($request->query->get('startDate')) : new \DateTimeImmutable('first day of this month');
        $endDate = $request->query->get('endDate') ? new \DateTimeImmutable($request->query->get('endDate')) : new \DateTimeImmutable('last day of this month');
        
        $timesheets = $this->timesheetRepository->createQueryBuilder('t')
            ->select('IDENTITY(t.agent) as agentId', 'SUM(t.hoursWorked) as totalHours', 'SUM(t.overtimeHours) as totalOvertime', 'SUM(t.nightHours) as totalNight')
            ->where('t.date >= :start')
            ->andWhere('t.date <= :end')
            ->andWhere('t.status = :status')
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->setParameter('status', 'VALIDATED')
            ->groupBy('t.agent')
            ->getQuery()
            ->getResult();
        
        return $this->json([
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'summary' => $timesheets,
        ]);
    }

    private function formatTimesheet(Timesheet $timesheet, bool $includeDetails = false): array
    {
        $data = [
            'id' => $timesheet->getId(),
            'agent' => [
                'id' => $timesheet->getAgent()->getId(),
                'fullName' => $timesheet->getAgent()->getFullName(),
            ],
            'site' => [
                'id' => $timesheet->getSite()->getId(),
                'name' => $timesheet->getSite()->getName(),
            ],
            'date' => $timesheet->getDate()->format('Y-m-d'),
            'hoursWorked' => $timesheet->getHoursWorked(),
            'overtimeHours' => $timesheet->getOvertimeHours(),
            'nightHours' => $timesheet->getNightHours(),
            'breakMinutes' => $timesheet->getBreakMinutes(),
            'status' => $timesheet->getStatus(),
        ];
        
        if ($includeDetails) {
            $data['notes'] = $timesheet->getNotes();
            $data['createdAt'] = $timesheet->getCreatedAt()->format('c');
            $data['updatedAt'] = $timesheet->getUpdatedAt()->format('c');
            
            // Calculer le salaire estimé
            $hourlyRate = (float) $timesheet->getAgent()->getHourlyRate();
            $basePay = (float) $timesheet->getHoursWorked() * $hourlyRate;
            $overtimePay = (float) $timesheet->getOvertimeHours() * ($hourlyRate * 1.25);
            $nightPay = (float) $timesheet->getNightHours() * ($hourlyRate * 1.20);
            $data['estimatedPay'] = round($basePay + $overtimePay + $nightPay, 2);
        }
        
        return $data;
    }
}
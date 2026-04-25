<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\PresenceRepository;
use App\Repository\SiteRepository;
use App\Repository\AssignmentRepository;
use App\Repository\RoundRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Dompdf\Dompdf;
use Dompdf\Options;

#[Route('/api/reports')]
#[IsGranted('ROLE_CONTROLEUR')]
class ReportController extends AbstractController
{
    public function __construct(
        private PresenceRepository $presenceRepository,
        private SiteRepository $siteRepository,
        private AssignmentRepository $assignmentRepository,
        private RoundRepository $roundRepository
    ) {}

    /**
     * Récupère les sites visités par le contrôleur (via ses rondes)
     */
    #[Route('/my-sites', name: 'api_reports_my_sites', methods: ['GET'])]
    public function getMySites(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Récupérer les sites des rondes où le contrôleur est supervisor
        $rounds = $this->roundRepository->findBy(['supervisor' => $user]);

        $sites = [];
        foreach ($rounds as $round) {
            foreach ($round->getRoundSites() as $roundSite) {
                $site = $roundSite->getSite();
                $sites[$site->getId()] = [
                    'id' => $site->getId(),
                    'name' => $site->getName(),
                    'address' => $site->getAddress(),
                ];
            }
        }

        return $this->json(array_values($sites));
    }

    /**
     * Récupère les agents assignés aux sites du contrôleur
     */
    #[Route('/my-agents', name: 'api_reports_my_agents', methods: ['GET'])]
    public function getMyAgents(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        // Récupérer les sites visités par le contrôleur
        $siteIds = [];
        $rounds = $this->roundRepository->findBy(['supervisor' => $user]);
        foreach ($rounds as $round) {
            foreach ($round->getRoundSites() as $roundSite) {
                $siteIds[] = $roundSite->getSite()->getId();
            }
        }
        $siteIds = array_unique($siteIds);

        // Récupérer les agents assignés à ces sites
        $agents = [];
        $assignments = $this->assignmentRepository->findBy(['site' => $siteIds]);
        foreach ($assignments as $assignment) {
            $agent = $assignment->getAgent();
            if ($agent) {
                $agents[$agent->getId()] = [
                    'id' => $agent->getId(),
                    'name' => $agent->getFullName(),
                ];
            }
        }

        return $this->json(array_values($agents));
    }

    /**
     * Résumé statistique
     */
    #[Route('/summary', name: 'api_reports_summary', methods: ['GET'])]
    public function getSummary(Request $request): JsonResponse
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate') . ' 00:00:00');
        $endDate   = new \DateTimeImmutable($request->query->get('endDate')   . ' 23:59:59');
        /** @var User $user */
        $user = $this->getUser();

        // Récupérer les données
        $sites = $this->getControllerSites($user);
        $siteIds = array_column($sites, 'id');

        $agents = $this->getControllerAgents($user);

        // Compter les présences
        $presences = $this->presenceRepository->createQueryBuilder('p')
            ->where('p.site IN (:sites)')
            ->andWhere('p.checkIn >= :start')
            ->andWhere('p.checkIn <= :end')
            ->setParameter('sites', $siteIds)
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->getQuery()
            ->getResult();

        $totalPresences = count($presences);
        $totalAbsences = 0; // À calculer selon la logique métier

        // Calculer le taux de présence
        $totalDays = $startDate->diff($endDate)->days + 1;
        $maxPossible = count($agents) * $totalDays;
        $presenceRate = $maxPossible > 0 ? ($totalPresences / $maxPossible) * 100 : 0;

        return $this->json([
            'period' => [
                'type' => 'custom',
                'startDate' => $startDate->format('Y-m-d'),
                'endDate' => $endDate->format('Y-m-d'),
            ],
            'totalSites' => count($sites),
            'totalAgents' => count($agents),
            'totalPresences' => $totalPresences,
            'totalAbsences' => $totalAbsences,
            'totalUnknown' => $maxPossible - $totalPresences - $totalAbsences,
            'presenceRate' => round($presenceRate, 1),
            'generatedAt' => (new \DateTimeImmutable())->format('c'),
        ]);
    }

    /**
     * Tableau croisé
     */
    #[Route('/cross-table', name: 'api_reports_cross_table', methods: ['GET'])]
    public function getCrossTable(Request $request): JsonResponse
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate') . ' 00:00:00');
        $endDate   = new \DateTimeImmutable($request->query->get('endDate')   . ' 23:59:59');
        /** @var User $user */
        $user = $this->getUser();

        $sites  = $this->getControllerSites($user);
        $agents = $this->getControllerAgents($user);

        // Générer la liste des dates
        $dates = [];
        $current = $startDate;
        while ($current <= $endDate) {
            $dates[] = $current->format('Y-m-d');
            $current = $current->modify('+1 day');
        }

        $siteIds  = array_column($sites,  'id');
        $agentIds = array_column($agents, 'id');

        // Charger toutes les présences de la période en une seule requête
        $presences = [];
        if (!empty($siteIds) && !empty($agentIds)) {
            $results = $this->presenceRepository->createQueryBuilder('p')
                ->where('p.site IN (:sites)')
                ->andWhere('p.agent IN (:agents)')
                ->andWhere('p.checkIn >= :start')
                ->andWhere('p.checkIn <= :end')
                ->setParameter('sites',  $siteIds)
                ->setParameter('agents', $agentIds)
                ->setParameter('start',  $startDate)
                ->setParameter('end',    $endDate)
                ->getQuery()
                ->getResult();

            // Indexer par agentId-siteId-date pour lookup O(1)
            foreach ($results as $p) {
                $key = $p->getAgent()->getId() . '-' . $p->getSite()->getId() . '-' . $p->getCheckIn()->format('Y-m-d');
                // Si plusieurs entrées le même jour, garder la plus récente (dernière)
                $presences[$key] = $p;
            }
        }

        // Construire la matrice
        $matrix = [];
        foreach ($sites as $site) {
            foreach ($agents as $agent) {
                $row = [
                    'agentId'      => $agent['id'],
                    'agentName'    => $agent['name'],
                    'siteId'       => $site['id'],
                    'siteName'     => $site['name'],
                    'days'         => [],
                    'totalPresent' => 0,
                    'totalAbsent'  => 0,
                    'totalUnknown' => 0,
                ];

                foreach ($dates as $date) {
                    $key     = $agent['id'] . '-' . $site['id'] . '-' . $date;
                    $presence = $presences[$key] ?? null;

                    if ($presence === null) {
                        // Aucune présence enregistrée ce jour-là
                        $value = null;
                    } elseif ($presence->getControllerVerdict() === 'PRESENT') {
                        $value = 1;
                    } elseif ($presence->getControllerVerdict() === 'ABSENT') {
                        $value = 0;
                    } else {
                        // Présence agent enregistrée mais pas encore visitée par le contrôleur
                        $value = 1;
                    }

                    $row['days'][$date] = $value;

                    if ($value === 1)      $row['totalPresent']++;
                    elseif ($value === 0)  $row['totalAbsent']++;
                    else                   $row['totalUnknown']++;
                }

                // N'inclure la ligne que si au moins une entrée existe (évite le bruit)
                if ($row['totalPresent'] + $row['totalAbsent'] > 0 || !empty(array_filter($row['days'], fn($v) => $v !== null))) {
                    $matrix[] = $row;
                }
            }
        }

        return $this->json([
            'summary' => [],
            'sites'   => $sites,
            'agents'  => $agents,
            'matrix'  => $matrix,
            'dates'   => $dates,
        ]);
    }

    /**
     * Statistiques quotidiennes (pour graphiques)
     */
    #[Route('/daily-stats', name: 'api_reports_daily_stats', methods: ['GET'])]
    public function getDailyStats(Request $request): JsonResponse
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate') . ' 00:00:00');
        $endDate   = new \DateTimeImmutable($request->query->get('endDate')   . ' 23:59:59');
        /** @var User $user */
        $user = $this->getUser();

        $siteIds  = array_column($this->getControllerSites($user), 'id');
        $agentIds = array_column($this->getControllerAgents($user), 'id');

        if (empty($siteIds) || empty($agentIds)) {
            return $this->json([]);
        }

        $presences = $this->presenceRepository->createQueryBuilder('p')
            ->where('p.site IN (:sites)')
            ->andWhere('p.agent IN (:agents)')
            ->andWhere('p.checkIn >= :start')
            ->andWhere('p.checkIn <= :end')
            ->setParameter('sites',  $siteIds)
            ->setParameter('agents', $agentIds)
            ->setParameter('start',  $startDate)
            ->setParameter('end',    $endDate)
            ->getQuery()
            ->getResult();

        // Grouper par date
        $byDate = [];
        foreach ($presences as $p) {
            $date = $p->getCheckIn()->format('Y-m-d');
            if (!isset($byDate[$date])) {
                $byDate[$date] = ['date' => $date, 'present' => 0, 'absent' => 0, 'unknown' => 0];
            }
            $verdict = $p->getControllerVerdict();
            if ($verdict === 'PRESENT') {
                $byDate[$date]['present']++;
            } elseif ($verdict === 'ABSENT') {
                $byDate[$date]['absent']++;
            } else {
                $byDate[$date]['present']++; // Présence agent sans verdict = compté présent
            }
        }

        // Remplir les jours manquants avec 0
        $current = $startDate;
        while ($current <= $endDate) {
            $date = $current->format('Y-m-d');
            if (!isset($byDate[$date])) {
                $byDate[$date] = ['date' => $date, 'present' => 0, 'absent' => 0, 'unknown' => 0];
            }
            $current = $current->modify('+1 day');
        }

        ksort($byDate);
        return $this->json(array_values($byDate));
    }

    /**
     * Téléchargement du rapport
     */
    #[Route('/download', name: 'api_reports_download', methods: ['GET'])]
    public function downloadReport(Request $request): Response
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate') . ' 00:00:00');
        $endDate   = new \DateTimeImmutable($request->query->get('endDate')   . ' 23:59:59');
        $format    = $request->query->get('format', 'excel');
        /** @var User $user */
        $user = $this->getUser();

        $sites    = $this->getControllerSites($user);
        $agents   = $this->getControllerAgents($user);
        $matrix   = $this->buildMatrix($startDate, $endDate, $sites, $agents);
        $dates    = $matrix['dates'];
        $rows     = $matrix['rows'];

        if ($format === 'excel') {
            return $this->generateExcelReport($startDate, $endDate, $sites, $dates, $rows);
        } else {
            return $this->generatePdfReport($startDate, $endDate, $sites, $dates, $rows);
        }
    }

    /**
     * Construit la matrice agent×site×jours (logique partagée download/cross-table)
     */
    private function buildMatrix(\DateTimeImmutable $startDate, \DateTimeImmutable $endDate, array $sites, array $agents): array
    {
        $dates    = [];
        $current  = $startDate;
        while ($current <= $endDate) {
            $dates[] = $current->format('Y-m-d');
            $current = $current->modify('+1 day');
        }

        $siteIds  = array_column($sites,  'id');
        $agentIds = array_column($agents, 'id');
        $presenceIndex = [];

        if (!empty($siteIds) && !empty($agentIds)) {
            $results = $this->presenceRepository->createQueryBuilder('p')
                ->where('p.site IN (:sites)')
                ->andWhere('p.agent IN (:agents)')
                ->andWhere('p.checkIn >= :start')
                ->andWhere('p.checkIn <= :end')
                ->setParameter('sites',  $siteIds)
                ->setParameter('agents', $agentIds)
                ->setParameter('start',  $startDate)
                ->setParameter('end',    $endDate)
                ->getQuery()
                ->getResult();

            foreach ($results as $p) {
                $key = $p->getAgent()->getId() . '-' . $p->getSite()->getId() . '-' . $p->getCheckIn()->format('Y-m-d');
                $presenceIndex[$key] = $p;
            }
        }

        $rows = [];
        foreach ($sites as $site) {
            foreach ($agents as $agent) {
                $row = ['agentName' => $agent['name'], 'siteName' => $site['name'], 'days' => []];
                foreach ($dates as $date) {
                    $key = $agent['id'] . '-' . $site['id'] . '-' . $date;
                    $p   = $presenceIndex[$key] ?? null;
                    if ($p === null) {
                        $row['days'][$date] = null;
                    } elseif ($p->getControllerVerdict() === 'ABSENT') {
                        $row['days'][$date] = 0;
                    } else {
                        $row['days'][$date] = 1;
                    }
                }
                $present = count(array_filter($row['days'], fn($v) => $v === 1));
                $absent  = count(array_filter($row['days'], fn($v) => $v === 0));
                if ($present + $absent > 0) {
                    $row['totalPresent'] = $present;
                    $row['totalAbsent']  = $absent;
                    $rows[] = $row;
                }
            }
        }

        return ['dates' => $dates, 'rows' => $rows];
    }

    private function getControllerSites(User $user): array
    {
        // ✅ Superviseur et Admin voient tous les sites actifs
        if ($user->isSuperviseur() || $user->isAdmin()) {
            $allSites = $this->siteRepository->findBy(['isActive' => true]);
            return array_map(fn($site) => [
                'id' => $site->getId(),
                'name' => $site->getName(),
                'address' => $site->getAddress(),
            ], $allSites);
        }

        // Contrôleur simple : uniquement les sites de ses rondes
        $rounds = $this->roundRepository->findBy(['supervisor' => $user]);
        $sites = [];
        foreach ($rounds as $round) {
            foreach ($round->getRoundSites() as $roundSite) {
                $site = $roundSite->getSite();
                $sites[$site->getId()] = [
                    'id' => $site->getId(),
                    'name' => $site->getName(),
                    'address' => $site->getAddress(),
                ];
            }
        }
        return array_values($sites);
    }

    private function getControllerAgents(User $user): array
    {
        // ✅ Superviseur et Admin voient tous les agents actifs
        if ($user->isSuperviseur() || $user->isAdmin()) {
            $allAgents = $this->siteRepository->createQueryBuilder('s')
                ->select('DISTINCT a.id, a.firstName, a.lastName')
                ->join('s.assignments', 'ass')
                ->join('ass.agent', 'a')
                ->where('s.isActive = true')
                ->andWhere('a.isActive = true')
                ->andWhere('a.role = :role')
                ->setParameter('role', User::ROLE_AGENT)
                ->getQuery()
                ->getResult();

            return array_map(fn($agent) => [
                'id' => $agent['id'],
                'name' => ($agent['firstName'] ?? '') . ' ' . ($agent['lastName'] ?? ''),
            ], $allAgents);
        }

        // Contrôleur simple
        $siteIds = array_column($this->getControllerSites($user), 'id');
        $agents = [];
        $assignments = $this->assignmentRepository->findBy(['site' => $siteIds]);
        foreach ($assignments as $assignment) {
            $agent = $assignment->getAgent();
            if ($agent) {
                $agents[$agent->getId()] = [
                    'id' => $agent->getId(),
                    'name' => $agent->getFullName(),
                ];
            }
        }
        return array_values($agents);
    }


    private function generateExcelReport(\DateTimeImmutable $startDate, \DateTimeImmutable $endDate, array $sites, array $dates, array $rows): Response
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Présences');

        // Titre
        $sheet->setCellValue('A1', 'Rapport de présences — GuardTrack Pro');
        $sheet->setCellValue('A2', sprintf('Période : %s - %s', $startDate->format('d/m/Y'), $endDate->format('d/m/Y')));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        // En-têtes
        $sheet->setCellValue('A4', 'Agent');
        $sheet->setCellValue('B4', 'Site');
        $colIdx = 3; // C = col 3
        foreach ($dates as $date) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $sheet->setCellValue($colLetter . '4', (new \DateTimeImmutable($date))->format('d/m'));
            $colIdx++;
        }
        $totalCol   = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
        $tauxCol    = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
        $sheet->setCellValue($totalCol . '4', 'Présences');
        $sheet->setCellValue($tauxCol  . '4', 'Taux');

        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ];
        $sheet->getStyle('A4:' . $tauxCol . '4')->applyFromArray($headerStyle);

        // Données
        $rowNum = 5;
        foreach ($rows as $row) {
            $sheet->setCellValue('A' . $rowNum, $row['agentName']);
            $sheet->setCellValue('B' . $rowNum, $row['siteName']);
            $colIdx = 3;
            foreach ($dates as $date) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
                $val = $row['days'][$date] ?? null;
                $sheet->setCellValue($colLetter . $rowNum, $val === 1 ? 'P' : ($val === 0 ? 'A' : '-'));
                if ($val === 1) {
                    $sheet->getStyle($colLetter . $rowNum)->getFont()->getColor()->setRGB('166534');
                } elseif ($val === 0) {
                    $sheet->getStyle($colLetter . $rowNum)->getFont()->getColor()->setRGB('991B1B');
                }
                $sheet->getStyle($colLetter . $rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $colIdx++;
            }
            $totalColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $tauxColLetter  = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
            $evaluated = $row['totalPresent'] + $row['totalAbsent'];
            $taux      = $evaluated > 0 ? round($row['totalPresent'] / $evaluated * 100) . '%' : '-';
            $sheet->setCellValue($totalColLetter . $rowNum, $row['totalPresent'] . '/' . $evaluated);
            $sheet->setCellValue($tauxColLetter  . $rowNum, $taux);
            $sheet->getStyle($totalColLetter . $rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle($tauxColLetter  . $rowNum)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $rowNum++;
        }

        // Bordures sur tout le tableau
        $lastRow = $rowNum - 1;
        if ($lastRow >= 4) {
            $sheet->getStyle('A4:' . $tauxCol . $lastRow)->applyFromArray([
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
            ]);
        }

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(30);
        for ($i = 3; $i <= $colIdx + 1; $i++) {
            $sheet->getColumnDimensionByColumn($i)->setWidth(8);
        }

        $writer   = new Xlsx($spreadsheet);
        $filename = sprintf('rapport_%s_%s.xlsx', $startDate->format('Ymd'), $endDate->format('Ymd'));

        $response = new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        });
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    private function generatePdfReport(\DateTimeImmutable $startDate, \DateTimeImmutable $endDate, array $sites, array $dates, array $rows): Response
    {
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $dompdf = new Dompdf($options);

        $html  = '<style>';
        $html .= 'body { font-family: DejaVu Sans, sans-serif; font-size: 9px; }';
        $html .= 'h1 { font-size: 14px; margin-bottom: 4px; }';
        $html .= 'p  { margin: 2px 0 8px; font-size: 10px; color: #555; }';
        $html .= 'table { width: 100%; border-collapse: collapse; }';
        $html .= 'th { background-color: #4F46E5; color: white; padding: 4px; text-align: center; border: 1px solid #3730a3; }';
        $html .= 'th.left { text-align: left; }';
        $html .= 'td { padding: 3px 4px; border: 1px solid #d1d5db; text-align: center; }';
        $html .= 'td.left { text-align: left; }';
        $html .= 'tr:nth-child(even) td { background-color: #f9fafb; }';
        $html .= '.present { color: #166534; font-weight: bold; }';
        $html .= '.absent  { color: #991B1B; font-weight: bold; }';
        $html .= '.unknown { color: #9ca3af; }';
        $html .= '</style>';

        $html .= '<h1>Rapport de présences — GuardTrack Pro</h1>';
        $html .= '<p>Période : ' . $startDate->format('d/m/Y') . ' – ' . $endDate->format('d/m/Y') . '</p>';

        $html .= '<table><thead><tr>';
        $html .= '<th class="left">Agent</th><th class="left">Site</th>';
        foreach ($dates as $date) {
            $html .= '<th>' . (new \DateTimeImmutable($date))->format('d/m') . '</th>';
        }
        $html .= '<th>Présences</th><th>Taux</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($rows as $row) {
            $html .= '<tr>';
            $html .= '<td class="left">' . htmlspecialchars($row['agentName']) . '</td>';
            $html .= '<td class="left">' . htmlspecialchars($row['siteName'])  . '</td>';
            foreach ($dates as $date) {
                $val = $row['days'][$date] ?? null;
                if ($val === 1) {
                    $html .= '<td><span class="present">P</span></td>';
                } elseif ($val === 0) {
                    $html .= '<td><span class="absent">A</span></td>';
                } else {
                    $html .= '<td><span class="unknown">–</span></td>';
                }
            }
            $evaluated = $row['totalPresent'] + $row['totalAbsent'];
            $taux      = $evaluated > 0 ? round($row['totalPresent'] / $evaluated * 100) . '%' : '–';
            $html .= '<td>' . $row['totalPresent'] . '/' . $evaluated . '</td>';
            $html .= '<td>' . $taux . '</td>';
            $html .= '</tr>';
        }

        $html .= '</tbody></table>';

        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();

        $filename = sprintf('rapport_%s_%s.pdf', $startDate->format('Ymd'), $endDate->format('Ymd'));

        $response = new Response($dompdf->output());
        $response->headers->set('Content-Type', 'application/pdf');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');

        return $response;
    }
}

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
    ) {
    }

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
     * Statistiques quotidiennes
     */
    #[Route('/daily-stats', name: 'api_reports_daily_stats', methods: ['GET'])]
    public function getDailyStats(Request $request): JsonResponse
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate'));
        $endDate = new \DateTimeImmutable($request->query->get('endDate'));
        
        // À implémenter
        return $this->json([]);
    }

    /**
     * Téléchargement du rapport
     */
    #[Route('/download', name: 'api_reports_download', methods: ['GET'])]
    public function downloadReport(Request $request): Response
    {
        $startDate = new \DateTimeImmutable($request->query->get('startDate'));
        $endDate = new \DateTimeImmutable($request->query->get('endDate'));
        $format = $request->query->get('format', 'excel');
        /** @var User $user */
        $user = $this->getUser();
        
        $sites = $this->getControllerSites($user);
        $agents = $this->getControllerAgents($user);
        
        if ($format === 'excel') {
            return $this->generateExcelReport($startDate, $endDate, $sites, $agents);
        } else {
            return $this->generatePdfReport($startDate, $endDate, $sites, $agents);
        }
    }

    private function getControllerSites(User $user): array
    {
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

    private function generateExcelReport(\DateTimeImmutable $startDate, \DateTimeImmutable $endDate, array $sites, array $agents): Response
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Titre
        $sheet->setCellValue('A1', 'Rapport de présences');
        $sheet->setCellValue('A2', sprintf('Période : %s - %s', $startDate->format('d/m/Y'), $endDate->format('d/m/Y')));
        
        // En-têtes du tableau croisé
        $sheet->setCellValue('A4', 'Site / Agent');
        
        $col = 'B';
        $dates = [];
        $current = $startDate;
        while ($current <= $endDate) {
            $dates[] = $current;
            $sheet->setCellValue($col . '4', $current->format('d/m'));
            $col++;
            $current = $current->modify('+1 day');
        }
        $sheet->setCellValue($col . '4', 'Total');
        
        // Style des en-têtes
        $headerStyle = [
            'font' => ['bold' => true],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
            'font' => ['color' => ['rgb' => 'FFFFFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ];
        $sheet->getStyle('A4:' . $col . '4')->applyFromArray($headerStyle);
        
        // Données (à remplir avec les vraies données)
        $row = 5;
        foreach ($sites as $site) {
            foreach ($agents as $agent) {
                $sheet->setCellValue('A' . $row, $site['name'] . ' - ' . $agent['name']);
                $row++;
            }
        }
        
        // Ajuster les largeurs de colonnes
        $sheet->getColumnDimension('A')->setWidth(40);
        
        $writer = new Xlsx($spreadsheet);
        
        $filename = sprintf('rapport_%s_%s.xlsx', $startDate->format('Ymd'), $endDate->format('Ymd'));
        
        $response = new StreamedResponse(function() use ($writer) {
            $writer->save('php://output');
        });
        
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');
        
        return $response;
    }

    private function generatePdfReport(\DateTimeImmutable $startDate, \DateTimeImmutable $endDate, array $sites, array $agents): Response
    {
        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $dompdf = new Dompdf($options);
        
        // Construire le HTML
        $html = '<h1>Rapport de présences</h1>';
        $html .= '<p>Période : ' . $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y') . '</p>';
        $html .= '<table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">';
        $html .= '<thead><tr style="background-color:#4F46E5; color:white;">';
        $html .= '<th>Site / Agent</th>';
        
        $current = $startDate;
        while ($current <= $endDate) {
            $html .= '<th>' . $current->format('d/m') . '</th>';
            $current = $current->modify('+1 day');
        }
        $html .= '<th>Total</th>';
        $html .= '</tr></thead><tbody>';
        
        foreach ($sites as $site) {
            foreach ($agents as $agent) {
                $html .= '<tr>';
                $html .= '<td>' . $site['name'] . ' - ' . $agent['name'] . '</td>';
                // Données à remplir
                $html .= '</tr>';
            }
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
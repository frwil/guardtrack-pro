<?php

namespace App\Controller\Api\SuperAdmin;

use App\Entity\ActivityLog;
use App\Repository\ActivityLogRepository;
use Dompdf\Dompdf;
use Dompdf\Options;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/superadmin')]
#[IsGranted('ROLE_SUPERADMIN')]
class AuditController extends AbstractController
{
    public function __construct(
        private ActivityLogRepository $activityLogRepository
    ) {
    }

    #[Route('/audit', name: 'api_superadmin_audit', methods: ['GET'])]
    public function getAuditLogs(Request $request): JsonResponse
    {
        $limit = $request->query->get('limit', 1000);
        
        $logs = $this->activityLogRepository->findBy(
            [],
            ['createdAt' => 'DESC'],
            $limit
        );
        
        return $this->json([
            'logs' => array_map(fn(ActivityLog $log) => [
                'id' => $log->getId(),
                'actionType' => $log->getActionType(),
                'entityType' => $log->getEntityType(),
                'entityId' => $log->getEntityId(),
                'user' => $log->getUser() ? [
                    'id' => $log->getUser()->getId(),
                    'fullName' => $log->getUser()->getFullName(),
                ] : null,
                'details' => $log->getDetails(),
                'ipAddress' => $log->getIpAddress(),
                'userAgent' => $log->getUserAgent(),
                'createdAt' => $log->getCreatedAt()->format('c'),
            ], $logs),
        ]);
    }

    #[Route('/audit/export', name: 'api_superadmin_audit_export', methods: ['GET'])]
    public function exportAuditLogs(Request $request): Response
    {
        $format = $request->query->get('format', 'excel');
        
        // Appliquer les mêmes filtres que la page
        $criteria = [];
        $orderBy = ['createdAt' => 'DESC'];
        
        if ($search = $request->query->get('search')) {
            // Filtrer par recherche (à implémenter dans le repository)
        }
        if ($action = $request->query->get('action')) {
            $criteria['actionType'] = $action;
        }
        if ($user = $request->query->get('user')) {
            $criteria['user'] = $user;
        }
        if ($startDate = $request->query->get('startDate')) {
            $criteria['createdAt'] = ['>=', new \DateTimeImmutable($startDate)];
        }
        if ($endDate = $request->query->get('endDate')) {
            $criteria['createdAt'] = ['<=', new \DateTimeImmutable($endDate . ' 23:59:59')];
        }
        
        $logs = $this->activityLogRepository->findBy($criteria, $orderBy, 10000);
        
        if ($format === 'excel') {
            return $this->exportExcel($logs);
        }
        
        return $this->exportPdf($logs);
    }

    private function exportExcel(array $logs): Response
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // En-têtes avec style
        $headers = ['Date', 'Action', 'Utilisateur', 'Entité', 'Adresse IP', 'Détails'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '1', $header);
            $sheet->getStyle($col . '1')->getFont()->setBold(true);
            $sheet->getStyle($col . '1')->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setRGB('4F46E5');
            $sheet->getStyle($col . '1')->getFont()->getColor()->setRGB('FFFFFF');
            $col++;
        }
        
        // Données
        $row = 2;
        foreach ($logs as $log) {
            $sheet->setCellValue('A' . $row, $log->getCreatedAt()->format('d/m/Y H:i:s'));
            $sheet->setCellValue('B' . $row, $this->getActionLabel($log->getActionType()));
            $sheet->setCellValue('C' . $row, $log->getUser()?->getFullName() ?? 'Système');
            $sheet->setCellValue('D' . $row, $log->getEntityType() ? $log->getEntityType() . ' #' . $log->getEntityId() : '-');
            $sheet->setCellValue('E' . $row, $log->getIpAddress() ?? '-');
            $sheet->setCellValue('F' . $row, $this->formatDetails($log->getDetails()));
            $row++;
        }
        
        // Ajuster les largeurs de colonnes
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        $writer = new Xlsx($spreadsheet);
        
        $filename = sprintf('audit_%s.xlsx', (new \DateTime())->format('Ymd_His'));
        
        $response = new StreamedResponse(function() use ($writer) {
            $writer->save('php://output');
        });
        
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');
        
        return $response;
    }

    private function exportPdf(array $logs): Response
    {
        // Configuration de Dompdf
        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        
        $dompdf = new Dompdf($options);
        
        // Construire le HTML
        $html = $this->buildPdfHtml($logs);
        
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'landscape');
        $dompdf->render();
        
        $filename = sprintf('audit_%s.pdf', (new \DateTime())->format('Ymd_His'));
        
        $response = new Response($dompdf->output());
        $response->headers->set('Content-Type', 'application/pdf');
        $response->headers->set('Content-Disposition', 'attachment;filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');
        
        return $response;
    }

    private function buildPdfHtml(array $logs): string
    {
        $date = (new \DateTime())->format('d/m/Y H:i');
        $count = count($logs);
        
        $html = '<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Journal d\'audit - GuardTrack Pro</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #4F46E5;
                    padding-bottom: 15px;
                }
                .header h1 {
                    color: #4F46E5;
                    margin: 0 0 5px 0;
                }
                .header .subtitle {
                    color: #666;
                    font-size: 12px;
                }
                .summary {
                    margin-bottom: 20px;
                    padding: 10px;
                    background-color: #F3F4F6;
                    border-radius: 5px;
                    font-size: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 10px;
                }
                th {
                    background-color: #4F46E5;
                    color: white;
                    padding: 10px 5px;
                    text-align: left;
                    font-weight: bold;
                }
                td {
                    padding: 8px 5px;
                    border-bottom: 1px solid #E5E7EB;
                }
                tr:nth-child(even) {
                    background-color: #F9FAFB;
                }
                .action-badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-size: 9px;
                    font-weight: bold;
                }
                .action-CREATE { background-color: #D1FAE5; color: #065F46; }
                .action-UPDATE { background-color: #DBEAFE; color: #1E40AF; }
                .action-DELETE { background-color: #FEE2E2; color: #991B1B; }
                .action-LOGIN { background-color: #E0E7FF; color: #3730A3; }
                .action-VALIDATE { background-color: #D1FAE5; color: #065F46; }
                .action-REJECT { background-color: #FED7AA; color: #9A3412; }
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 10px;
                    color: #9CA3AF;
                    border-top: 1px solid #E5E7EB;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛡️ GuardTrack Pro</h1>
                <div class="subtitle">Journal d\'audit</div>
            </div>
            
            <div class="summary">
                <strong>Date d\'export :</strong> ' . $date . ' | 
                <strong>Nombre d\'événements :</strong> ' . $count . '
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th width="12%">Date</th>
                        <th width="12%">Action</th>
                        <th width="15%">Utilisateur</th>
                        <th width="15%">Entité</th>
                        <th width="12%">Adresse IP</th>
                        <th width="34%">Détails</th>
                    </tr>
                </thead>
                <tbody>';
        
        foreach ($logs as $log) {
            $action = $log->getActionType();
            $actionLabel = $this->getActionLabel($action);
            $actionClass = 'action-' . explode('_', $action)[0];
            
            $html .= '<tr>
                <td>' . $log->getCreatedAt()->format('d/m/Y H:i:s') . '</td>
                <td><span class="action-badge ' . $actionClass . '">' . $actionLabel . '</span></td>
                <td>' . htmlspecialchars($log->getUser()?->getFullName() ?? 'Système') . '</td>
                <td>' . ($log->getEntityType() ? htmlspecialchars($log->getEntityType() . ' #' . $log->getEntityId()) : '-') . '</td>
                <td>' . htmlspecialchars($log->getIpAddress() ?? '-') . '</td>
                <td>' . htmlspecialchars($this->formatDetails($log->getDetails())) . '</td>
            </tr>';
        }
        
        $html .= '</tbody>
            </table>
            
            <div class="footer">
                GuardTrack Pro - Journal d\'audit généré le ' . $date . '<br>
                Document confidentiel - Réservé aux administrateurs
            </div>
        </body>
        </html>';
        
        return $html;
    }

    private function getActionLabel(string $action): string
    {
        $labels = [
            'LOGIN' => 'Connexion',
            'LOGOUT' => 'Déconnexion',
            'CREATE' => 'Création',
            'UPDATE' => 'Modification',
            'DELETE' => 'Suppression',
            'VALIDATE' => 'Validation',
            'REJECT' => 'Rejet',
            'CHECK_IN' => 'Pointage entrée',
            'CHECK_OUT' => 'Pointage sortie',
            'START_ROUND' => 'Démarrage ronde',
            'COMPLETE_ROUND' => 'Ronde terminée',
            'VISIT_SITE' => 'Visite site',
            'CREATE_INCIDENT' => 'Création incident',
            'RESOLVE_INCIDENT' => 'Résolution incident',
            'ASSIGN' => 'Assignation',
            'EXPORT' => 'Export',
        ];
        return $labels[$action] ?? $action;
    }

    private function formatDetails(?array $details): string
    {
        if (!$details) {
            return '-';
        }
        
        $parts = [];
        foreach ($details as $key => $value) {
            if (is_scalar($value)) {
                $parts[] = $key . ': ' . $value;
            }
        }
        
        return implode('; ', $parts) ?: '-';
    }
}
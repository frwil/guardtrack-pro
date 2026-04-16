<?php
// src/Controller/Api/ActivityLogController.php

namespace App\Controller\Api;

use App\Entity\ActivityLog;
use App\Repository\ActivityLogRepository;
use App\Service\ActivityLogger;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/activity-logs')]
#[IsGranted('ROLE_ADMIN')]
class ActivityLogController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(Request $request, ActivityLogRepository $repository): Response
    {
        $filters = [
            'userId' => $request->query->get('userId'),
            'userRole' => $request->query->get('userRole'),
            'action' => $request->query->get('action'),
            'entity' => $request->query->get('entity'),
            'status' => $request->query->get('status'),
            'startDate' => $request->query->get('startDate'),
            'endDate' => $request->query->get('endDate'),
            'search' => $request->query->get('search'),
        ];
        
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(100, $request->query->getInt('limit', 50));
        
        $result = $repository->findByFilters($filters, $page, $limit);
        
        return $this->json($result);
    }
    
    #[Route('/stats', methods: ['GET'])]
    public function stats(Request $request, ActivityLogRepository $repository): Response
    {
        $filters = [
            'startDate' => $request->query->get('startDate'),
            'endDate' => $request->query->get('endDate'),
        ];
        
        $stats = $repository->getStats($filters);
        
        return $this->json($stats);
    }
    
    #[Route('/user/{userId}', methods: ['GET'])]
    public function getByUser(int $userId, Request $request, ActivityLogRepository $repository): Response
    {
        $filters = [
            'userId' => $userId,
            'action' => $request->query->get('action'),
            'entity' => $request->query->get('entity'),
        ];
        
        $result = $repository->findByFilters($filters, 1, 100);
        
        return $this->json($result['data']);
    }
    
    #[Route('/entity/{entity}/{entityId}', methods: ['GET'])]
    public function getByEntity(string $entity, int $entityId, ActivityLogRepository $repository): Response
    {
        $result = $repository->findByFilters(['entity' => $entity], 1, 100);
        $filtered = array_filter($result['data'], fn($log) => $log->getEntityId() === $entityId);
        
        return $this->json(array_values($filtered));
    }
    
    #[Route('/export', methods: ['GET'])]
    public function export(Request $request, ActivityLogRepository $repository): Response
    {
        $format = $request->query->get('format', 'csv');
        $filters = [
            'startDate' => $request->query->get('startDate'),
            'endDate' => $request->query->get('endDate'),
            'action' => $request->query->get('action'),
            'entity' => $request->query->get('entity'),
        ];
        
        $result = $repository->findByFilters($filters, 1, 10000);
        $logs = $result['data'];
        
        if ($format === 'csv') {
            return $this->exportCsv($logs);
        } elseif ($format === 'json') {
            return $this->exportJson($logs);
        }
        
        return $this->json(['error' => 'Format non supporté'], 400);
    }
    
    private function exportCsv(array $logs): Response
    {
        $response = new StreamedResponse(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            
            fputcsv($handle, ['ID', 'Date', 'Utilisateur', 'Rôle', 'Action', 'Entité', 'Entity ID', 'Statut', 'IP', 'Détails']);
            
            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->getId(),
                    $log->getCreatedAt()->format('Y-m-d H:i:s'),
                    $log->getUserEmail(),
                    $log->getUserRole(),
                    $log->getAction(),
                    $log->getEntity(),
                    $log->getEntityId(),
                    $log->getStatus(),
                    $log->getIpAddress(),
                    json_encode($log->getDetails()),
                ]);
            }
            
            fclose($handle);
        });
        
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="activity_logs.csv"');
        
        return $response;
    }
    
    private function exportJson(array $logs): Response
    {
        $data = array_map(function ($log) {
            return [
                'id' => $log->getId(),
                'createdAt' => $log->getCreatedAt()->format('c'),
                'userEmail' => $log->getUserEmail(),
                'userRole' => $log->getUserRole(),
                'action' => $log->getAction(),
                'entity' => $log->getEntity(),
                'entityId' => $log->getEntityId(),
                'status' => $log->getStatus(),
                'ipAddress' => $log->getIpAddress(),
                'details' => $log->getDetails(),
            ];
        }, $logs);
        
        return $this->json($data);
    }
    
    #[Route('', methods: ['POST'])]
    public function create(Request $request, ActivityLogger $logger): Response
    {
        $data = json_decode($request->getContent(), true);
        
        $log = $logger->log(
            $data['action'] ?? 'UNKNOWN',
            $data['entity'] ?? 'UNKNOWN',
            $data['details'] ?? [],
            $data['entityId'] ?? null,
            $data['status'] ?? ActivityLog::STATUS_SUCCESS,
            $data['errorMessage'] ?? null
        );
        
        return $this->json($log, 201);
    }
}
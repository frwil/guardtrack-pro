<?php
// src/Controller/Api/ConflictController.php

namespace App\Controller\Api;

use App\Entity\ConflictReport;
use App\Repository\ConflictReportRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/conflicts')]
#[IsGranted('ROLE_ADMIN')]
class ConflictController extends AbstractController
{
    #[Route('', methods: ['GET'])]
    public function list(Request $request, ConflictReportRepository $repository): Response
    {
        $filters = [
            'conflictType' => $request->query->get('conflictType'),
            'resolution' => $request->query->get('resolution'),
            'startDate' => $request->query->get('startDate'),
            'endDate' => $request->query->get('endDate'),
        ];
        
        $page = max(1, $request->query->getInt('page', 1));
        $limit = min(50, $request->query->getInt('limit', 20));
        
        $result = $repository->findByFilters($filters, $page, $limit);
        
        return $this->json($result);
    }
    
    #[Route('/stats', methods: ['GET'])]
    public function stats(ConflictReportRepository $repository): Response
    {
        return $this->json($repository->getStats());
    }
    
    #[Route('/{id}', methods: ['GET'])]
    public function get(int $id, ConflictReportRepository $repository): Response
    {
        $conflict = $repository->find($id);
        
        if (!$conflict) {
            return $this->json(['error' => 'Conflit non trouvé'], 404);
        }
        
        return $this->json($conflict);
    }
    
    #[Route('', methods: ['POST'])]
    public function create(Request $request, ConflictReportRepository $repository): Response
    {
        $data = json_decode($request->getContent(), true);
        
        $conflict = new ConflictReport();
        $conflict->setOperationId($data['operationId']);
        $conflict->setOperation($data['operation']);
        $conflict->setConflictType($data['conflictType']);
        $conflict->setReason($data['reason']);
        $conflict->setClientData($data['clientData']);
        $conflict->setServerState($data['serverState'] ?? null);
        $conflict->setResolution($data['resolution'] ?? ConflictReport::RESOLUTION_PENDING);
        $conflict->setSyncedToServer(true);
        
        $repository->save($conflict, true);
        
        return $this->json($conflict, 201);
    }
    
    #[Route('/batch', methods: ['POST'])]
    public function batchCreate(Request $request, ConflictReportRepository $repository): Response
    {
        $data = json_decode($request->getContent(), true);
        $conflicts = $data['conflicts'] ?? [];
        
        $success = 0;
        $failed = 0;
        
        foreach ($conflicts as $conflictData) {
            try {
                $conflict = new ConflictReport();
                $conflict->setOperationId($conflictData['operationId']);
                $conflict->setOperation($conflictData['operation']);
                $conflict->setConflictType($conflictData['conflictType']);
                $conflict->setReason($conflictData['reason']);
                $conflict->setClientData($conflictData['clientData']);
                $conflict->setServerState($conflictData['serverState'] ?? null);
                $conflict->setResolution($conflictData['resolution'] ?? ConflictReport::RESOLUTION_PENDING);
                $conflict->setSyncedToServer(true);
                
                $repository->save($conflict);
                $success++;
            } catch (\Exception $e) {
                $failed++;
            }
        }
        
        $repository->flush();
        
        return $this->json(['success' => $success, 'failed' => $failed]);
    }
    
    #[Route('/{id}/resolve', methods: ['PATCH'])]
    public function resolve(int $id, Request $request, ConflictReportRepository $repository): Response
    {
        $conflict = $repository->find($id);
        
        if (!$conflict) {
            return $this->json(['error' => 'Conflit non trouvé'], 404);
        }
        
        $data = json_decode($request->getContent(), true);
        
        $conflict->resolve(
            $data['resolution'],
            $this->getUser(),
            $data['resolutionNote'] ?? null,
            $data['developerNotes'] ?? null
        );
        
        $repository->flush();
        
        return $this->json($conflict);
    }
    
    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id, ConflictReportRepository $repository): Response
    {
        $conflict = $repository->find($id);
        
        if (!$conflict) {
            return $this->json(['error' => 'Conflit non trouvé'], 404);
        }
        
        $repository->remove($conflict, true);
        
        return $this->json(['message' => 'Conflit supprimé']);
    }
    
    #[Route('/export', methods: ['GET'])]
    public function export(Request $request, ConflictReportRepository $repository): Response
    {
        $format = $request->query->get('format', 'json');
        $filters = [
            'conflictType' => $request->query->get('conflictType'),
            'resolution' => $request->query->get('resolution'),
        ];
        
        $result = $repository->findByFilters($filters, 1, 1000);
        $conflicts = $result['data'];
        
        if ($format === 'csv') {
            return $this->exportCsv($conflicts);
        }
        
        return $this->json($conflicts);
    }
    
    private function exportCsv(array $conflicts): Response
    {
        $response = new StreamedResponse(function () use ($conflicts) {
            $handle = fopen('php://output', 'w');
            
            fputcsv($handle, ['ID', 'Date', 'Type', 'Entité', 'Raison', 'Résolution', 'Notes développeur']);
            
            foreach ($conflicts as $conflict) {
                fputcsv($handle, [
                    $conflict->getId(),
                    $conflict->getCreatedAt()->format('Y-m-d H:i:s'),
                    $conflict->getConflictType(),
                    $conflict->getOperation()['entity'] ?? 'UNKNOWN',
                    $conflict->getReason(),
                    $conflict->getResolution(),
                    $conflict->getDeveloperNotes(),
                ]);
            }
            
            fclose($handle);
        });
        
        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="conflicts.csv"');
        
        return $response;
    }
}
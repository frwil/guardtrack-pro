<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class SystemController extends AbstractController
{
    #[Route('/api/ping', name: 'api_ping', methods: ['GET'])]
    public function ping(): JsonResponse
    {
        return $this->json([
            'status' => 'ok',
            'message' => 'GuardTrack Pro API',
            'version' => '1.0.0',
            'timestamp' => (new \DateTime())->format('c'),
        ]);
    }

    #[Route('/api/test', name: 'api_test', methods: ['GET'])]
    public function test(): JsonResponse
    {
        return $this->json([
            'status' => 'success',
            'message' => 'API is accessible',
        ]);
    }

    #[Route('/api/system/time', name: 'api_system_time', methods: ['GET'])]
    public function getServerTime(): JsonResponse
    {
        $now = new \DateTimeImmutable();
        
        return $this->json([
            'timestamp' => $now->getTimestamp(),
            'iso' => $now->format('c'),
            'timezone' => $now->getTimezone()->getName(),
        ]);
    }
}
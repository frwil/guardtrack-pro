<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class IndexController extends AbstractController
{
    #[Route('/api', name: 'api_index', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json([
            'name' => 'GuardTrack Pro API',
            'version' => '1.0.0',
            'status' => 'running',
            'endpoints' => [
                'ping' => '/api/ping',
                'test' => '/api/test',
                'auth' => [
                    'login' => 'POST /api/auth/login',
                    'register' => 'POST /api/auth/register',
                    'verify-pin' => 'POST /api/auth/verify-pin',
                    'me' => 'GET /api/auth/me',
                ]
            ]
        ]);
    }
}
<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class PingController
{
    #[Route('/ping', name: 'ping', methods: ['GET'])]
    public function ping(): Response
    {
        return new Response('pong', 200, ['Content-Type' => 'text/plain']);
    }
}
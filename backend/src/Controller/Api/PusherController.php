<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Service\PusherService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/pusher')]
#[IsGranted('ROLE_AGENT')]
class PusherController extends AbstractController
{
    public function __construct(private PusherService $pusher) {}

    /**
     * Endpoint d'authentification pour les canaux Pusher privés.
     * Appelé automatiquement par pusher-js lors d'un abonnement à un canal privé.
     */
    #[Route('/auth', name: 'api_pusher_auth', methods: ['POST'])]
    public function auth(Request $request): Response
    {
        /** @var User $user */
        $user = $this->getUser();

        $socketId    = $request->request->get('socket_id');
        $channelName = $request->request->get('channel_name');

        if (!$socketId || !$channelName) {
            return $this->json(['error' => 'Missing socket_id or channel_name'], Response::HTTP_BAD_REQUEST);
        }

        // Vérifier que l'utilisateur est autorisé sur ce canal privé
        if (str_starts_with($channelName, 'private-user-')) {
            $channelUserId = (int) substr($channelName, strlen('private-user-'));
            if ($channelUserId !== $user->getId()) {
                return $this->json(['error' => 'Forbidden'], Response::HTTP_FORBIDDEN);
            }
        }

        try {
            $auth = $this->pusher->authenticateChannel($socketId, $channelName);
            return new Response($auth, Response::HTTP_OK, ['Content-Type' => 'application/json']);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Pusher auth failed'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}

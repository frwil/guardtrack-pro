<?php

namespace App\Controller\Api;

use App\Entity\ChatConversation;
use App\Entity\ChatMessage;
use App\Entity\User;
use App\Repository\ChatConversationRepository;
use App\Repository\ChatMessageRepository;
use App\Repository\UserRepository;
use App\Service\PusherService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/chat')]
#[IsGranted('ROLE_AGENT')]
class ChatController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ChatConversationRepository $conversationRepository,
        private ChatMessageRepository $messageRepository,
        private UserRepository $userRepository,
        private PusherService $pusher
    ) {}

    #[Route('/conversations', name: 'api_chat_conversations_list', methods: ['GET'])]
    public function listConversations(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $conversations = $this->conversationRepository->findByParticipant($user);

        $result = [];
        foreach ($conversations as $conversation) {
            $lastMessage = $conversation->getMessages()->last();
            $unreadCount = $this->messageRepository->countUnreadForUser($conversation, $user);

            $data = $conversation->toArray($user);
            $data['unreadCount'] = $unreadCount;
            $data['lastMessage'] = $lastMessage ? $lastMessage->toArray() : null;

            $result[] = $data;
        }

        usort($result, fn($a, $b) =>
            ($b['lastMessage']['createdAt'] ?? $b['updatedAt']) <=>
            ($a['lastMessage']['createdAt'] ?? $a['updatedAt'])
        );

        return $this->json($result);
    }

    #[Route('/conversations', name: 'api_chat_conversations_create', methods: ['POST'])]
    public function createConversation(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $type           = $data['type'] ?? ChatConversation::TYPE_DIRECT;
        $participantIds = $data['participantIds'] ?? [];
        $roundId        = $data['roundId'] ?? null;
        $title          = $data['title'] ?? null;

        if (!in_array($user->getId(), $participantIds)) {
            $participantIds[] = $user->getId();
        }

        $conversation = new ChatConversation();
        $conversation->setType($type);
        $conversation->setTitle($title);
        $conversation->setCreatedBy($user);

        if ($roundId) {
            $round = $this->entityManager->getRepository(\App\Entity\Round::class)->find($roundId);
            if ($round) {
                $conversation->setRound($round);
            }
        }

        foreach ($participantIds as $participantId) {
            $participant = $this->userRepository->find($participantId);
            if ($participant) {
                $conversation->addParticipant($participant);
            }
        }

        $this->entityManager->persist($conversation);
        $this->entityManager->flush();

        return $this->json($conversation->toArray($user), Response::HTTP_CREATED);
    }

    #[Route('/conversations/{id}', name: 'api_chat_conversations_show', methods: ['GET'])]
    public function showConversation(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $conversation = $this->conversationRepository->find($id);

        if (!$conversation) {
            return $this->json(['error' => 'Conversation not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$conversation->hasParticipant($user)) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        $limit  = $request->query->get('limit', 50);
        $before = $request->query->get('before');

        $criteria = ['conversation' => $conversation];
        if ($before) {
            $criteria['createdAt'] = ['<', new \DateTimeImmutable($before)];
        }

        $messages = $this->messageRepository->findBy(
            $criteria,
            ['createdAt' => 'DESC'],
            $limit
        );

        foreach ($messages as $message) {
            if (!$message->isRead() && $message->getSender()->getId() !== $user->getId()) {
                $message->setIsRead(true);
                $message->setReadAt(new \DateTimeImmutable());
            }
        }
        $this->entityManager->flush();

        return $this->json([
            'conversation' => $conversation->toArray($user),
            'messages'     => array_reverse(array_map(fn(ChatMessage $m) => $m->toArray(), $messages)),
        ]);
    }

    #[Route('/conversations/{id}/messages', name: 'api_chat_messages_create', methods: ['POST'])]
    public function sendMessage(int $id, Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true);

        $conversation = $this->conversationRepository->find($id);

        if (!$conversation) {
            return $this->json(['error' => 'Conversation not found'], Response::HTTP_NOT_FOUND);
        }

        if (!$conversation->hasParticipant($user)) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }

        if (empty($data['content'])) {
            return $this->json(['error' => 'Message content is required'], Response::HTTP_BAD_REQUEST);
        }

        $message = new ChatMessage();
        $message->setConversation($conversation);
        $message->setSender($user);
        $message->setContent($data['content']);

        $this->entityManager->persist($message);
        $this->entityManager->flush();

        $messageData = $message->toArray();

        // Publier le message via Pusher sur le canal de la conversation
        $this->pusher->trigger(
            "chat-conversation-{$conversation->getId()}",
            'new-message',
            [
                'conversationId' => $conversation->getId(),
                'message'        => $messageData,
            ]
        );

        // Notifier chaque participant (sauf l'expéditeur) via son canal privé
        foreach ($conversation->getParticipants() as $participant) {
            if ($participant->getId() === $user->getId()) continue;

            // Notification Pusher temps-réel
            $this->pusher->trigger(
                "private-user-{$participant->getId()}",
                'new-notification',
                [
                    'type'           => 'chat_message',
                    'conversationId' => $conversation->getId(),
                    'title'          => 'Nouveau message',
                    'message'        => $user->getFullName() . ' : ' . substr($data['content'], 0, 60),
                    'link'           => '/chat?conversation=' . $conversation->getId(),
                    'severity'       => 'INFO',
                    'createdAt'      => (new \DateTimeImmutable())->format('c'),
                ]
            );

            // Notification persistante en base
            $notification = new \App\Entity\Notification();
            $notification->setUser($participant);
            $notification->setTitle('Nouveau message');
            $notification->setMessage($user->getFullName() . ' : ' . substr($data['content'], 0, 50) . '...');
            $notification->setSeverity('INFO');
            $notification->setLink('/chat?conversation=' . $conversation->getId());
            $this->entityManager->persist($notification);
        }
        $this->entityManager->flush();

        return $this->json($messageData, Response::HTTP_CREATED);
    }

    #[Route('/unread-count', name: 'api_chat_unread_count', methods: ['GET'])]
    public function unreadCount(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $conversations = $this->conversationRepository->findByParticipant($user);
        $totalUnread   = 0;

        foreach ($conversations as $conversation) {
            $totalUnread += $this->messageRepository->countUnreadForUser($conversation, $user);
        }

        return $this->json(['unread' => $totalUnread]);
    }

    #[Route('/round/{roundId}/conversation', name: 'api_chat_round_conversation', methods: ['GET'])]
    public function getRoundConversation(int $roundId): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $conversation = $this->conversationRepository->findOneBy([
            'type'  => ChatConversation::TYPE_ROUND,
            'round' => $roundId,
        ]);

        if (!$conversation) {
            $round = $this->entityManager->getRepository(\App\Entity\Round::class)->find($roundId);
            if (!$round) {
                return $this->json(['error' => 'Round not found'], Response::HTTP_NOT_FOUND);
            }

            $conversation = new ChatConversation();
            $conversation->setType(ChatConversation::TYPE_ROUND);
            $conversation->setRound($round);
            $conversation->setCreatedBy($user);

            if ($round->getAgent()) {
                $conversation->addParticipant($round->getAgent());
            }
            if ($round->getSupervisor()) {
                $conversation->addParticipant($round->getSupervisor());
            }
            $conversation->addParticipant($user);

            $this->entityManager->persist($conversation);
            $this->entityManager->flush();
        }

        if (!$conversation->hasParticipant($user)) {
            $conversation->addParticipant($user);
            $this->entityManager->flush();
        }

        return $this->json($conversation->toArray($user));
    }
}

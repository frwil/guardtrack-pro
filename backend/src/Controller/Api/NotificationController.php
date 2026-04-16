<?php

namespace App\Controller\Api;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\NotificationRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/notifications')]
#[IsGranted('ROLE_AGENT')]
class NotificationController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private NotificationRepository $notificationRepository
    ) {
    }

    #[Route('', name: 'api_notifications_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $unreadOnly = $request->query->get('unread') === 'true';
        $limit = $request->query->get('limit', 50);
        
        $criteria = ['user' => $user];
        if ($unreadOnly) {
            $criteria['isRead'] = false;
        }
        
        $notifications = $this->notificationRepository->findBy(
            $criteria,
            ['createdAt' => 'DESC'],
            $limit
        );
        
        return $this->json([
            'unreadCount' => $user->getUnreadNotificationsCount(),
            'notifications' => array_map(fn(Notification $n) => $this->formatNotification($n), $notifications),
        ]);
    }

    #[Route('/unread', name: 'api_notifications_unread', methods: ['GET'])]
    public function unread(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $notifications = $user->getUnreadNotifications()->toArray();
        usort($notifications, fn($a, $b) => $b->getCreatedAt() <=> $a->getCreatedAt());
        
        return $this->json([
            'count' => count($notifications),
            'notifications' => array_map(fn(Notification $n) => $this->formatNotification($n), array_slice($notifications, 0, 20)),
        ]);
    }

    #[Route('/count', name: 'api_notifications_count', methods: ['GET'])]
    public function count(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        return $this->json([
            'unread' => $user->getUnreadNotificationsCount(),
            'total' => $user->getNotifications()->count(),
        ]);
    }

    #[Route('/{id}', name: 'api_notifications_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $notification = $this->notificationRepository->find($id);
        
        if (!$notification) {
            return $this->json(['error' => 'Notification not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($notification->getUser()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        return $this->json($this->formatNotification($notification, true));
    }

    #[Route('/{id}/read', name: 'api_notifications_mark_read', methods: ['PATCH'])]
    public function markRead(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $notification = $this->notificationRepository->find($id);
        
        if (!$notification) {
            return $this->json(['error' => 'Notification not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($notification->getUser()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        $notification->setIsRead(true);
        $notification->setReadAt(new \DateTimeImmutable());
        $this->entityManager->flush();
        
        return $this->json(['isRead' => true]);
    }

    #[Route('/read-all', name: 'api_notifications_mark_all_read', methods: ['PATCH'])]
    public function markAllRead(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        foreach ($user->getUnreadNotifications() as $notification) {
            $notification->setIsRead(true);
            $notification->setReadAt(new \DateTimeImmutable());
        }
        
        $this->entityManager->flush();
        
        return $this->json(['message' => 'All notifications marked as read']);
    }

    #[Route('/{id}', name: 'api_notifications_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        
        $notification = $this->notificationRepository->find($id);
        
        if (!$notification) {
            return $this->json(['error' => 'Notification not found'], Response::HTTP_NOT_FOUND);
        }
        
        if ($notification->getUser()->getId() !== $user->getId()) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        $this->entityManager->remove($notification);
        $this->entityManager->flush();
        
        return $this->json(['message' => 'Notification deleted']);
    }

    private function formatNotification(Notification $notification, bool $includeDetails = false): array
    {
        $data = [
            'id' => $notification->getId(),
            'title' => $notification->getTitle(),
            'message' => $notification->getMessage(),
            'severity' => $notification->getSeverity(),
            'isRead' => $notification->isRead(),
            'createdAt' => $notification->getCreatedAt()->format('c'),
        ];
        
        if ($includeDetails) {
            $data['readAt'] = $notification->getReadAt()?->format('c');
        }
        
        return $data;
    }
}
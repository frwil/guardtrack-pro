<?php

namespace App\Service;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

class NotificationService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $userRepository,
        private PusherService $pusher
    ) {}

    public function send(User $user, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        // Persister en base
        $notification = new Notification();
        $notification->setUser($user);
        $notification->setTitle($title);
        $notification->setMessage($message);
        $notification->setSeverity($severity);
        $notification->setLink($link);
        $notification->setIsRead(false);

        $this->entityManager->persist($notification);
        $this->entityManager->flush();

        // Envoyer en temps-réel via Pusher
        $this->pusher->trigger(
            "private-user-{$user->getId()}",
            'new-notification',
            [
                'id'        => $notification->getId(),
                'title'     => $title,
                'message'   => $message,
                'severity'  => $severity,
                'link'      => $link,
                'createdAt' => $notification->getCreatedAt()->format('c'),
            ]
        );
    }

    public function notifyHierarchy(User $user, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        $userLevel = $user->getRoleLevel();
        $allUsers  = $this->userRepository->findAll();

        foreach ($allUsers as $targetUser) {
            if ($targetUser->getRoleLevel() > $userLevel) {
                $this->send($targetUser, $title, $message, $severity, $link);
            }
        }
    }

    public function sendToRole(string $role, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        $users = $this->userRepository->findByRole($role);
        foreach ($users as $user) {
            $this->send($user, $title, $message, $severity, $link);
        }
    }
}

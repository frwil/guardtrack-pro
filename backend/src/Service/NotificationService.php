<?php

namespace App\Service;

use App\Entity\Notification;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class NotificationService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $userRepository,
        private ?HubInterface $hub = null // ✅ Optionnel pour éviter les erreurs si Mercure non configuré
    ) {
    }

    /**
     * Envoie une notification à un utilisateur
     */
    public function send(User $user, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        // Sauvegarder en base
        $notification = new Notification();
        $notification->setUser($user);
        $notification->setTitle($title);
        $notification->setMessage($message);
        $notification->setSeverity($severity);
        $notification->setLink($link);
        $notification->setIsRead(false);
        
        $this->entityManager->persist($notification);
        $this->entityManager->flush();
        
        // Publier via Mercure si disponible
        if ($this->hub) {
            try {
                $update = new Update(
                    "/users/{$user->getId()}/notifications",
                    json_encode([
                        'id' => $notification->getId(),
                        'title' => $title,
                        'message' => $message,
                        'severity' => $severity,
                        'link' => $link,
                        'createdAt' => $notification->getCreatedAt()->format('c'),
                    ]),
                    true
                );
                
                $this->hub->publish($update);
            } catch (\Exception $e) {
                // Loguer l'erreur mais ne pas bloquer
                error_log('Erreur Mercure: ' . $e->getMessage());
            }
        }
    }

    /**
     * Notifie les supérieurs hiérarchiques
     */
    public function notifyHierarchy(User $user, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        $userLevel = $user->getRoleLevel();
        
        // Récupérer tous les utilisateurs de niveau supérieur
        $allUsers = $this->userRepository->findAll();
        
        foreach ($allUsers as $targetUser) {
            if ($targetUser->getRoleLevel() > $userLevel) {
                $this->send($targetUser, $title, $message, $severity, $link);
            }
        }
    }

    /**
     * Notifie tous les utilisateurs d'un rôle spécifique
     */
    public function sendToRole(string $role, string $title, string $message, string $severity = 'INFO', ?string $link = null): void
    {
        $users = $this->userRepository->findByRole($role);
        foreach ($users as $user) {
            $this->send($user, $title, $message, $severity, $link);
        }
    }
}
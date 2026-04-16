<?php

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class UserVoter extends Voter
{
    public const VIEW = 'USER_VIEW';
    public const EDIT = 'USER_EDIT';
    public const DELETE = 'USER_DELETE';
    public const CREATE = 'USER_CREATE';
    public const MANAGE_ROLES = 'USER_MANAGE_ROLES';

    protected function supports(string $attribute, mixed $subject): bool
    {
        $supportedAttributes = [self::VIEW, self::EDIT, self::DELETE, self::CREATE, self::MANAGE_ROLES];
        
        if (!in_array($attribute, $supportedAttributes)) {
            return false;
        }

        // CREATE n'a pas de sujet (on crée un nouvel utilisateur)
        if ($attribute === self::CREATE) {
            return true;
        }

        return $subject instanceof User;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        /** @var User $currentUser */
        $currentUser = $token->getUser();

        if (!$currentUser instanceof User) {
            return false;
        }

        // Super Admin peut tout faire
        if ($currentUser->isSuperAdmin()) {
            return true;
        }

        // Si le sujet est null (CREATE), on vérifie juste les permissions du currentUser
        if ($subject === null && $attribute === self::CREATE) {
            return $this->canCreate($currentUser);
        }

        /** @var User $targetUser */
        $targetUser = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($currentUser, $targetUser),
            self::EDIT => $this->canEdit($currentUser, $targetUser),
            self::DELETE => $this->canDelete($currentUser, $targetUser),
            self::CREATE => $this->canCreate($currentUser),
            self::MANAGE_ROLES => $this->canManageRoles($currentUser, $targetUser),
            default => false,
        };
    }

    /**
     * Vérifie si l'utilisateur courant peut voir l'utilisateur cible
     */
    private function canView(User $currentUser, User $targetUser): bool
    {
        // Un utilisateur peut voir son propre profil
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }

        // Contrôleur+ peut voir les agents
        if ($currentUser->isControleur() && $targetUser->getRole() === User::ROLE_AGENT) {
            return true;
        }

        // Superviseur+ peut voir les agents et contrôleurs
        if ($currentUser->isSuperviseur() && in_array($targetUser->getRole(), [User::ROLE_AGENT, User::ROLE_CONTROLEUR])) {
            return true;
        }

        // Admin+ peut voir tout le monde sauf SuperAdmin
        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    /**
     * Vérifie si l'utilisateur courant peut éditer l'utilisateur cible
     */
    private function canEdit(User $currentUser, User $targetUser): bool
    {
        // Un utilisateur peut éditer son propre profil (sauf le rôle)
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }

        // Admin+ peut éditer tout le monde sauf SuperAdmin
        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    /**
     * Vérifie si l'utilisateur courant peut supprimer l'utilisateur cible
     */
    private function canDelete(User $currentUser, User $targetUser): bool
    {
        // Personne ne peut se supprimer soi-même
        if ($currentUser->getId() === $targetUser->getId()) {
            return false;
        }

        // Admin+ peut supprimer tout le monde sauf SuperAdmin
        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    /**
     * Vérifie si l'utilisateur courant peut créer un nouvel utilisateur
     */
    private function canCreate(User $currentUser): bool
    {
        // Admin+ peut créer des utilisateurs
        return $currentUser->isAdmin();
    }

    /**
     * Vérifie si l'utilisateur courant peut gérer les rôles de l'utilisateur cible
     */
    private function canManageRoles(User $currentUser, User $targetUser): bool
    {
        // SuperAdmin seulement
        if ($currentUser->isSuperAdmin()) {
            return true;
        }

        // Admin peut gérer les rôles jusqu'à Superviseur (niveau < ADMIN)
        if ($currentUser->isAdmin()) {
            $targetLevel = $targetUser->getRoleLevel();
            $adminLevel = User::ROLE_HIERARCHY[User::ROLE_ADMIN] ?? 4;
            return $targetLevel < $adminLevel;
        }

        return false;
    }
}
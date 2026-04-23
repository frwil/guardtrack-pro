<?php

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;

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

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
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

    private function canView(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }

        if ($currentUser->isControleur() && $targetUser->getRole() === User::ROLE_AGENT) {
            return true;
        }

        if ($currentUser->isSuperviseur() && in_array($targetUser->getRole(), [User::ROLE_AGENT, User::ROLE_CONTROLEUR])) {
            return true;
        }

        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    private function canEdit(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }

        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    private function canDelete(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->getId() === $targetUser->getId()) {
            return false;
        }

        if ($currentUser->isAdmin() && $targetUser->getRole() !== User::ROLE_SUPERADMIN) {
            return true;
        }

        return false;
    }

    private function canCreate(User $currentUser): bool
    {
        return $currentUser->isAdmin();
    }

    private function canManageRoles(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->isSuperAdmin()) {
            return true;
        }

        if ($currentUser->isAdmin()) {
            $targetLevel = $targetUser->getRoleLevel();
            $adminLevel = User::ROLE_HIERARCHY[User::ROLE_ADMIN] ?? 4;
            return $targetLevel < $adminLevel;
        }

        return false;
    }
}
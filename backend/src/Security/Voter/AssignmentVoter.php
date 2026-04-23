<?php

namespace App\Security\Voter;

use App\Entity\Assignment;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;

class AssignmentVoter extends Voter
{
    public const VIEW = 'ASSIGNMENT_VIEW';
    public const CREATE = 'ASSIGNMENT_CREATE';
    public const EDIT = 'ASSIGNMENT_EDIT';
    public const DELETE = 'ASSIGNMENT_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        $supportedAttributes = [self::VIEW, self::CREATE, self::EDIT, self::DELETE];
        
        if (!in_array($attribute, $supportedAttributes)) {
            return false;
        }

        if ($attribute === self::CREATE) {
            return true;
        }

        return $subject instanceof Assignment;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        /** @var User $currentUser */
        $currentUser = $token->getUser();

        if (!$currentUser instanceof User) {
            return false;
        }

        if ($currentUser->isSuperAdmin()) {
            return true;
        }

        if ($subject === null && $attribute === self::CREATE) {
            return $this->canCreate($currentUser);
        }

        /** @var Assignment $assignment */
        $assignment = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($currentUser, $assignment),
            self::CREATE => $this->canCreate($currentUser),
            self::EDIT => $this->canEdit($currentUser, $assignment),
            self::DELETE => $this->canDelete($currentUser, $assignment),
            default => false,
        };
    }

    private function canView(User $currentUser, Assignment $assignment): bool
    {
        // L'agent peut voir ses propres affectations
        if ($currentUser->getId() === $assignment->getAgent()->getId()) {
            return true;
        }

        // Superviseur+ peut voir toutes les affectations
        return $currentUser->isSuperviseur();
    }

    private function canCreate(User $currentUser): bool
    {
        return $currentUser->canManageAssignments();
    }

    private function canEdit(User $currentUser, Assignment $assignment): bool
    {
        return $currentUser->canManageAssignments();
    }

    private function canDelete(User $currentUser, Assignment $assignment): bool
    {
        // Admin+ peut supprimer
        return $currentUser->isAdmin();
    }
}
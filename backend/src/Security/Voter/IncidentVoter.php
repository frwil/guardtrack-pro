<?php

namespace App\Security\Voter;

use App\Entity\Incident;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class IncidentVoter extends Voter
{
    public const VIEW = 'INCIDENT_VIEW';
    public const CREATE = 'INCIDENT_CREATE';
    public const EDIT = 'INCIDENT_EDIT';
    public const RESOLVE = 'INCIDENT_RESOLVE';
    public const DELETE = 'INCIDENT_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        $supportedAttributes = [self::VIEW, self::CREATE, self::EDIT, self::RESOLVE, self::DELETE];
        
        if (!in_array($attribute, $supportedAttributes)) {
            return false;
        }

        if ($attribute === self::CREATE) {
            return true;
        }

        return $subject instanceof Incident;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
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

        /** @var Incident $incident */
        $incident = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($currentUser, $incident),
            self::CREATE => $this->canCreate($currentUser),
            self::EDIT => $this->canEdit($currentUser, $incident),
            self::RESOLVE => $this->canResolve($currentUser, $incident),
            self::DELETE => $this->canDelete($currentUser, $incident),
            default => false,
        };
    }

    private function canView(User $currentUser, Incident $incident): bool
    {
        // Le rapporteur peut voir son incident
        if ($currentUser->getId() === $incident->getReporter()->getId()) {
            return true;
        }

        // L'assigné peut voir l'incident
        if ($incident->getAssignedTo() && $currentUser->getId() === $incident->getAssignedTo()->getId()) {
            return true;
        }

        // Contrôleur+ peut voir les incidents
        return $currentUser->isControleur();
    }

    private function canCreate(User $currentUser): bool
    {
        // Agent+ peut créer un incident
        return $currentUser->isAgent();
    }

    private function canEdit(User $currentUser, Incident $incident): bool
    {
        // Le rapporteur peut éditer si non résolu
        if ($currentUser->getId() === $incident->getReporter()->getId()) {
            return $incident->getStatus() !== 'RESOLVED';
        }

        // Superviseur+ peut éditer
        return $currentUser->isSuperviseur();
    }

    private function canResolve(User $currentUser, Incident $incident): bool
    {
        // L'assigné peut résoudre
        if ($incident->getAssignedTo() && $currentUser->getId() === $incident->getAssignedTo()->getId()) {
            return $incident->getStatus() !== 'RESOLVED';
        }

        // Superviseur+ peut résoudre
        return $currentUser->isSuperviseur();
    }

    private function canDelete(User $currentUser, Incident $incident): bool
    {
        // Admin+ peut supprimer
        return $currentUser->isAdmin();
    }
}
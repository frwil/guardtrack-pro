<?php

namespace App\Security\Voter;

use App\Entity\Presence;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class PresenceVoter extends Voter
{
    public const VIEW = 'PRESENCE_VIEW';
    public const CREATE = 'PRESENCE_CREATE';
    public const VALIDATE = 'PRESENCE_VALIDATE';
    public const REJECT = 'PRESENCE_REJECT';
    public const DELETE = 'PRESENCE_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        $supportedAttributes = [self::VIEW, self::CREATE, self::VALIDATE, self::REJECT, self::DELETE];
        
        if (!in_array($attribute, $supportedAttributes)) {
            return false;
        }

        if ($attribute === self::CREATE) {
            return true;
        }

        return $subject instanceof Presence;
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

        /** @var Presence $presence */
        $presence = $subject;

        return match ($attribute) {
            self::VIEW => $this->canView($currentUser, $presence),
            self::CREATE => $this->canCreate($currentUser),
            self::VALIDATE => $this->canValidate($currentUser, $presence),
            self::REJECT => $this->canReject($currentUser, $presence),
            self::DELETE => $this->canDelete($currentUser, $presence),
            default => false,
        };
    }

    private function canView(User $currentUser, Presence $presence): bool
    {
        // L'agent peut voir ses propres présences
        if ($currentUser->getId() === $presence->getAgent()->getId()) {
            return true;
        }

        // Contrôleur+ peut voir les présences des agents
        return $currentUser->isControleur();
    }

    private function canCreate(User $currentUser): bool
    {
        // Seuls les agents peuvent créer des présences
        return $currentUser->getRole() === User::ROLE_AGENT;
    }

    private function canValidate(User $currentUser, Presence $presence): bool
    {
        // Seuls les contrôleurs+ peuvent valider
        if (!$currentUser->canValidatePresence()) {
            return false;
        }

        // Ne peut pas valider ses propres présences
        if ($currentUser->getId() === $presence->getAgent()->getId()) {
            return false;
        }

        return $presence->getStatus() === 'PENDING';
    }

    private function canReject(User $currentUser, Presence $presence): bool
    {
        // Mêmes règles que pour valider
        return $this->canValidate($currentUser, $presence);
    }

    private function canDelete(User $currentUser, Presence $presence): bool
    {
        // Admin+ peut supprimer
        if ($currentUser->isAdmin()) {
            return true;
        }

        // L'agent peut supprimer ses présences non validées
        if ($currentUser->getId() === $presence->getAgent()->getId()) {
            return $presence->getStatus() === 'PENDING';
        }

        return false;
    }
}
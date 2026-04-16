<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    // ============================================================
    // Constantes de rôles avec hiérarchie
    // ============================================================
    
    public const ROLE_GUEST = 'GUEST';
    public const ROLE_AGENT = 'AGENT';
    public const ROLE_CONTROLEUR = 'CONTROLEUR';
    public const ROLE_SUPERVISEUR = 'SUPERVISEUR';
    public const ROLE_ADMIN = 'ADMIN';
    public const ROLE_SUPERADMIN = 'SUPERADMIN';

    public const ROLE_HIERARCHY = [
        self::ROLE_GUEST => 0,
        self::ROLE_AGENT => 1,
        self::ROLE_CONTROLEUR => 2,
        self::ROLE_SUPERVISEUR => 3,
        self::ROLE_ADMIN => 4,
        self::ROLE_SUPERADMIN => 5,
    ];

    private const ROLE_SYMFONY_MAPPING = [
        self::ROLE_GUEST => 'ROLE_GUEST',
        self::ROLE_AGENT => 'ROLE_AGENT',
        self::ROLE_CONTROLEUR => 'ROLE_CONTROLEUR',
        self::ROLE_SUPERVISEUR => 'ROLE_SUPERVISEUR',
        self::ROLE_ADMIN => 'ROLE_ADMIN',
        self::ROLE_SUPERADMIN => 'ROLE_SUPERADMIN',
    ];

    public const AVAILABLE_ROLES = [
        self::ROLE_GUEST,
        self::ROLE_AGENT,
        self::ROLE_CONTROLEUR,
        self::ROLE_SUPERVISEUR,
        self::ROLE_ADMIN,
        self::ROLE_SUPERADMIN,
    ];

    // ============================================================
    // Propriétés
    // ============================================================

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read', 'user:list'])]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Groups(['user:read', 'user:list', 'user:write'])]
    private ?string $email = null;

    #[ORM\Column(length: 255)]
    private ?string $password = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['user:read', 'user:list', 'user:write'])]
    private ?string $firstName = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['user:read', 'user:list', 'user:write'])]
    private ?string $lastName = null;

    #[ORM\Column(length: 20)]
    #[Groups(['user:read', 'user:list', 'user:write'])]
    private ?string $role = self::ROLE_AGENT;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, nullable: true, options: ['default' => '11.50'])]
    #[Groups(['user:read', 'user:write'])]
    private ?string $hourlyRate = '11.50';

    #[ORM\Column(length: 5, nullable: true)]
    private ?string $pinCode = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups(['user:read', 'user:list', 'user:write'])]
    private ?string $phone = null;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['user:read', 'user:list'])]
    private bool $isActive = true;

    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $lastLoginAt = null;

    

    // ============================================================
    // Données temporaires (non persistées)
    // ============================================================
    
    private ?string $plainPassword = null;
    private ?string $plainPinCode = null;

    // ============================================================
    // Relations
    // ============================================================

    #[ORM\OneToMany(mappedBy: 'agent', targetEntity: Assignment::class)]
    private Collection $assignments;

    #[ORM\OneToMany(mappedBy: 'agent', targetEntity: Presence::class)]
    private Collection $presences;

    #[ORM\OneToMany(mappedBy: 'agent', targetEntity: Timesheet::class)]
    private Collection $timesheets;

    #[ORM\OneToMany(mappedBy: 'agent', targetEntity: Round::class)]
    private Collection $rounds;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: Notification::class)]
    private Collection $notifications;

    #[ORM\OneToMany(mappedBy: 'validator', targetEntity: Presence::class)]
    private Collection $validatedPresences;

    #[ORM\OneToMany(mappedBy: 'supervisor', targetEntity: Round::class)]
    private Collection $supervisedRounds;

    #[ORM\OneToMany(mappedBy: 'reporter', targetEntity: Incident::class)]
    private Collection $reportedIncidents;

    #[ORM\OneToMany(mappedBy: 'assignedTo', targetEntity: Incident::class)]
    private Collection $assignedIncidents;

    #[ORM\OneToMany(mappedBy: 'user', targetEntity: ActivityLog::class)]
    private Collection $activityLogs;

    // ============================================================
    // Constructeur
    // ============================================================

    public function __construct()
    {
        $this->assignments = new ArrayCollection();
        $this->presences = new ArrayCollection();
        $this->timesheets = new ArrayCollection();
        $this->rounds = new ArrayCollection();
        $this->notifications = new ArrayCollection();
        $this->validatedPresences = new ArrayCollection();
        $this->supervisedRounds = new ArrayCollection();
        $this->reportedIncidents = new ArrayCollection();
        $this->assignedIncidents = new ArrayCollection();
        $this->activityLogs = new ArrayCollection();
    }

    // ============================================================
    // Lifecycle Callbacks
    // ============================================================

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    // ============================================================
    // Implémentation de UserInterface
    // ============================================================

    /**
     * Retourne les rôles Symfony avec hiérarchie
     * Un SUPERVISEUR a aussi les rôles CONTROLEUR, AGENT, GUEST
     */
    public function getRoles(): array
    {
        $roles = [];
        $userLevel = self::ROLE_HIERARCHY[$this->role] ?? 0;

        foreach (self::ROLE_HIERARCHY as $roleName => $level) {
            if ($level <= $userLevel) {
                $roles[] = self::ROLE_SYMFONY_MAPPING[$roleName];
            }
        }

        if (empty($roles)) {
            $roles[] = 'ROLE_GUEST';
        }

        return array_unique($roles);
    }

    /**
     * Efface les données sensibles temporaires
     * Appelé après l'authentification pour nettoyer la mémoire
     */
    public function eraseCredentials(): void
    {
        $this->plainPassword = null;
        $this->plainPinCode = null;
    }

    /**
     * Retourne l'identifiant unique de l'utilisateur
     */
    public function getUserIdentifier(): string
    {
        return $this->email;
    }

    // ============================================================
    // Méthodes de vérification des rôles
    // ============================================================

    /**
     * Vérifie si l'utilisateur a au moins le rôle spécifié
     */
    public function hasRole(string $role): bool
    {
        $requiredLevel = self::ROLE_HIERARCHY[$role] ?? 0;
        $userLevel = self::ROLE_HIERARCHY[$this->role] ?? 0;
        return $userLevel >= $requiredLevel;
    }

    public function isGuest(): bool
    {
        return $this->role === self::ROLE_GUEST || $this->hasRole(self::ROLE_GUEST);
    }

    public function isAgent(): bool
    {
        return $this->hasRole(self::ROLE_AGENT);
    }

    public function isControleur(): bool
    {
        return $this->hasRole(self::ROLE_CONTROLEUR);
    }

    public function isSuperviseur(): bool
    {
        return $this->hasRole(self::ROLE_SUPERVISEUR);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPERADMIN;
    }

    public function getRoleLevel(): int
    {
        return self::ROLE_HIERARCHY[$this->role] ?? 0;
    }

    // ============================================================
    // Méthodes de permissions métier
    // ============================================================

    public function canValidatePresence(): bool
    {
        return $this->hasRole(self::ROLE_CONTROLEUR);
    }

    public function canManageAssignments(): bool
    {
        return $this->hasRole(self::ROLE_SUPERVISEUR);
    }

    public function canManageUsers(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function canViewFinancials(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function canManageSystem(): bool
    {
        return $this->isSuperAdmin();
    }

    public function canCreateIncident(): bool
    {
        return $this->isAgent();
    }

    public function canViewAllPresences(): bool
    {
        return $this->isControleur();
    }

    public function canExportData(): bool
    {
        return $this->isSuperviseur();
    }

    // ============================================================
    // Getters et Setters
    // ============================================================

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = strtolower($email);
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): self
    {
        $this->plainPassword = $plainPassword;
        return $this;
    }

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(?string $firstName): self
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function setLastName(?string $lastName): self
    {
        $this->lastName = $lastName;
        return $this;
    }

    #[Groups(['user:read', 'user:list'])]
    #[SerializedName('fullName')]
    public function getFullName(): string
    {
        $parts = array_filter([$this->firstName, $this->lastName]);
        return !empty($parts) ? implode(' ', $parts) : $this->email;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(string $role): self
    {
        if (!in_array($role, self::AVAILABLE_ROLES)) {
            throw new \InvalidArgumentException(sprintf('Rôle invalide : %s', $role));
        }
        $this->role = $role;
        return $this;
    }

    public function getHourlyRate(): ?string
    {
        return $this->hourlyRate;
    }

    public function setHourlyRate(?string $hourlyRate): self
    {
        $this->hourlyRate = $hourlyRate;
        return $this;
    }

    public function getHourlyRateFloat(): float
    {
        return (float) $this->hourlyRate;
    }

    public function getPinCode(): ?string
    {
        return $this->pinCode;
    }

    public function setPinCode(?string $pinCode): self
    {
        $this->pinCode = $pinCode;
        return $this;
    }

    public function getPlainPinCode(): ?string
    {
        return $this->plainPinCode;
    }

    public function setPlainPinCode(?string $plainPinCode): self
    {
        $this->plainPinCode = $plainPinCode;
        return $this;
    }

    public function hasPinCode(): bool
    {
        return !empty($this->pinCode);
    }

    public function verifyPinCode(string $pinCode): bool
    {
        return $this->pinCode === $pinCode;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): self
    {
        $this->phone = $phone;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getLastLoginAt(): ?\DateTimeImmutable
    {
        return $this->lastLoginAt;
    }

    public function setLastLoginAt(?\DateTimeImmutable $lastLoginAt): self
    {
        $this->lastLoginAt = $lastLoginAt;
        return $this;
    }

    public function updateLastLogin(): self
    {
        $this->lastLoginAt = new \DateTimeImmutable();
        return $this;
    }

    // ============================================================
    // Getters pour les collections
    // ============================================================

    public function getAssignments(): Collection
    {
        return $this->assignments;
    }

    public function getActiveAssignments(): Collection
    {
        return $this->assignments->filter(fn(Assignment $a) => $a->getStatus() === 'ACTIVE');
    }

    public function getPresences(): Collection
    {
        return $this->presences;
    }

    public function getTimesheets(): Collection
    {
        return $this->timesheets;
    }

    public function getRounds(): Collection
    {
        return $this->rounds;
    }

    public function getNotifications(): Collection
    {
        return $this->notifications;
    }

    public function getUnreadNotifications(): Collection
    {
        return $this->notifications->filter(fn(Notification $n) => !$n->isRead());
    }

    public function getUnreadNotificationsCount(): int
    {
        return $this->getUnreadNotifications()->count();
    }

    public function getValidatedPresences(): Collection
    {
        return $this->validatedPresences;
    }

    public function getSupervisedRounds(): Collection
    {
        return $this->supervisedRounds;
    }

    public function getReportedIncidents(): Collection
    {
        return $this->reportedIncidents;
    }

    public function getAssignedIncidents(): Collection
    {
        return $this->assignedIncidents;
    }

    public function getActivityLogs(): Collection
    {
        return $this->activityLogs;
    }

    // ============================================================
    // Méthodes d'ajout/suppression pour les collections
    // ============================================================

    public function addAssignment(Assignment $assignment): self
    {
        if (!$this->assignments->contains($assignment)) {
            $this->assignments[] = $assignment;
            $assignment->setAgent($this);
        }
        return $this;
    }

    public function removeAssignment(Assignment $assignment): self
    {
        if ($this->assignments->removeElement($assignment)) {
            if ($assignment->getAgent() === $this) {
                $assignment->setAgent(null);
            }
        }
        return $this;
    }

    public function addNotification(Notification $notification): self
    {
        if (!$this->notifications->contains($notification)) {
            $this->notifications[] = $notification;
            $notification->setUser($this);
        }
        return $this;
    }

    public function removeNotification(Notification $notification): self
    {
        if ($this->notifications->removeElement($notification)) {
            if ($notification->getUser() === $this) {
                $notification->setUser(null);
            }
        }
        return $this;
    }
    

    // ============================================================
    // Sérialisation
    // ============================================================

    public function toArray(bool $includeSensitive = false): array
    {
        $data = [
            'id' => $this->id,
            'email' => $this->email,
            'firstName' => $this->firstName,
            'lastName' => $this->lastName,
            'fullName' => $this->getFullName(),
            'role' => $this->role,
            'roleLevel' => $this->getRoleLevel(),
            'phone' => $this->phone,
            'isActive' => $this->isActive,
            'hasPinCode' => $this->hasPinCode(),
            'lastLoginAt' => $this->lastLoginAt?->format('c'),
            'createdAt' => $this->createdAt?->format('c'),
            'unreadNotifications' => $this->getUnreadNotificationsCount(),
            'permissions' => [
                'canValidatePresence' => $this->canValidatePresence(),
                'canManageAssignments' => $this->canManageAssignments(),
                'canManageUsers' => $this->canManageUsers(),
                'canViewFinancials' => $this->canViewFinancials(),
                'canManageSystem' => $this->canManageSystem(),
                'canCreateIncident' => $this->canCreateIncident(),
                'canExportData' => $this->canExportData(),
            ]
        ];

        if ($includeSensitive) {
            $data['hourlyRate'] = $this->getHourlyRateFloat();
        }

        return $data;
    }

    public function __toString(): string
    {
        return $this->getFullName();
    }
}
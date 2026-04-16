<?php
// src/Entity/ActivityLog.php

namespace App\Entity;

use App\Repository\ActivityLogRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\Request;

#[ORM\Entity(repositoryClass: ActivityLogRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_user_id', columns: ['user_id'])]
#[ORM\Index(name: 'idx_action_type', columns: ['action_type'])]
#[ORM\Index(name: 'idx_entity_type', columns: ['entity_type'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
#[ORM\Index(name: 'idx_status', columns: ['status'])]
class ActivityLog
{
    // Constantes d'action
    public const ACTION_LOGIN = 'LOGIN';
    public const ACTION_LOGOUT = 'LOGOUT';
    public const ACTION_LOGIN_FAILED = 'LOGIN_FAILED';
    public const ACTION_PASSWORD_CHANGE = 'PASSWORD_CHANGE';
    public const ACTION_PIN_VERIFICATION = 'PIN_VERIFICATION';
    
    public const ACTION_CREATE = 'CREATE';
    public const ACTION_UPDATE = 'UPDATE';
    public const ACTION_DELETE = 'DELETE';
    public const ACTION_VIEW = 'VIEW';
    public const ACTION_EXPORT = 'EXPORT';
    
    public const ACTION_CHECK_IN = 'CHECK_IN';
    public const ACTION_CHECK_OUT = 'CHECK_OUT';
    public const ACTION_VALIDATE_PRESENCE = 'VALIDATE_PRESENCE';
    public const ACTION_REJECT_PRESENCE = 'REJECT_PRESENCE';
    
    public const ACTION_START_ROUND = 'START_ROUND';
    public const ACTION_COMPLETE_ROUND = 'COMPLETE_ROUND';
    public const ACTION_VISIT_SITE = 'VISIT_SITE';
    
    public const ACTION_CREATE_INCIDENT = 'CREATE_INCIDENT';
    public const ACTION_RESOLVE_INCIDENT = 'RESOLVE_INCIDENT';
    public const ACTION_ESCALATE_INCIDENT = 'ESCALATE_INCIDENT';
    
    public const ACTION_ARCHIVE_SITE = 'ARCHIVE_SITE';
    public const ACTION_RESTORE_SITE = 'RESTORE_SITE';
    
    public const ACTION_SWITCH_AGENTS = 'SWITCH_AGENTS';
    public const ACTION_ASSIGN_AGENT = 'ASSIGN_AGENT';
    
    public const ACTION_GENERATE_REPORT = 'GENERATE_REPORT';
    public const ACTION_DOWNLOAD_REPORT = 'DOWNLOAD_REPORT';
    
    public const ACTION_SYNC_OFFLINE_DATA = 'SYNC_OFFLINE_DATA';
    public const ACTION_RESOLVE_CONFLICT = 'RESOLVE_CONFLICT';
    
    public const ACTION_CHANGE_SETTINGS = 'CHANGE_SETTINGS';
    public const ACTION_UPLOAD_LOGO = 'UPLOAD_LOGO';

    // Constantes d'entité
    public const ENTITY_USER = 'USER';
    public const ENTITY_CLIENT = 'CLIENT';
    public const ENTITY_SITE = 'SITE';
    public const ENTITY_ASSIGNMENT = 'ASSIGNMENT';
    public const ENTITY_PRESENCE = 'PRESENCE';
    public const ENTITY_ROUND = 'ROUND';
    public const ENTITY_INCIDENT = 'INCIDENT';
    public const ENTITY_REPORT = 'REPORT';
    public const ENTITY_SETTINGS = 'SETTINGS';
    public const ENTITY_SYNC_QUEUE = 'SYNC_QUEUE';
    public const ENTITY_CONFLICT = 'CONFLICT';
    public const ENTITY_AUDIT = 'AUDIT';

    // Constantes de statut
    public const STATUS_SUCCESS = 'SUCCESS';
    public const STATUS_FAILED = 'FAILED';
    public const STATUS_PENDING = 'PENDING';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'activityLogs')]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $userEmail = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $userRole = null;

    #[ORM\Column(length: 50)]
    private ?string $actionType = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $entityType = null;

    #[ORM\Column(length: 36, nullable: true)]
    private ?string $entityId = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $details = null;

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $userAgent = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $sessionId = null;

    #[ORM\Column(length: 20, options: ['default' => self::STATUS_SUCCESS])]
    private string $status = self::STATUS_SUCCESS;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $errorMessage = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->status = self::STATUS_SUCCESS;
    }

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        if ($this->createdAt === null) {
            $this->createdAt = new \DateTimeImmutable();
        }
    }

    // ============================================================
    // Méthodes utilitaires
    // ============================================================

    /**
     * Remplit les informations utilisateur à partir d'un objet User
     */
    public function populateFromUser(User $user): self
    {
        $this->user = $user;
        $this->userEmail = $user->getEmail();
        $this->userRole = $user->getRoles()[0] ?? 'ROLE_USER';
        return $this;
    }

    /**
     * Remplit les informations de requête
     */
    public function populateFromRequest(?Request $request = null): self
    {
        if ($request) {
            $this->ipAddress = $request->getClientIp();
            $this->userAgent = $request->headers->get('User-Agent');
            if ($request->hasSession()) {
                $this->sessionId = $request->getSession()->getId();
            }
        }
        return $this;
    }

    /**
     * Retourne un résumé pour l'API
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user?->getId(),
            'userEmail' => $this->userEmail,
            'userRole' => $this->userRole,
            'action' => $this->actionType,
            'entity' => $this->entityType,
            'entityId' => $this->entityId,
            'details' => $this->details,
            'ipAddress' => $this->ipAddress,
            'userAgent' => $this->userAgent,
            'sessionId' => $this->sessionId,
            'status' => $this->status,
            'errorMessage' => $this->errorMessage,
            'createdAt' => $this->createdAt?->format('c'),
        ];
    }

    // ============================================================
    // Getters et Setters
    // ============================================================

    public function getId(): ?int { return $this->id; }
    
    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): self { $this->user = $user; return $this; }
    
    public function getUserEmail(): ?string { return $this->userEmail; }
    public function setUserEmail(?string $userEmail): self { $this->userEmail = $userEmail; return $this; }
    
    public function getUserRole(): ?string { return $this->userRole; }
    public function setUserRole(?string $userRole): self { $this->userRole = $userRole; return $this; }
    
    public function getActionType(): ?string { return $this->actionType; }
    public function setActionType(string $actionType): self { $this->actionType = $actionType; return $this; }
    
    public function getEntityType(): ?string { return $this->entityType; }
    public function setEntityType(?string $entityType): self { $this->entityType = $entityType; return $this; }
    
    public function getEntityId(): ?string { return $this->entityId; }
    public function setEntityId(?string $entityId): self { $this->entityId = $entityId; return $this; }
    
    public function getDetails(): ?array { return $this->details; }
    public function setDetails(?array $details): self { $this->details = $details; return $this; }
    
    public function getIpAddress(): ?string { return $this->ipAddress; }
    public function setIpAddress(?string $ipAddress): self { $this->ipAddress = $ipAddress; return $this; }
    
    public function getUserAgent(): ?string { return $this->userAgent; }
    public function setUserAgent(?string $userAgent): self { $this->userAgent = $userAgent; return $this; }
    
    public function getSessionId(): ?string { return $this->sessionId; }
    public function setSessionId(?string $sessionId): self { $this->sessionId = $sessionId; return $this; }
    
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    
    public function getErrorMessage(): ?string { return $this->errorMessage; }
    public function setErrorMessage(?string $errorMessage): self { $this->errorMessage = $errorMessage; return $this; }
    
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $createdAt): self { $this->createdAt = $createdAt; return $this; }
}
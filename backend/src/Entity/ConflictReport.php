<?php
// src/Entity/ConflictReport.php

namespace App\Entity;

use App\Repository\ConflictReportRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ConflictReportRepository::class)]
#[ORM\HasLifecycleCallbacks]
#[ORM\Index(name: 'idx_resolution', columns: ['resolution'])]
#[ORM\Index(name: 'idx_conflict_type', columns: ['conflict_type'])]
#[ORM\Index(name: 'idx_created_at', columns: ['created_at'])]
class ConflictReport
{
    public const TYPE_TIME_DRIFT = 'TIME_DRIFT';
    public const TYPE_FUTURE_OPERATION = 'FUTURE_OPERATION';
    public const TYPE_PAST_OPERATION = 'PAST_OPERATION';
    public const TYPE_FRAUD_SUSPICION = 'FRAUD_SUSPICION';
    public const TYPE_VALIDATION_FAILED = 'VALIDATION_FAILED';
    
    public const RESOLUTION_PENDING = 'PENDING';
    public const RESOLUTION_AUTO_RESOLVED = 'AUTO_RESOLVED';
    public const RESOLUTION_MANUAL_APPROVED = 'MANUAL_APPROVED';
    public const RESOLUTION_MANUAL_REJECTED = 'MANUAL_REJECTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?int $operationId = null;

    #[ORM\Column(type: 'json')]
    private array $operation = [];

    #[ORM\Column(length: 50)]
    private ?string $conflictType = null;

    #[ORM\Column(type: 'text')]
    private ?string $reason = null;

    #[ORM\Column(type: 'json')]
    private array $clientData = [];

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $serverState = null;

    #[ORM\Column(length: 30)]
    private string $resolution = self::RESOLUTION_PENDING;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $resolvedBy = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resolutionNote = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $developerNotes = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $syncedToServer = false;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    // Getters et Setters
    public function getId(): ?int { return $this->id; }
    
    public function getOperationId(): ?int { return $this->operationId; }
    public function setOperationId(int $operationId): self { $this->operationId = $operationId; return $this; }
    
    public function getOperation(): array { return $this->operation; }
    public function setOperation(array $operation): self { $this->operation = $operation; return $this; }
    
    public function getConflictType(): ?string { return $this->conflictType; }
    public function setConflictType(string $conflictType): self { $this->conflictType = $conflictType; return $this; }
    
    public function getReason(): ?string { return $this->reason; }
    public function setReason(string $reason): self { $this->reason = $reason; return $this; }
    
    public function getClientData(): array { return $this->clientData; }
    public function setClientData(array $clientData): self { $this->clientData = $clientData; return $this; }
    
    public function getServerState(): ?array { return $this->serverState; }
    public function setServerState(?array $serverState): self { $this->serverState = $serverState; return $this; }
    
    public function getResolution(): string { return $this->resolution; }
    public function setResolution(string $resolution): self { $this->resolution = $resolution; return $this; }
    
    public function getResolvedBy(): ?User { return $this->resolvedBy; }
    public function setResolvedBy(?User $resolvedBy): self { $this->resolvedBy = $resolvedBy; return $this; }
    
    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }
    public function setResolvedAt(?\DateTimeImmutable $resolvedAt): self { $this->resolvedAt = $resolvedAt; return $this; }
    
    public function getResolutionNote(): ?string { return $this->resolutionNote; }
    public function setResolutionNote(?string $resolutionNote): self { $this->resolutionNote = $resolutionNote; return $this; }
    
    public function getDeveloperNotes(): ?string { return $this->developerNotes; }
    public function setDeveloperNotes(?string $developerNotes): self { $this->developerNotes = $developerNotes; return $this; }
    
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    
    public function isSyncedToServer(): bool { return $this->syncedToServer; }
    public function setSyncedToServer(bool $syncedToServer): self { $this->syncedToServer = $syncedToServer; return $this; }
    
    /**
     * Résoudre le conflit
     */
    public function resolve(string $resolution, User $resolvedBy, ?string $note = null, ?string $developerNotes = null): self
    {
        $this->resolution = $resolution;
        $this->resolvedBy = $resolvedBy;
        $this->resolvedAt = new \DateTimeImmutable();
        $this->resolutionNote = $note;
        $this->developerNotes = $developerNotes;
        
        return $this;
    }
}
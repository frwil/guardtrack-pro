<?php

namespace App\Entity;

use App\Repository\RoundRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RoundRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Round
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'supervisedRounds')]
    private ?User $supervisor = null;

    #[ORM\ManyToOne(inversedBy: 'rounds')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $scheduledStart = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $scheduledEnd = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $actualStart = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $actualEnd = null;

    #[ORM\Column(length: 20, options: ['default' => 'PLANNED'])]
    private string $status = 'PLANNED';

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\OneToMany(mappedBy: 'round', targetEntity: RoundSite::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $roundSites;

    public function __construct()
    {
        $this->roundSites = new ArrayCollection();
    }

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
    // Méthodes utilitaires
    // ============================================================

    /**
     * Vérifie si tous les sites ont été visités
     */
    public function isFullyVisited(): bool
    {
        return $this->getUnvisitedSites()->isEmpty();
    }

    /**
     * Récupère les sites non encore visités
     */
    public function getUnvisitedSites(): Collection
    {
        return $this->roundSites->filter(fn(RoundSite $rs) => $rs->getVisitedAt() === null);
    }

    /**
     * Récupère les sites déjà visités
     */
    public function getVisitedSites(): Collection
    {
        return $this->roundSites->filter(fn(RoundSite $rs) => $rs->getVisitedAt() !== null);
    }

    /**
     * Calcule la progression de la ronde (en pourcentage)
     */
    public function getProgress(): int
    {
        $total = $this->roundSites->count();
        if ($total === 0) {
            return 0;
        }
        
        $visited = $this->getVisitedSites()->count();
        return (int) round(($visited / $total) * 100);
    }

    /**
     * Récupère les visites validées
     */
    public function getValidatedSites(): Collection
    {
        return $this->roundSites->filter(fn(RoundSite $rs) => $rs->isValidated());
    }

    /**
     * Récupère les visites en attente de validation
     */
    public function getPendingValidationSites(): Collection
    {
        return $this->roundSites->filter(fn(RoundSite $rs) => 
            $rs->getVisitedAt() !== null && !$rs->isValidated()
        );
    }

    /**
     * Vérifie si la ronde peut être démarrée
     */
    public function canBeStarted(): bool
    {
        return $this->status === 'PLANNED';
    }

    /**
     * Vérifie si la ronde peut être complétée
     */
    public function canBeCompleted(): bool
    {
        return $this->status === 'IN_PROGRESS' && $this->isFullyVisited();
    }

    /**
     * Vérifie si la ronde est active
     */
    public function isActive(): bool
    {
        return in_array($this->status, ['PLANNED', 'IN_PROGRESS']);
    }

    /**
     * Retourne un résumé de la ronde
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status,
            'progress' => $this->getProgress(),
            'sitesTotal' => $this->roundSites->count(),
            'sitesVisited' => $this->getVisitedSites()->count(),
            'sitesValidated' => $this->getValidatedSites()->count(),
            'isFullyVisited' => $this->isFullyVisited(),
        ];
    }

    // ============================================================
    // Getters et Setters
    // ============================================================

    public function getId(): ?int { return $this->id; }
    
    public function getSupervisor(): ?User { return $this->supervisor; }
    public function setSupervisor(?User $supervisor): self { $this->supervisor = $supervisor; return $this; }
    
    public function getAgent(): ?User { return $this->agent; }
    public function setAgent(?User $agent): self { $this->agent = $agent; return $this; }
    
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    
    public function getScheduledStart(): ?\DateTimeImmutable { return $this->scheduledStart; }
    public function setScheduledStart(\DateTimeImmutable $scheduledStart): self { $this->scheduledStart = $scheduledStart; return $this; }
    
    public function getScheduledEnd(): ?\DateTimeImmutable { return $this->scheduledEnd; }
    public function setScheduledEnd(?\DateTimeImmutable $scheduledEnd): self { $this->scheduledEnd = $scheduledEnd; return $this; }
    
    public function getActualStart(): ?\DateTimeImmutable { return $this->actualStart; }
    public function setActualStart(?\DateTimeImmutable $actualStart): self { $this->actualStart = $actualStart; return $this; }
    
    public function getActualEnd(): ?\DateTimeImmutable { return $this->actualEnd; }
    public function setActualEnd(?\DateTimeImmutable $actualEnd): self { $this->actualEnd = $actualEnd; return $this; }
    
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    
    public function getRoundSites(): Collection { return $this->roundSites; }
    
    public function addRoundSite(RoundSite $roundSite): self 
    { 
        if (!$this->roundSites->contains($roundSite)) { 
            $this->roundSites[] = $roundSite; 
            $roundSite->setRound($this); 
        } 
        return $this; 
    }
    
    public function removeRoundSite(RoundSite $roundSite): self 
    { 
        if ($this->roundSites->removeElement($roundSite)) { 
            if ($roundSite->getRound() === $this) { 
                $roundSite->setRound(null); 
            } 
        } 
        return $this; 
    }
}
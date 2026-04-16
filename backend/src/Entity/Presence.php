<?php

namespace App\Entity;

use App\Repository\PresenceRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PresenceRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Presence
{
    // Constantes de statut
    public const STATUS_PENDING = 'PENDING';
    public const STATUS_VALIDATED = 'VALIDATED';
    public const STATUS_REJECTED = 'REJECTED';
    public const STATUS_DISPUTED = 'DISPUTED';
    public const STATUS_RESOLVED = 'RESOLVED';

    // Constantes de verdict du contrôleur
    public const VERDICT_PRESENT = 'PRESENT';
    public const VERDICT_ABSENT = 'ABSENT';

    // Constantes de résolution
    public const RESOLUTION_PENDING = 'PENDING';
    public const RESOLUTION_RESOLVED = 'RESOLVED';
    public const RESOLUTION_DISPUTED = 'DISPUTED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'presences')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\ManyToOne(inversedBy: 'presences')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Site $site = null;

    #[ORM\ManyToOne(inversedBy: 'validatedPresences')]
    private ?User $validator = null;

    #[ORM\ManyToOne(inversedBy: 'presences')]
    private ?Assignment $assignment = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $checkIn = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $checkOut = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 8, nullable: true)]
    private ?string $gpsLatitude = null;

    #[ORM\Column(type: 'decimal', precision: 11, scale: 8, nullable: true)]
    private ?string $gpsLongitude = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $photo = null;

    #[ORM\Column(length: 20, options: ['default' => self::STATUS_PENDING])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $validationDate = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $rejectionReason = null;

    #[ORM\Column(nullable: true, options: ['default' => 0])]
    private ?int $suspicionScore = 0;

    // ============================================================
    // NOUVEAUX CHAMPS POUR LE CONTRÔLEUR
    // ============================================================

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $controllerVerdict = null; // PRESENT, ABSENT

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $absenceReason = null; // CONGE, MALADIE, RETARD, ABSENCE_INJUSTIFIEE, INCONNUE, AUTRE

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $controllerComment = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $controllerValidationAt = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $controller = null; // Le contrôleur qui a fait la visite

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $controllerPhotoAnalysis = null; // Résultat analyse IA de la photo du contrôleur

    #[ORM\Column(nullable: true)]
    private ?int $controllerDistanceFromSite = null; // Distance calculée en mètres

    #[ORM\Column(length: 20, options: ['default' => self::RESOLUTION_PENDING])]
    private string $resolutionStatus = self::RESOLUTION_PENDING; // PENDING, RESOLVED, DISPUTED

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true)]
    private ?User $resolvedBy = null; // Superviseur/Admin qui a tranché le litige

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resolutionNote = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    // Liens avec les rondes
    #[ORM\ManyToOne(inversedBy: 'validatedPresences')]
    #[ORM\JoinColumn(nullable: true)]
    private ?RoundSite $roundSite = null; // La visite du contrôleur qui a validé cette présence

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

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
    // Méthodes métier
    // ============================================================

    /**
     * Vérifie si cette présence est en litige
     */
    public function isDisputed(): bool
    {
        return $this->status === self::STATUS_DISPUTED || $this->resolutionStatus === self::RESOLUTION_DISPUTED;
    }

    /**
     * Vérifie si le contrôleur a confirmé la présence
     */
    public function isControllerConfirmed(): bool
    {
        return $this->controllerVerdict === self::VERDICT_PRESENT;
    }

    /**
     * Vérifie si le contrôleur a infirmé la présence
     */
    public function isControllerDenied(): bool
    {
        return $this->controllerVerdict === self::VERDICT_ABSENT;
    }

    /**
     * Détermine s'il y a un conflit entre l'agent et le contrôleur
     */
    public function hasConflict(): bool
    {
        // Si l'agent a déclaré une présence (checkIn existe)
        $agentDeclaredPresent = $this->checkIn !== null;
        
        // Si le contrôleur a donné un verdict
        if ($this->controllerVerdict === null) {
            return false;
        }
        
        $controllerSaysPresent = $this->controllerVerdict === self::VERDICT_PRESENT;
        
        // Conflit si les avis divergent
        return $agentDeclaredPresent !== $controllerSaysPresent;
    }

    /**
     * Résoudre le litige
     */
    public function resolve(User $resolvedBy, string $resolution, ?string $note = null): self
    {
        $this->resolvedBy = $resolvedBy;
        $this->resolutionNote = $note;
        $this->resolvedAt = new \DateTimeImmutable();
        
        if ($resolution === 'AGENT_WINS') {
            $this->status = self::STATUS_VALIDATED;
            $this->resolutionStatus = self::RESOLUTION_RESOLVED;
        } elseif ($resolution === 'CONTROLLER_WINS') {
            $this->status = self::STATUS_REJECTED;
            $this->resolutionStatus = self::RESOLUTION_RESOLVED;
        } else {
            $this->resolutionStatus = self::RESOLUTION_RESOLVED;
        }
        
        return $this;
    }

    /**
     * Appliquer le verdict du contrôleur
     */
    public function applyControllerVerdict(User $controller, string $verdict, ?string $absenceReason = null, ?string $comment = null): self
    {
        $this->controller = $controller;
        $this->controllerVerdict = $verdict;
        $this->absenceReason = $absenceReason;
        $this->controllerComment = $comment;
        $this->controllerValidationAt = new \DateTimeImmutable();
        
        // Mettre à jour le statut selon le verdict
        if ($verdict === self::VERDICT_PRESENT) {
            if ($this->status === self::STATUS_PENDING) {
                $this->status = self::STATUS_VALIDATED;
                $this->validator = $controller;
                $this->validationDate = new \DateTimeImmutable();
            }
        } elseif ($verdict === self::VERDICT_ABSENT) {
            if ($this->status === self::STATUS_VALIDATED) {
                // Litige : l'agent était validé mais le contrôleur dit absent
                $this->status = self::STATUS_DISPUTED;
                $this->resolutionStatus = self::RESOLUTION_DISPUTED;
            } else {
                $this->status = self::STATUS_REJECTED;
                $this->rejectionReason = $absenceReason ?? 'Absence constatée par le contrôleur';
            }
        }
        
        return $this;
    }

    /**
     * Retourne un résumé pour l'affichage
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'agent' => $this->agent?->getFullName(),
            'site' => $this->site?->getName(),
            'checkIn' => $this->checkIn?->format('c'),
            'status' => $this->status,
            'controllerVerdict' => $this->controllerVerdict,
            'hasConflict' => $this->hasConflict(),
            'isDisputed' => $this->isDisputed(),
        ];
    }

    // ============================================================
    // Getters et Setters
    // ============================================================

    public function getId(): ?int { return $this->id; }
    
    public function getAgent(): ?User { return $this->agent; }
    public function setAgent(?User $agent): self { $this->agent = $agent; return $this; }
    
    public function getSite(): ?Site { return $this->site; }
    public function setSite(?Site $site): self { $this->site = $site; return $this; }
    
    public function getValidator(): ?User { return $this->validator; }
    public function setValidator(?User $validator): self { $this->validator = $validator; return $this; }
    
    public function getAssignment(): ?Assignment { return $this->assignment; }
    public function setAssignment(?Assignment $assignment): self { $this->assignment = $assignment; return $this; }
    
    public function getCheckIn(): ?\DateTimeImmutable { return $this->checkIn; }
    public function setCheckIn(\DateTimeImmutable $checkIn): self { $this->checkIn = $checkIn; return $this; }
    
    public function getCheckOut(): ?\DateTimeImmutable { return $this->checkOut; }
    public function setCheckOut(?\DateTimeImmutable $checkOut): self { $this->checkOut = $checkOut; return $this; }
    
    public function getGpsLatitude(): ?string { return $this->gpsLatitude; }
    public function setGpsLatitude(?string $gpsLatitude): self { $this->gpsLatitude = $gpsLatitude; return $this; }
    
    public function getGpsLongitude(): ?string { return $this->gpsLongitude; }
    public function setGpsLongitude(?string $gpsLongitude): self { $this->gpsLongitude = $gpsLongitude; return $this; }
    
    public function getPhoto(): ?string { return $this->photo; }
    public function setPhoto(?string $photo): self { $this->photo = $photo; return $this; }
    
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    
    public function getValidationDate(): ?\DateTimeImmutable { return $this->validationDate; }
    public function setValidationDate(?\DateTimeImmutable $validationDate): self { $this->validationDate = $validationDate; return $this; }
    
    public function getRejectionReason(): ?string { return $this->rejectionReason; }
    public function setRejectionReason(?string $rejectionReason): self { $this->rejectionReason = $rejectionReason; return $this; }
    
    public function getSuspicionScore(): ?int { return $this->suspicionScore; }
    public function setSuspicionScore(?int $suspicionScore): self { $this->suspicionScore = $suspicionScore; return $this; }
    
    // Nouveaux getters/setters
    public function getControllerVerdict(): ?string { return $this->controllerVerdict; }
    public function setControllerVerdict(?string $controllerVerdict): self { $this->controllerVerdict = $controllerVerdict; return $this; }
    
    public function getAbsenceReason(): ?string { return $this->absenceReason; }
    public function setAbsenceReason(?string $absenceReason): self { $this->absenceReason = $absenceReason; return $this; }
    
    public function getControllerComment(): ?string { return $this->controllerComment; }
    public function setControllerComment(?string $controllerComment): self { $this->controllerComment = $controllerComment; return $this; }
    
    public function getControllerValidationAt(): ?\DateTimeImmutable { return $this->controllerValidationAt; }
    public function setControllerValidationAt(?\DateTimeImmutable $controllerValidationAt): self { $this->controllerValidationAt = $controllerValidationAt; return $this; }
    
    public function getController(): ?User { return $this->controller; }
    public function setController(?User $controller): self { $this->controller = $controller; return $this; }
    
    public function getControllerPhotoAnalysis(): ?array { return $this->controllerPhotoAnalysis; }
    public function setControllerPhotoAnalysis(?array $controllerPhotoAnalysis): self { $this->controllerPhotoAnalysis = $controllerPhotoAnalysis; return $this; }
    
    public function getControllerDistanceFromSite(): ?int { return $this->controllerDistanceFromSite; }
    public function setControllerDistanceFromSite(?int $controllerDistanceFromSite): self { $this->controllerDistanceFromSite = $controllerDistanceFromSite; return $this; }
    
    public function getResolutionStatus(): string { return $this->resolutionStatus; }
    public function setResolutionStatus(string $resolutionStatus): self { $this->resolutionStatus = $resolutionStatus; return $this; }
    
    public function getResolvedBy(): ?User { return $this->resolvedBy; }
    public function setResolvedBy(?User $resolvedBy): self { $this->resolvedBy = $resolvedBy; return $this; }
    
    public function getResolutionNote(): ?string { return $this->resolutionNote; }
    public function setResolutionNote(?string $resolutionNote): self { $this->resolutionNote = $resolutionNote; return $this; }
    
    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }
    public function setResolvedAt(?\DateTimeImmutable $resolvedAt): self { $this->resolvedAt = $resolvedAt; return $this; }
    
    public function getRoundSite(): ?RoundSite { return $this->roundSite; }
    public function setRoundSite(?RoundSite $roundSite): self { $this->roundSite = $roundSite; return $this; }
    
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
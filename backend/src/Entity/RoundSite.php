<?php

namespace App\Entity;

use App\Repository\RoundSiteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RoundSiteRepository::class)]
#[ORM\Table(name: 'round_site')]
class RoundSite
{
    // Constantes pour le statut de présence de l'agent
    public const AGENT_PRESENT = 'PRESENT';
    public const AGENT_ABSENT = 'ABSENT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'roundSites')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Round $round = null;

    #[ORM\ManyToOne(inversedBy: 'roundSites')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Site $site = null;

    #[ORM\Column]
    private ?int $visitOrder = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $visitedAt = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 8, nullable: true)]
    private ?string $gpsLatitude = null;

    #[ORM\Column(type: 'decimal', precision: 11, scale: 8, nullable: true)]
    private ?string $gpsLongitude = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $photo = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $qrCodeScanned = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $pinEntered = false;

    // ============================================================
    // NOUVEAUX CHAMPS POUR LA VISITE DU CONTRÔLEUR
    // ============================================================

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $agentPresenceStatus = null; // PRESENT, ABSENT

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $absenceReason = null; // CONGE, MALADIE, RETARD, ABSENCE_INJUSTIFIEE, INCONNUE, AUTRE

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $comments = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $photoAnalysis = null; // Résultat de l'analyse IA de la photo

    #[ORM\Column(nullable: true)]
    private ?int $distanceFromSite = null; // Distance calculée en mètres

    #[ORM\Column(options: ['default' => false])]
    private bool $isValidated = false; // La visite a été complètement validée

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $validatedAt = null;

    // ============================================================
    // RELATIONS
    // ============================================================

    #[ORM\OneToMany(mappedBy: 'roundSite', targetEntity: Presence::class)]
    private Collection $validatedPresences;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->validatedPresences = new ArrayCollection();
    }

    // ============================================================
    // Méthodes métier
    // ============================================================

    /**
     * Vérifie si la visite est complète (toutes les étapes validées)
     */
    public function isComplete(): bool
    {
        return $this->visitedAt !== null
            && $this->qrCodeScanned
            && $this->pinEntered
            && $this->photo !== null
            && $this->agentPresenceStatus !== null;
    }

    /**
     * Valider définitivement la visite
     */
    public function validate(): self
    {
        $this->isValidated = true;
        $this->validatedAt = new \DateTimeImmutable();
        return $this;
    }

    /**
     * Ajouter une présence validée par cette visite
     */
    public function addValidatedPresence(Presence $presence): self
    {
        if (!$this->validatedPresences->contains($presence)) {
            $this->validatedPresences[] = $presence;
            $presence->setRoundSite($this);
        }
        return $this;
    }

    /**
     * Retirer une présence validée
     */
    public function removeValidatedPresence(Presence $presence): self
    {
        if ($this->validatedPresences->removeElement($presence)) {
            if ($presence->getRoundSite() === $this) {
                $presence->setRoundSite(null);
            }
        }
        return $this;
    }

    /**
     * Obtenir un résumé de la visite
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'site' => $this->site?->getName(),
            'visitOrder' => $this->visitOrder,
            'visitedAt' => $this->visitedAt?->format('c'),
            'agentPresenceStatus' => $this->agentPresenceStatus,
            'qrCodeScanned' => $this->qrCodeScanned,
            'pinEntered' => $this->pinEntered,
            'hasPhoto' => $this->photo !== null,
            'isComplete' => $this->isComplete(),
            'isValidated' => $this->isValidated,
            'distanceFromSite' => $this->distanceFromSite,
        ];
    }

    // ============================================================
    // Getters et Setters
    // ============================================================

    public function getId(): ?int { return $this->id; }

    public function getRound(): ?Round { return $this->round; }
    public function setRound(?Round $round): self { $this->round = $round; return $this; }

    public function getSite(): ?Site { return $this->site; }
    public function setSite(?Site $site): self { $this->site = $site; return $this; }

    public function getVisitOrder(): ?int { return $this->visitOrder; }
    public function setVisitOrder(int $visitOrder): self { $this->visitOrder = $visitOrder; return $this; }

    public function getVisitedAt(): ?\DateTimeImmutable { return $this->visitedAt; }
    public function setVisitedAt(?\DateTimeImmutable $visitedAt): self { $this->visitedAt = $visitedAt; return $this; }

    public function getGpsLatitude(): ?string { return $this->gpsLatitude; }
    public function setGpsLatitude(?string $gpsLatitude): self { $this->gpsLatitude = $gpsLatitude; return $this; }

    public function getGpsLongitude(): ?string { return $this->gpsLongitude; }
    public function setGpsLongitude(?string $gpsLongitude): self { $this->gpsLongitude = $gpsLongitude; return $this; }

    public function getPhoto(): ?string { return $this->photo; }
    public function setPhoto(?string $photo): self { $this->photo = $photo; return $this; }

    public function isQrCodeScanned(): bool { return $this->qrCodeScanned; }
    public function setQrCodeScanned(bool $qrCodeScanned): self { $this->qrCodeScanned = $qrCodeScanned; return $this; }

    public function isPinEntered(): bool { return $this->pinEntered; }
    public function setPinEntered(bool $pinEntered): self { $this->pinEntered = $pinEntered; return $this; }

    // Nouveaux getters/setters
    public function getAgentPresenceStatus(): ?string { return $this->agentPresenceStatus; }
    public function setAgentPresenceStatus(?string $agentPresenceStatus): self { $this->agentPresenceStatus = $agentPresenceStatus; return $this; }

    public function getAbsenceReason(): ?string { return $this->absenceReason; }
    public function setAbsenceReason(?string $absenceReason): self { $this->absenceReason = $absenceReason; return $this; }

    public function getComments(): ?string { return $this->comments; }
    public function setComments(?string $comments): self { $this->comments = $comments; return $this; }

    public function getPhotoAnalysis(): ?array { return $this->photoAnalysis; }
    public function setPhotoAnalysis(?array $photoAnalysis): self { $this->photoAnalysis = $photoAnalysis; return $this; }

    public function getDistanceFromSite(): ?int { return $this->distanceFromSite; }
    public function setDistanceFromSite(?int $distanceFromSite): self { $this->distanceFromSite = $distanceFromSite; return $this; }

    public function isValidated(): bool { return $this->isValidated; }
    public function setIsValidated(bool $isValidated): self { $this->isValidated = $isValidated; return $this; }

    public function getValidatedAt(): ?\DateTimeImmutable { return $this->validatedAt; }
    public function setValidatedAt(?\DateTimeImmutable $validatedAt): self { $this->validatedAt = $validatedAt; return $this; }

    public function getValidatedPresences(): Collection { return $this->validatedPresences; }

    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
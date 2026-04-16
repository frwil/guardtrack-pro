<?php

namespace App\Entity;

use App\Repository\SiteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SiteRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Site
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'sites')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Client $client = null;

    #[ORM\ManyToOne(targetEntity: self::class, inversedBy: 'children')]
    private ?self $parent = null;

    #[ORM\OneToMany(mappedBy: 'parent', targetEntity: self::class)]
    private Collection $children;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: 'text')]
    private ?string $address = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 8, nullable: true)]
    private ?string $latitude = null;

    #[ORM\Column(type: 'decimal', precision: 11, scale: 8, nullable: true)]
    private ?string $longitude = null;

    #[ORM\Column(length: 255, nullable: true, unique: true)]
    private ?string $qrCode = null;

    #[ORM\Column(length: 20)]
    private ?string $type = null;

    #[ORM\Column(nullable: true, options: ['default' => 100])]
    private ?int $geofencingRadius = 100;

    #[ORM\Column(options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\OneToMany(mappedBy: 'site', targetEntity: Assignment::class)]
    private Collection $assignments;

    #[ORM\OneToMany(mappedBy: 'site', targetEntity: Presence::class)]
    private Collection $presences;

    #[ORM\OneToMany(mappedBy: 'site', targetEntity: Timesheet::class)]
    private Collection $timesheets;

    #[ORM\OneToMany(mappedBy: 'site', targetEntity: RoundSite::class)]
    private Collection $roundSites;

    #[ORM\OneToMany(mappedBy: 'site', targetEntity: Incident::class)]
    private Collection $incidents;

    public function __construct()
    {
        $this->children = new ArrayCollection();
        $this->assignments = new ArrayCollection();
        $this->presences = new ArrayCollection();
        $this->timesheets = new ArrayCollection();
        $this->roundSites = new ArrayCollection();
        $this->incidents = new ArrayCollection();
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

    public function getId(): ?int { return $this->id; }
    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): self { $this->client = $client; return $this; }
    public function getParent(): ?self { return $this->parent; }
    public function setParent(?self $parent): self { $this->parent = $parent; return $this; }
    public function getChildren(): Collection { return $this->children; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(string $address): self { $this->address = $address; return $this; }
    public function getLatitude(): ?string { return $this->latitude; }
    public function setLatitude(?string $latitude): self { $this->latitude = $latitude; return $this; }
    public function getLongitude(): ?string { return $this->longitude; }
    public function setLongitude(?string $longitude): self { $this->longitude = $longitude; return $this; }
    public function getQrCode(): ?string { return $this->qrCode; }
    public function setQrCode(?string $qrCode): self { $this->qrCode = $qrCode; return $this; }
    public function getType(): ?string { return $this->type; }
    public function setType(string $type): self { $this->type = $type; return $this; }
    public function getGeofencingRadius(): ?int { return $this->geofencingRadius; }
    public function setGeofencingRadius(?int $geofencingRadius): self { $this->geofencingRadius = $geofencingRadius; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): self { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function getAssignments(): Collection { return $this->assignments; }
    public function getPresences(): Collection { return $this->presences; }
    public function getTimesheets(): Collection { return $this->timesheets; }
    public function getRoundSites(): Collection { return $this->roundSites; }
    public function getIncidents(): Collection { return $this->incidents; }
}
<?php

namespace App\Entity;

use App\Repository\IncidentRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: IncidentRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Incident
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'reportedIncidents')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $reporter = null;

    #[ORM\ManyToOne(inversedBy: 'incidents')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Site $site = null;

    #[ORM\ManyToOne(inversedBy: 'assignedIncidents')]
    private ?User $assignedTo = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(type: 'text')]
    private ?string $description = null;

    #[ORM\Column(length: 30)]
    private ?string $category = null;

    #[ORM\Column(length: 20)]
    private ?string $severity = null;

    #[ORM\Column(length: 20, options: ['default' => 'OPEN'])]
    private string $status = 'OPEN';

    #[ORM\Column]
    private ?\DateTimeImmutable $reportedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $resolvedAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $resolution = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $photos = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $witnesses = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
        $this->reportedAt = new \DateTimeImmutable();
    }

    #[ORM\PreUpdate]
    public function setUpdatedAtValue(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getReporter(): ?User { return $this->reporter; }
    public function setReporter(?User $reporter): self { $this->reporter = $reporter; return $this; }
    public function getSite(): ?Site { return $this->site; }
    public function setSite(?Site $site): self { $this->site = $site; return $this; }
    public function getAssignedTo(): ?User { return $this->assignedTo; }
    public function setAssignedTo(?User $assignedTo): self { $this->assignedTo = $assignedTo; return $this; }
    public function getTitle(): ?string { return $this->title; }
    public function setTitle(string $title): self { $this->title = $title; return $this; }
    public function getDescription(): ?string { return $this->description; }
    public function setDescription(string $description): self { $this->description = $description; return $this; }
    public function getCategory(): ?string { return $this->category; }
    public function setCategory(string $category): self { $this->category = $category; return $this; }
    public function getSeverity(): ?string { return $this->severity; }
    public function setSeverity(string $severity): self { $this->severity = $severity; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getReportedAt(): ?\DateTimeImmutable { return $this->reportedAt; }
    public function setReportedAt(\DateTimeImmutable $reportedAt): self { $this->reportedAt = $reportedAt; return $this; }
    public function getResolvedAt(): ?\DateTimeImmutable { return $this->resolvedAt; }
    public function setResolvedAt(?\DateTimeImmutable $resolvedAt): self { $this->resolvedAt = $resolvedAt; return $this; }
    public function getResolution(): ?string { return $this->resolution; }
    public function setResolution(?string $resolution): self { $this->resolution = $resolution; return $this; }
    public function getPhotos(): ?array { return $this->photos; }
    public function setPhotos(?array $photos): self { $this->photos = $photos; return $this; }
    public function getWitnesses(): ?array { return $this->witnesses; }
    public function setWitnesses(?array $witnesses): self { $this->witnesses = $witnesses; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
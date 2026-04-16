<?php

namespace App\Entity;

use App\Repository\TimesheetRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TimesheetRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Timesheet
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'timesheets')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\ManyToOne(inversedBy: 'timesheets')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Site $site = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $date = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private string $hoursWorked = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $overtimeHours = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $nightHours = '0.00';

    #[ORM\Column(options: ['default' => 0])]
    private int $breakMinutes = 0;

    #[ORM\Column(length: 20, options: ['default' => 'PENDING'])]
    private string $status = 'PENDING';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

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

    public function getId(): ?int { return $this->id; }
    public function getAgent(): ?User { return $this->agent; }
    public function setAgent(?User $agent): self { $this->agent = $agent; return $this; }
    public function getSite(): ?Site { return $this->site; }
    public function setSite(?Site $site): self { $this->site = $site; return $this; }
    public function getDate(): ?\DateTimeImmutable { return $this->date; }
    public function setDate(\DateTimeImmutable $date): self { $this->date = $date; return $this; }
    public function getHoursWorked(): string { return $this->hoursWorked; }
    public function setHoursWorked(string $hoursWorked): self { $this->hoursWorked = $hoursWorked; return $this; }
    public function getOvertimeHours(): string { return $this->overtimeHours; }
    public function setOvertimeHours(string $overtimeHours): self { $this->overtimeHours = $overtimeHours; return $this; }
    public function getNightHours(): string { return $this->nightHours; }
    public function setNightHours(string $nightHours): self { $this->nightHours = $nightHours; return $this; }
    public function getBreakMinutes(): int { return $this->breakMinutes; }
    public function setBreakMinutes(int $breakMinutes): self { $this->breakMinutes = $breakMinutes; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getNotes(): ?string { return $this->notes; }
    public function setNotes(?string $notes): self { $this->notes = $notes; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
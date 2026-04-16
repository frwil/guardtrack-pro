<?php

namespace App\Entity;

use App\Repository\PayrollEntryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PayrollEntryRepository::class)]
class PayrollEntry
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'entries')]
    #[ORM\JoinColumn(nullable: false)]
    private ?PayrollPeriod $period = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $agent = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private string $baseHours = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $overtimeHours = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, options: ['default' => '0.00'])]
    private string $nightHours = '0.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $baseRate = '11.50';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, options: ['default' => '14.38'])]
    private string $overtimeRate = '14.38';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, options: ['default' => '13.80'])]
    private string $nightRate = '13.80';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $totalAmount = '0.00';

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getPeriod(): ?PayrollPeriod { return $this->period; }
    public function setPeriod(?PayrollPeriod $period): self { $this->period = $period; return $this; }
    public function getAgent(): ?User { return $this->agent; }
    public function setAgent(?User $agent): self { $this->agent = $agent; return $this; }
    public function getBaseHours(): string { return $this->baseHours; }
    public function setBaseHours(string $baseHours): self { $this->baseHours = $baseHours; return $this; }
    public function getOvertimeHours(): string { return $this->overtimeHours; }
    public function setOvertimeHours(string $overtimeHours): self { $this->overtimeHours = $overtimeHours; return $this; }
    public function getNightHours(): string { return $this->nightHours; }
    public function setNightHours(string $nightHours): self { $this->nightHours = $nightHours; return $this; }
    public function getBaseRate(): string { return $this->baseRate; }
    public function setBaseRate(string $baseRate): self { $this->baseRate = $baseRate; return $this; }
    public function getOvertimeRate(): string { return $this->overtimeRate; }
    public function setOvertimeRate(string $overtimeRate): self { $this->overtimeRate = $overtimeRate; return $this; }
    public function getNightRate(): string { return $this->nightRate; }
    public function setNightRate(string $nightRate): self { $this->nightRate = $nightRate; return $this; }
    public function getTotalAmount(): string { return $this->totalAmount; }
    public function setTotalAmount(string $totalAmount): self { $this->totalAmount = $totalAmount; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
}
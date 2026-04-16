<?php

namespace App\Entity;

use App\Repository\InvoiceRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InvoiceRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Invoice
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'invoices')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Client $client = null;

    #[ORM\Column(length: 50, unique: true)]
    private ?string $number = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $issueDate = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $dueDate = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $amountHT = '0.00';

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, options: ['default' => '20.00'])]
    private string $tva = '20.00';

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2)]
    private string $amountTTC = '0.00';

    #[ORM\Column(length: 20, options: ['default' => 'DRAFT'])]
    private string $status = 'DRAFT';

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $paidAt = null;

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
    public function getClient(): ?Client { return $this->client; }
    public function setClient(?Client $client): self { $this->client = $client; return $this; }
    public function getNumber(): ?string { return $this->number; }
    public function setNumber(string $number): self { $this->number = $number; return $this; }
    public function getIssueDate(): ?\DateTimeImmutable { return $this->issueDate; }
    public function setIssueDate(\DateTimeImmutable $issueDate): self { $this->issueDate = $issueDate; return $this; }
    public function getDueDate(): ?\DateTimeImmutable { return $this->dueDate; }
    public function setDueDate(\DateTimeImmutable $dueDate): self { $this->dueDate = $dueDate; return $this; }
    public function getAmountHT(): string { return $this->amountHT; }
    public function setAmountHT(string $amountHT): self { $this->amountHT = $amountHT; return $this; }
    public function getTva(): string { return $this->tva; }
    public function setTva(string $tva): self { $this->tva = $tva; return $this; }
    public function getAmountTTC(): string { return $this->amountTTC; }
    public function setAmountTTC(string $amountTTC): self { $this->amountTTC = $amountTTC; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): self { $this->status = $status; return $this; }
    public function getPaidAt(): ?\DateTimeImmutable { return $this->paidAt; }
    public function setPaidAt(?\DateTimeImmutable $paidAt): self { $this->paidAt = $paidAt; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
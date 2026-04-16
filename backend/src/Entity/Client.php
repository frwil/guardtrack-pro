<?php

namespace App\Entity;

use App\Repository\ClientRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ClientRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Client
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 14, nullable: true, unique: true)]
    private ?string $siret = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $phone = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $address = null;

    #[ORM\Column(type: 'decimal', precision: 10, scale: 2, options: ['default' => '15.00'])]
    private string $billingRate = '15.00';

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $emailTemplate = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $smsTemplate = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $isActive = true;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    #[ORM\OneToMany(mappedBy: 'client', targetEntity: Site::class, cascade: ['persist', 'remove'])]
    private Collection $sites;

    #[ORM\OneToMany(mappedBy: 'client', targetEntity: Invoice::class)]
    private Collection $invoices;

    #[ORM\OneToMany(mappedBy: 'client', targetEntity: ClientReport::class)]
    private Collection $reports;

    public function __construct()
    {
        $this->sites = new ArrayCollection();
        $this->invoices = new ArrayCollection();
        $this->reports = new ArrayCollection();
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
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }
    public function getSiret(): ?string { return $this->siret; }
    public function setSiret(?string $siret): self { $this->siret = $siret; return $this; }
    public function getEmail(): ?string { return $this->email; }
    public function setEmail(?string $email): self { $this->email = $email; return $this; }
    public function getPhone(): ?string { return $this->phone; }
    public function setPhone(?string $phone): self { $this->phone = $phone; return $this; }
    public function getAddress(): ?string { return $this->address; }
    public function setAddress(?string $address): self { $this->address = $address; return $this; }
    public function getBillingRate(): string { return $this->billingRate; }
    public function setBillingRate(string $billingRate): self { $this->billingRate = $billingRate; return $this; }
    public function getEmailTemplate(): ?string { return $this->emailTemplate; }
    public function setEmailTemplate(?string $emailTemplate): self { $this->emailTemplate = $emailTemplate; return $this; }
    public function getSmsTemplate(): ?string { return $this->smsTemplate; }
    public function setSmsTemplate(?string $smsTemplate): self { $this->smsTemplate = $smsTemplate; return $this; }
    public function isActive(): bool { return $this->isActive; }
    public function setIsActive(bool $isActive): self { $this->isActive = $isActive; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
    public function getSites(): Collection { return $this->sites; }
    public function addSite(Site $site): self { if (!$this->sites->contains($site)) { $this->sites[] = $site; $site->setClient($this); } return $this; }
    public function removeSite(Site $site): self { if ($this->sites->removeElement($site)) { if ($site->getClient() === $this) { $site->setClient(null); } } return $this; }
    public function getInvoices(): Collection { return $this->invoices; }
    public function getReports(): Collection { return $this->reports; }
}
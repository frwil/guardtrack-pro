<?php

namespace App\Entity;

use App\Repository\AppSettingsRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AppSettingsRepository::class)]
#[ORM\HasLifecycleCallbacks]
class AppSettings
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    private ?string $settingKey = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private mixed $settingValue = null;

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
    public function getSettingKey(): ?string { return $this->settingKey; }
    public function setSettingKey(string $settingKey): self { $this->settingKey = $settingKey; return $this; }
    public function getSettingValue(): mixed { return $this->settingValue; }
    public function setSettingValue(mixed $settingValue): self { $this->settingValue = $settingValue; return $this; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function getUpdatedAt(): ?\DateTimeImmutable { return $this->updatedAt; }
}
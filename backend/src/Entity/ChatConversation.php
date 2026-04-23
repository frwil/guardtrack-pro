<?php

namespace App\Entity;

use App\Repository\ChatConversationRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChatConversationRepository::class)]
#[ORM\HasLifecycleCallbacks]
class ChatConversation
{
    public const TYPE_GLOBAL = 'GLOBAL';
    public const TYPE_ROUND = 'ROUND';
    public const TYPE_DIRECT = 'DIRECT';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $title = null;

    #[ORM\Column(length: 20)]
    private string $type = self::TYPE_DIRECT;

    #[ORM\ManyToOne]
    private ?Round $round = null;

    #[ORM\ManyToMany(targetEntity: User::class)]
    #[ORM\JoinTable(name: 'chat_conversation_participants')]
    private Collection $participants;

    #[ORM\OneToMany(mappedBy: 'conversation', targetEntity: ChatMessage::class, orphanRemoval: true)]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $messages;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $createdBy = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $this->participants = new ArrayCollection();
        $this->messages = new ArrayCollection();
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

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }
    public function setTitle(?string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function getType(): string
    {
        return $this->type;
    }
    public function setType(string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getRound(): ?Round
    {
        return $this->round;
    }
    public function setRound(?Round $round): self
    {
        $this->round = $round;
        return $this;
    }

    public function getParticipants(): Collection
    {
        return $this->participants;
    }
    public function addParticipant(User $user): self
    {
        if (!$this->participants->contains($user)) {
            $this->participants[] = $user;
        }
        return $this;
    }
    public function removeParticipant(User $user): self
    {
        $this->participants->removeElement($user);
        return $this;
    }
    public function hasParticipant(User $user): bool
    {
        return $this->participants->contains($user);
    }

    public function getMessages(): Collection
    {
        return $this->messages;
    }
    public function addMessage(ChatMessage $message): self
    {
        if (!$this->messages->contains($message)) {
            $this->messages[] = $message;
            $message->setConversation($this);
        }
        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }
    public function setCreatedBy(?User $createdBy): self
    {
        $this->createdBy = $createdBy;
        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }
    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getDisplayName(User $currentUser): string
    {
        if ($this->title) {
            return $this->title;
        }

        if ($this->type === self::TYPE_ROUND && $this->round) {
            return 'Ronde : ' . $this->round->getName();
        }

        if ($this->type === self::TYPE_GLOBAL) {
            return 'Chat global';
        }

        // Conversation directe : afficher le nom des autres participants
        $otherParticipants = $this->participants->filter(fn(User $u) => $u->getId() !== $currentUser->getId());

        if ($otherParticipants->count() === 1) {
            return $otherParticipants->first()->getFullName();
        }

        // Si plusieurs participants, on concatène leurs prénoms
        $names = $otherParticipants->map(fn(User $u) => $u->getFirstName() ?: $u->getFullName())->toArray();

        if (count($names) === 0) {
            return 'Conversation';
        }

        return implode(', ', $names);
    }

    public function toArray(User $currentUser): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'displayName' => $this->getDisplayName($currentUser),
            'type' => $this->type,
            'round' => $this->round ? [
                'id' => $this->round->getId(),
                'name' => $this->round->getName(),
            ] : null,
            'participants' => $this->participants->map(fn(User $u) => [
                'id' => $u->getId(),
                'fullName' => $u->getFullName(),
                'role' => $u->getRole(),
            ])->toArray(),
            'createdBy' => [
                'id' => $this->createdBy->getId(),
                'fullName' => $this->createdBy->getFullName(),
            ],
            'createdAt' => $this->createdAt->format('c'),
            'updatedAt' => $this->updatedAt->format('c'),
            'unreadCount' => 0, // Sera calculé dans le contrôleur
        ];
    }
}

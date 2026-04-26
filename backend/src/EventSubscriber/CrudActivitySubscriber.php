<?php

namespace App\EventSubscriber;

use App\Entity\ActivityLog;
use App\Entity\Assignment;
use App\Entity\Client;
use App\Entity\ClientReport;
use App\Entity\ConflictReport;
use App\Entity\Incident;
use App\Entity\Presence;
use App\Entity\Round;
use App\Entity\Site;
use App\Entity\User;
use App\Service\ActivityLogger;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsDoctrineListener;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Event\PostRemoveEventArgs;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Events;

#[AsDoctrineListener(event: Events::postPersist)]
#[AsDoctrineListener(event: Events::postUpdate)]
#[AsDoctrineListener(event: Events::postRemove)]
#[AsDoctrineListener(event: Events::postFlush)]
class CrudActivitySubscriber
{
    private array $pendingLogs = [];
    private bool $isFlushing = false;

    private const ENTITY_MAP = [
        User::class           => ActivityLog::ENTITY_USER,
        Client::class         => ActivityLog::ENTITY_CLIENT,
        Site::class           => ActivityLog::ENTITY_SITE,
        Assignment::class     => ActivityLog::ENTITY_ASSIGNMENT,
        Presence::class       => ActivityLog::ENTITY_PRESENCE,
        Round::class          => ActivityLog::ENTITY_ROUND,
        Incident::class       => ActivityLog::ENTITY_INCIDENT,
        ClientReport::class   => ActivityLog::ENTITY_REPORT,
        ConflictReport::class => ActivityLog::ENTITY_CONFLICT,
    ];

    public function __construct(private ActivityLogger $activityLogger) {}

    public function postPersist(PostPersistEventArgs $args): void
    {
        $this->collectLog($args->getObject(), ActivityLog::ACTION_CREATE);
    }

    public function postUpdate(PostUpdateEventArgs $args): void
    {
        $this->collectLog($args->getObject(), ActivityLog::ACTION_UPDATE);
    }

    public function postRemove(PostRemoveEventArgs $args): void
    {
        $this->collectLog($args->getObject(), ActivityLog::ACTION_DELETE);
    }

    public function postFlush(PostFlushEventArgs $args): void
    {
        if ($this->isFlushing || empty($this->pendingLogs)) {
            return;
        }

        $this->isFlushing = true;
        $em = $args->getObjectManager();

        foreach ($this->pendingLogs as $log) {
            $em->persist($log);
        }
        $this->pendingLogs = [];

        $em->flush();
        $this->isFlushing = false;
    }

    private function collectLog(object $entity, string $action): void
    {
        if ($this->isFlushing) {
            return;
        }

        $entityType = self::ENTITY_MAP[get_class($entity)] ?? null;
        if ($entityType === null) {
            return;
        }

        $entityId = method_exists($entity, 'getId') ? (string) $entity->getId() : null;

        $details = [];
        if ($action === ActivityLog::ACTION_CREATE || $action === ActivityLog::ACTION_UPDATE) {
            if (method_exists($entity, 'toArray')) {
                $details['snapshot'] = $entity->toArray();
            }
        }

        $this->pendingLogs[] = $this->activityLogger->logDeferred(
            $action,
            $entityType,
            $details,
            $entityId,
        );
    }
}

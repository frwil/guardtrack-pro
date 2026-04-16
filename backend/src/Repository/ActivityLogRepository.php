<?php
// src/Repository/ActivityLogRepository.php

namespace App\Repository;

use App\Entity\ActivityLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ActivityLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ActivityLog::class);
    }

    /**
     * Sauvegarde un log
     */
    public function save(ActivityLog $log, bool $flush = false): void
    {
        $this->getEntityManager()->persist($log);
        
        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    /**
     * Force le flush
     */
    public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

    /**
     * Recherche avec filtres
     */
    public function findByFilters(array $filters, int $page = 1, int $limit = 50): array
    {
        $qb = $this->createQueryBuilder('a')
            ->orderBy('a.createdAt', 'DESC');

        if (!empty($filters['userId'])) {
            $qb->andWhere('a.user = :userId')->setParameter('userId', $filters['userId']);
        }

        if (!empty($filters['userRole'])) {
            $qb->andWhere('a.userRole = :userRole')->setParameter('userRole', $filters['userRole']);
        }

        if (!empty($filters['action'])) {
            $qb->andWhere('a.actionType = :action')->setParameter('action', $filters['action']);
        }

        if (!empty($filters['entity'])) {
            $qb->andWhere('a.entityType = :entity')->setParameter('entity', $filters['entity']);
        }

        if (!empty($filters['status'])) {
            $qb->andWhere('a.status = :status')->setParameter('status', $filters['status']);
        }

        if (!empty($filters['startDate'])) {
            $qb->andWhere('a.createdAt >= :startDate')
                ->setParameter('startDate', new \DateTimeImmutable($filters['startDate']));
        }

        if (!empty($filters['endDate'])) {
            $qb->andWhere('a.createdAt <= :endDate')
                ->setParameter('endDate', new \DateTimeImmutable($filters['endDate'] . ' 23:59:59'));
        }

        if (!empty($filters['search'])) {
            $qb->andWhere('a.userEmail LIKE :search OR a.details LIKE :search')
                ->setParameter('search', '%' . $filters['search'] . '%');
        }

        $total = (clone $qb)->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();

        $results = $qb->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return ['data' => $results, 'total' => $total];
    }

    /**
     * Statistiques des logs
     */
    public function getStats(array $filters = []): array
    {
        $qb = $this->createQueryBuilder('a');

        if (!empty($filters['startDate'])) {
            $qb->andWhere('a.createdAt >= :startDate')
                ->setParameter('startDate', new \DateTimeImmutable($filters['startDate']));
        }

        if (!empty($filters['endDate'])) {
            $qb->andWhere('a.createdAt <= :endDate')
                ->setParameter('endDate', new \DateTimeImmutable($filters['endDate'] . ' 23:59:59'));
        }

        // Total
        $total = (clone $qb)->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();

        // Par action
        $byAction = $qb->select('a.actionType, COUNT(a.id) as cnt')
            ->groupBy('a.actionType')
            ->getQuery()
            ->getResult();
        $byActionAssoc = [];
        foreach ($byAction as $row) {
            $byActionAssoc[$row['actionType']] = (int) $row['cnt'];
        }

        // Par entité
        $byEntity = $qb->select('a.entityType, COUNT(a.id) as cnt')
            ->groupBy('a.entityType')
            ->getQuery()
            ->getResult();
        $byEntityAssoc = [];
        foreach ($byEntity as $row) {
            if ($row['entityType']) {
                $byEntityAssoc[$row['entityType']] = (int) $row['cnt'];
            }
        }

        // Par statut
        $byStatus = $qb->select('a.status, COUNT(a.id) as cnt')
            ->groupBy('a.status')
            ->getQuery()
            ->getResult();
        $byStatusAssoc = [];
        foreach ($byStatus as $row) {
            $byStatusAssoc[$row['status']] = (int) $row['cnt'];
        }

        // Par utilisateur (top 10)
        $byUser = $qb->select('IDENTITY(a.user) as userId, a.userEmail, COUNT(a.id) as cnt')
            ->andWhere('a.user IS NOT NULL')
            ->groupBy('a.user', 'a.userEmail')
            ->orderBy('cnt', 'DESC')
            ->setMaxResults(10)
            ->getQuery()
            ->getResult();

        // Par heure (24h)
        $byHour = array_fill(0, 24, 0);
        $hourlyStats = $qb->select('HOUR(a.createdAt) as hour, COUNT(a.id) as cnt')
            ->groupBy('hour')
            ->getQuery()
            ->getResult();
        foreach ($hourlyStats as $row) {
            $byHour[(int) $row['hour']] = (int) $row['cnt'];
        }

        // Par jour (7 derniers jours)
        $byDay = array_fill(0, 7, 0);
        $dailyStats = $qb->select('DAYOFWEEK(a.createdAt) as day, COUNT(a.id) as cnt')
            ->andWhere('a.createdAt >= :weekAgo')
            ->setParameter('weekAgo', new \DateTimeImmutable('-7 days'))
            ->groupBy('day')
            ->getQuery()
            ->getResult();
        foreach ($dailyStats as $row) {
            $byDay[(int) $row['day'] - 1] = (int) $row['cnt'];
        }

        return [
            'total' => $total,
            'byAction' => $byActionAssoc,
            'byEntity' => $byEntityAssoc,
            'byStatus' => $byStatusAssoc,
            'byUser' => $byUser,
            'byHour' => $byHour,
            'byDay' => $byDay,
        ];
    }

    /**
     * Récupère les logs d'un utilisateur
     */
    public function findByUser(int $userId, int $limit = 100): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.user = :userId')
            ->setParameter('userId', $userId)
            ->orderBy('a.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Récupère les logs d'une entité
     */
    public function findByEntity(string $entityType, string $entityId, int $limit = 100): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.entityType = :entityType')
            ->andWhere('a.entityId = :entityId')
            ->setParameter('entityType', $entityType)
            ->setParameter('entityId', $entityId)
            ->orderBy('a.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /**
     * Nettoie les anciens logs (plus de 90 jours)
     */
    public function cleanupOldLogs(int $daysToKeep = 90): int
    {
        $cutoffDate = new \DateTimeImmutable("-{$daysToKeep} days");
        
        $qb = $this->createQueryBuilder('a')
            ->delete()
            ->where('a.createdAt < :cutoff')
            ->setParameter('cutoff', $cutoffDate);
        
        return $qb->getQuery()->execute();
    }
}
<?php
// src/Repository/ConflictReportRepository.php

namespace App\Repository;

use App\Entity\ConflictReport;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ConflictReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ConflictReport::class);
    }

    public function findByFilters(array $filters, int $page = 1, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('c')
            ->orderBy('c.createdAt', 'DESC');

        if (!empty($filters['conflictType'])) {
            $qb->andWhere('c.conflictType = :type')->setParameter('type', $filters['conflictType']);
        }

        if (!empty($filters['resolution'])) {
            $qb->andWhere('c.resolution = :resolution')->setParameter('resolution', $filters['resolution']);
        }

        if (!empty($filters['startDate'])) {
            $qb->andWhere('c.createdAt >= :startDate')
                ->setParameter('startDate', new \DateTimeImmutable($filters['startDate']));
        }

        if (!empty($filters['endDate'])) {
            $qb->andWhere('c.createdAt <= :endDate')
                ->setParameter('endDate', new \DateTimeImmutable($filters['endDate'] . ' 23:59:59'));
        }

        $total = (clone $qb)->select('COUNT(c.id)')->getQuery()->getSingleScalarResult();

        $results = $qb->setFirstResult(($page - 1) * $limit)
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();

        return ['data' => $results, 'total' => $total];
    }

    public function getStats(): array
    {
        $qb = $this->createQueryBuilder('c');

        $total = (clone $qb)->select('COUNT(c.id)')->getQuery()->getSingleScalarResult();
        $pending = (clone $qb)->select('COUNT(c.id)')->andWhere('c.resolution = :pending')
            ->setParameter('pending', ConflictReport::RESOLUTION_PENDING)->getQuery()->getSingleScalarResult();
        $resolved = $total - $pending;

        $byType = $qb->select('c.conflictType, COUNT(c.id) as cnt')
            ->groupBy('c.conflictType')
            ->getQuery()
            ->getResult();
        $byTypeAssoc = [];
        foreach ($byType as $row) {
            $byTypeAssoc[$row['conflictType']] = (int) $row['cnt'];
        }

        $byResolution = $qb->select('c.resolution, COUNT(c.id) as cnt')
            ->groupBy('c.resolution')
            ->getQuery()
            ->getResult();
        $byResolutionAssoc = [];
        foreach ($byResolution as $row) {
            $byResolutionAssoc[$row['resolution']] = (int) $row['cnt'];
        }

        return [
            'total' => $total,
            'pending' => $pending,
            'resolved' => $resolved,
            'byType' => $byTypeAssoc,
            'byResolution' => $byResolutionAssoc,
        ];
    }

    public function save(ConflictReport $conflict, bool $flush = false): void
    {
        $this->getEntityManager()->persist($conflict);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function flush(): void
    {
        $this->getEntityManager()->flush();
    }

    public function remove(ConflictReport $conflict, bool $flush = false): void
    {
        $this->getEntityManager()->remove($conflict);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }
}

<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function findByRole(string $role): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.role = :role')
            ->setParameter('role', $role)
            ->orderBy('u.lastName', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findActiveAgents(): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.role = :role')
            ->andWhere('u.isActive = :active')
            ->setParameter('role', 'AGENT')
            ->setParameter('active', true)
            ->getQuery()
            ->getResult();
    }

    public function findByRoleIn(array $roles): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.role IN (:roles)')
            ->setParameter('roles', $roles)
            ->orderBy('u.lastName', 'ASC')
            ->getQuery()
            ->getResult();
    }
}

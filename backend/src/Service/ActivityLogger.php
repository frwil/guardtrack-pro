<?php
// src/Service/ActivityLogger.php

namespace App\Service;

use App\Entity\ActivityLog;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Bundle\SecurityBundle\Security;

class ActivityLogger
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private Security $security,
        private RequestStack $requestStack,
    ) {}

    public function log(
        string $actionType,
        string $entityType,
        array $details = [],
        ?string $entityId = null,
        string $status = ActivityLog::STATUS_SUCCESS,
        ?string $errorMessage = null,
        ?User $user = null
    ): ActivityLog {
        $user = $user ?? $this->security->getUser();
        
        $log = new ActivityLog();
        $log->setActionType($actionType);
        $log->setEntityType($entityType);
        $log->setEntityId($entityId);
        $log->setDetails($details);
        $log->setStatus($status);
        $log->setErrorMessage($errorMessage);
        
        if ($user instanceof User) {
            $log->setUser($user);
            $log->setUserEmail($user->getEmail());
            $log->setUserRole($user->getRoles()[0] ?? 'ROLE_USER');
        }
        
        $request = $this->requestStack->getCurrentRequest();
        if ($request) {
            $log->setIpAddress($request->getClientIp());
            $log->setUserAgent($request->headers->get('User-Agent'));
            if ($request->hasSession()) {
                $log->setSessionId($request->getSession()->getId());
            }
        }
        
        $this->entityManager->persist($log);
        $this->entityManager->flush();
        
        return $log;
    }
    
    public function logSuccess(
        string $actionType,
        string $entityType,
        array $details = [],
        ?string $entityId = null
    ): ActivityLog {
        return $this->log($actionType, $entityType, $details, $entityId, ActivityLog::STATUS_SUCCESS);
    }
    
    public function logFailure(
        string $actionType,
        string $entityType,
        \Throwable $error,
        array $details = [],
        ?string $entityId = null
    ): ActivityLog {
        return $this->log(
            $actionType,
            $entityType,
            $details,
            $entityId,
            ActivityLog::STATUS_FAILED,
            $error->getMessage()
        );
    }

    /**
     * Log une action sans persister immédiatement (pour les batchs)
     */
    public function logDeferred(
        string $actionType,
        string $entityType,
        array $details = [],
        ?string $entityId = null,
        string $status = ActivityLog::STATUS_SUCCESS,
        ?string $errorMessage = null,
        ?User $user = null
    ): ActivityLog {
        $user = $user ?? $this->security->getUser();
        
        $log = new ActivityLog();
        $log->setActionType($actionType);
        $log->setEntityType($entityType);
        $log->setEntityId($entityId);
        $log->setDetails($details);
        $log->setStatus($status);
        $log->setErrorMessage($errorMessage);
        
        if ($user instanceof User) {
            $log->setUser($user);
            $log->setUserEmail($user->getEmail());
            $log->setUserRole($user->getRoles()[0] ?? 'ROLE_USER');
        }
        
        $request = $this->requestStack->getCurrentRequest();
        if ($request) {
            $log->setIpAddress($request->getClientIp());
            $log->setUserAgent($request->headers->get('User-Agent'));
            if ($request->hasSession()) {
                $log->setSessionId($request->getSession()->getId());
            }
        }
        
        return $log;
    }

    /**
     * Persiste plusieurs logs d'un coup
     */
    public function flushLogs(array $logs): void
    {
        foreach ($logs as $log) {
            if ($log instanceof ActivityLog) {
                $this->entityManager->persist($log);
            }
        }
        $this->entityManager->flush();
    }
}
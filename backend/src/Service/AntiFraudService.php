<?php

namespace App\Service;

use App\Entity\Round;
use Doctrine\ORM\EntityManagerInterface;

class AntiFraudService
{
    private const MAX_TIME_DRIFT = 300; // 5 minutes en secondes
    private const MAX_FUTURE_DRIFT = 60; // 1 minute
    
    public function validateRoundTiming(Round $round, array $operationTime): array
    {
        $issues = [];
        
        // Vérifier si l'opération a une heure serveur confirmée
        if (isset($operationTime['serverTimeConfirmed'])) {
            $serverTime = new \DateTimeImmutable($operationTime['serverTimeConfirmed']);
            $now = new \DateTimeImmutable();
            
            // Vérifier la dérive
            $drift = abs($now->getTimestamp() - $serverTime->getTimestamp());
            if ($drift > self::MAX_TIME_DRIFT) {
                $issues[] = sprintf('Dérive temporelle de %d secondes', $drift);
            }
            
            // Vérifier si dans le futur
            if ($serverTime > $now && ($serverTime->getTimestamp() - $now->getTimestamp()) > self::MAX_FUTURE_DRIFT) {
                $issues[] = 'Opération datée dans le futur';
            }
        }
        
        // Vérifier la cohérence avec les opérations précédentes
        $previousRounds = $this->getPreviousRounds($round->getSupervisor());
        if (count($previousRounds) > 0) {
            $lastRound = $previousRounds[0];
            if ($round->getScheduledStart() < $lastRound->getScheduledStart()) {
                $issues[] = 'Date antérieure à la dernière ronde';
            }
        }
        
        return [
            'valid' => empty($issues),
            'issues' => $issues,
            'riskLevel' => $this->calculateRiskLevel($issues),
        ];
    }
    
    private function getPreviousRounds($supervisor): array
    {
        // Récupérer les rondes précédentes du superviseur
        return [];
    }
    
    private function calculateRiskLevel(array $issues): string
    {
        $count = count($issues);
        if ($count === 0) return 'LOW';
        if ($count === 1) return 'MEDIUM';
        return 'HIGH';
    }
}
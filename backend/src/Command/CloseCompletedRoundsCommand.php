<?php

namespace App\Command;

use App\Entity\Round;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:close-completed-rounds',
    description: 'Clôture automatiquement les rondes terminées la veille à 7h'
)]
class CloseCompletedRoundsCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $now = new \DateTimeImmutable();
        
        // Vérifier qu'il est au moins 7h du matin
        $sevenAm = new \DateTimeImmutable('today 07:00:00');
        
        if ($now < $sevenAm) {
            $output->writeln('⏳ Il n\'est pas encore 7h, aucune clôture automatique.');
            return Command::SUCCESS;
        }
        
        // Récupérer les rondes de la veille qui sont IN_PROGRESS
        $yesterday = new \DateTimeImmutable('yesterday');
        $yesterdayStart = $yesterday->setTime(0, 0, 0);
        $yesterdayEnd = $yesterday->setTime(23, 59, 59);
        
        $rounds = $this->entityManager->getRepository(Round::class)
            ->createQueryBuilder('r')
            ->where('r.status = :status')
            ->andWhere('r.scheduledStart BETWEEN :start AND :end')
            ->setParameter('status', 'IN_PROGRESS')
            ->setParameter('start', $yesterdayStart)
            ->setParameter('end', $yesterdayEnd)
            ->getQuery()
            ->getResult();
        
        $closedCount = 0;
        
        foreach ($rounds as $round) {
            // Vérifier si TOUS les sites ont été visités
            $allSitesVisited = true;
            foreach ($round->getRoundSites() as $roundSite) {
                if ($roundSite->getVisitedAt() === null) {
                    $allSitesVisited = false;
                    break;
                }
            }
            
            // ✅ Clôturer uniquement si tous les sites sont visités
            if ($allSitesVisited) {
                $round->setStatus('COMPLETED');
                $round->setActualEnd(new \DateTimeImmutable());
                $closedCount++;
                
                $output->writeln(sprintf(
                    '✅ Ronde #%d "%s" clôturée automatiquement (tous les sites visités)',
                    $round->getId(),
                    $round->getName()
                ));
            } else {
                $visitedCount = $round->getRoundSites()->filter(fn($rs) => $rs->getVisitedAt() !== null)->count();
                $totalCount = $round->getRoundSites()->count();
                
                $output->writeln(sprintf(
                    '⏳ Ronde #%d "%s" NON clôturée (%d/%d sites visités) - nécessite une clôture manuelle',
                    $round->getId(),
                    $round->getName(),
                    $visitedCount,
                    $totalCount
                ));
            }
        }
        
        $this->entityManager->flush();
        
        $output->writeln(sprintf('📊 %d ronde(s) clôturée(s) automatiquement.', $closedCount));
        
        return Command::SUCCESS;
    }
}
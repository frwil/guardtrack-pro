<?php

namespace App\DataFixtures;

use App\Entity\User;
use App\Entity\Client;
use App\Entity\Site;
use App\Entity\Assignment;
use App\Entity\Presence;
use App\Entity\Timesheet;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(
        private UserPasswordHasherInterface $passwordHasher
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        // 1. Clients (Banques)
        $client1 = new Client();
        $client1->setName('Afriland First Bank');
        $client1->setSiret('AFRILAND-CMR01');
        $client1->setEmail('contact@afrilandfirstbank.cm');
        $client1->setPhone('+237 233 42 60 00');
        $client1->setAddress('Boulevard de la Liberté, Douala');
        $client1->setBillingRate('15.00');
        $manager->persist($client1);

        $client2 = new Client();
        $client2->setName('SCB Cameroun');
        $client2->setSiret('SCB-CMR-000002');
        $client2->setEmail('contact@scb.cm');
        $client2->setPhone('+237 233 42 80 00');
        $client2->setAddress('Rue du Tribunal, Akwa, Douala');
        $client2->setBillingRate('15.00');
        $manager->persist($client2);

        $client3 = new Client();
        $client3->setName('BICEC');
        $client3->setSiret('BICEC-CMR0003');
        $client3->setEmail('contact@bicec.com');
        $client3->setPhone('+237 222 23 40 00');
        $client3->setAddress('Avenue Foch, Bastos, Yaoundé');
        $client3->setBillingRate('15.00');
        $manager->persist($client3);

        // 2. Sites
        $site1 = new Site();
        $site1->setName('Afriland First Bank - Agence Akwa');
        $site1->setClient($client1);
        $site1->setAddress('Boulevard de la Liberté, Douala');
        $site1->setType('BANQUE');
        $site1->setLatitude('4.0511');
        $site1->setLongitude('9.7008');
        $site1->setQrCode(uniqid('afriland_akwa_'));
        $site1->setGeofencingRadius(100);
        $manager->persist($site1);

        $site2 = new Site();
        $site2->setName('SCB Cameroun - Agence Bonanjo');
        $site2->setClient($client2);
        $site2->setAddress('Rue du Tribunal, Bonanjo, Douala');
        $site2->setType('BANQUE');
        $site2->setLatitude('4.0429');
        $site2->setLongitude('9.7062');
        $site2->setQrCode(uniqid('scb_bonanjo_'));
        $site2->setGeofencingRadius(100);
        $manager->persist($site2);

        $site3 = new Site();
        $site3->setName('BICEC - Agence Bastos');
        $site3->setClient($client3);
        $site3->setAddress('Avenue Foch, Bastos, Yaoundé');
        $site3->setType('BANQUE');
        $site3->setLatitude('3.8480');
        $site3->setLongitude('11.5021');
        $site3->setQrCode(uniqid('bicec_bastos_'));
        $site3->setGeofencingRadius(100);
        $manager->persist($site3);

        // 3. Utilisateurs
        $superadmin = new User();
        $superadmin->setEmail('jptchomtchoua@guardtrack.cm');
        $superadmin->setPassword($this->passwordHasher->hashPassword($superadmin, 'password123'));
        $superadmin->setFirstName('Jean-Paul');
        $superadmin->setLastName('Tchomtchoua');
        $superadmin->setRole(User::ROLE_SUPERADMIN);
        $superadmin->setPhone('+237 699 12 34 56');
        $superadmin->setHourlyRate('0.00');
        $manager->persist($superadmin);

        $admin = new User();
        $admin->setEmail('cngonlend@guardtrack.cm');
        $admin->setPassword($this->passwordHasher->hashPassword($admin, 'password123'));
        $admin->setFirstName('Carine');
        $admin->setLastName('Ngo Nlend');
        $admin->setRole(User::ROLE_ADMIN);
        $admin->setPhone('+237 677 23 45 67');
        $admin->setHourlyRate('15.00');
        $manager->persist($admin);

        $superviseur = new User();
        $superviseur->setEmail('afokam@guardtrack.cm');
        $superviseur->setPassword($this->passwordHasher->hashPassword($superviseur, 'password123'));
        $superviseur->setFirstName('Alain');
        $superviseur->setLastName('Fokam');
        $superviseur->setRole(User::ROLE_SUPERVISEUR);
        $superviseur->setPhone('+237 699 34 56 78');
        $superviseur->setHourlyRate('14.00');
        $manager->persist($superviseur);

        $controleur = new User();
        $controleur->setEmail('betoundi@guardtrack.cm');
        $controleur->setPassword($this->passwordHasher->hashPassword($controleur, 'password123'));
        $controleur->setFirstName('Béatrice');
        $controleur->setLastName('Etoundi');
        $controleur->setRole(User::ROLE_CONTROLEUR);
        $controleur->setPhone('+237 688 45 67 89');
        $controleur->setHourlyRate('13.00');
        $manager->persist($controleur);

        $agent1 = new User();
        $agent1->setEmail('rkamga@guardtrack.cm');
        $agent1->setPassword($this->passwordHasher->hashPassword($agent1, 'password123'));
        $agent1->setFirstName('Roger');
        $agent1->setLastName('Kamga');
        $agent1->setRole(User::ROLE_AGENT);
        $agent1->setPhone('+237 677 56 78 90');
        $agent1->setHourlyRate('11.50');
        $agent1->setPinCode('12345');
        $manager->persist($agent1);

        $agent2 = new User();
        $agent2->setEmail('mzanga@guardtrack.cm');
        $agent2->setPassword($this->passwordHasher->hashPassword($agent2, 'password123'));
        $agent2->setFirstName('Madeleine');
        $agent2->setLastName('Zanga');
        $agent2->setRole(User::ROLE_AGENT);
        $agent2->setPhone('+237 699 67 89 01');
        $agent2->setHourlyRate('11.50');
        $agent2->setPinCode('23456');
        $manager->persist($agent2);

        $agent3 = new User();
        $agent3->setEmail('cabessolo@guardtrack.cm');
        $agent3->setPassword($this->passwordHasher->hashPassword($agent3, 'password123'));
        $agent3->setFirstName('Christian');
        $agent3->setLastName('Abessolo');
        $agent3->setRole(User::ROLE_AGENT);
        $agent3->setPhone('+237 688 78 90 12');
        $agent3->setHourlyRate('11.50');
        $agent3->setPinCode('34567');
        $manager->persist($agent3);

        // 4. Assignations
        $assignment1 = new Assignment();
        $assignment1->setAgent($agent1);
        $assignment1->setSite($site1);
        $assignment1->setStartDate(new \DateTimeImmutable('2026-04-01 08:00:00'));
        $assignment1->setStatus('ACTIVE');
        $manager->persist($assignment1);

        $assignment2 = new Assignment();
        $assignment2->setAgent($agent2);
        $assignment2->setSite($site2);
        $assignment2->setStartDate(new \DateTimeImmutable('2026-04-01 08:00:00'));
        $assignment2->setStatus('ACTIVE');
        $manager->persist($assignment2);

        $assignment3 = new Assignment();
        $assignment3->setAgent($agent3);
        $assignment3->setSite($site3);
        $assignment3->setStartDate(new \DateTimeImmutable('2026-04-01 08:00:00'));
        $assignment3->setStatus('ACTIVE');
        $manager->persist($assignment3);

        // 5. Timesheets (Planning/Feuilles de temps) - 7 derniers jours
        $sevenDaysAgo = (new \DateTimeImmutable('today'))->modify('-6 days')->format('Y-m-d');
        $this->createTimesheetsForAgent($manager, $agent1, $site1, $sevenDaysAgo, 7);
        $this->createTimesheetsForAgent($manager, $agent2, $site2, $sevenDaysAgo, 7);
        $this->createTimesheetsForAgent($manager, $agent3, $site3, $sevenDaysAgo, 7);

        // 6. Présences (pointages) pour test — dates relatives pour toujours avoir des données aujourd'hui
        $presence1 = new Presence();
        $presence1->setAgent($agent1);
        $presence1->setSite($site1);
        $presence1->setAssignment($assignment1);
        $presence1->setCheckIn(new \DateTimeImmutable('today 08:05:00'));
        $presence1->setStatus('PENDING');
        $presence1->setSuspicionScore(15);
        $manager->persist($presence1);

        $presence2 = new Presence();
        $presence2->setAgent($agent2);
        $presence2->setSite($site2);
        $presence2->setAssignment($assignment2);
        $presence2->setCheckIn(new \DateTimeImmutable('today 08:10:00'));
        $presence2->setStatus('PENDING');
        $presence2->setSuspicionScore(45);
        $manager->persist($presence2);

        // Présence validée (hier — historique)
        $presence3 = new Presence();
        $presence3->setAgent($agent1);
        $presence3->setSite($site1);
        $presence3->setAssignment($assignment1);
        $presence3->setCheckIn(new \DateTimeImmutable('yesterday 08:00:00'));
        $presence3->setCheckOut(new \DateTimeImmutable('yesterday 17:00:00'));
        $presence3->setStatus('VALIDATED');
        $presence3->setValidator($controleur);
        $presence3->setValidationDate(new \DateTimeImmutable('yesterday 17:30:00'));
        $presence3->setSuspicionScore(10);
        $manager->persist($presence3);

        $manager->flush();
    }

    /**
     * Crée des timesheets pour un agent sur une période donnée
     */
    private function createTimesheetsForAgent(
        ObjectManager $manager,
        User $agent,
        Site $site,
        string $startDate,
        int $days
    ): void {
        $start = new \DateTimeImmutable($startDate);
        
        for ($i = 0; $i < $days; $i++) {
            $date = $start->modify("+$i days");
            $dayOfWeek = (int) $date->format('N'); // 1 (lundi) à 7 (dimanche)
            
            // Pas de travail le samedi (6) et dimanche (7)
            if ($dayOfWeek >= 6) {
                continue;
            }
            
            $timesheet = new Timesheet();
            $timesheet->setAgent($agent);
            $timesheet->setSite($site);
            $timesheet->setDate($date);
            
            // Heures de travail : 8h par jour
            $timesheet->setHoursWorked('8.00');
            
            // Heures supplémentaires aléatoires (0 à 2h)
            $overtime = rand(0, 2) > 0 ? (string) rand(0, 2) . '.00' : '0.00';
            $timesheet->setOvertimeHours($overtime);
            
            // Heures de nuit (0h pour cet exemple)
            $timesheet->setNightHours('0.00');
            
            // Pause déjeuner : 30-60 minutes
            $timesheet->setBreakMinutes(rand(30, 60));
            
            // Statut : certaines validées, d'autres en attente
            $status = ($i < 5) ? 'VALIDATED' : 'PENDING';
            $timesheet->setStatus($status);
            
            $timesheet->setNotes($i === 0 ? 'Début de semaine' : null);
            
            $manager->persist($timesheet);
        }
    }
}
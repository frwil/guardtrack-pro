<?php

namespace App\Controller\Api;

use App\Entity\AppSettings;
use App\Entity\Assignment;
use App\Entity\Client;
use App\Entity\Incident;
use App\Entity\Presence;
use App\Entity\Round;
use App\Entity\RoundSite;
use App\Entity\Site;
use App\Entity\Timesheet;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/backup')]
#[IsGranted('ROLE_ADMIN')]
class BackupController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em
    ) {}

    /** GET /api/admin/backup — télécharge le backup complet en JSON */
    #[Route('', name: 'api_backup_export', methods: ['GET'])]
    public function export(): StreamedResponse
    {
        $data = [
            'meta' => [
                'version'    => '1.0',
                'app'        => 'GuardTrack Pro',
                'created_at' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
                'created_by' => $this->getUser()?->getEmail(),
            ],
            'users'       => $this->exportUsers(),
            'clients'     => $this->exportClients(),
            'sites'       => $this->exportSites(),
            'assignments' => $this->exportAssignments(),
            'rounds'      => $this->exportRounds(),
            'incidents'   => $this->exportIncidents(),
            'presences'   => $this->exportPresences(),
            'timesheets'  => $this->exportTimesheets(),
            'settings'    => $this->exportSettings(),
        ];

        $filename = 'guardtrack-backup-' . date('Ymd-His') . '.json';
        $json     = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $response = new StreamedResponse(function () use ($json) {
            echo $json;
        });

        $response->headers->set('Content-Type', 'application/json');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
        $response->headers->set('Content-Length', (string) strlen($json));
        $response->headers->set('Access-Control-Expose-Headers', 'Content-Disposition');

        return $response;
    }

    /** GET /api/admin/backup/stats — nombre d'enregistrements par entité */
    #[Route('/stats', name: 'api_backup_stats', methods: ['GET'])]
    public function stats(): JsonResponse
    {
        return $this->json([
            'users'       => $this->em->getRepository(User::class)->count([]),
            'clients'     => $this->em->getRepository(Client::class)->count([]),
            'sites'       => $this->em->getRepository(Site::class)->count([]),
            'assignments' => $this->em->getRepository(Assignment::class)->count([]),
            'rounds'      => $this->em->getRepository(Round::class)->count([]),
            'incidents'   => $this->em->getRepository(Incident::class)->count([]),
            'presences'   => $this->em->getRepository(Presence::class)->count([]),
            'timesheets'  => $this->em->getRepository(Timesheet::class)->count([]),
        ]);
    }

    // ─────────────────────────── Serializers ────────────────────────────── //

    private function exportUsers(): array
    {
        return array_map(function (User $u) {
            return [
                'id'         => $u->getId(),
                'firstName'  => $u->getFirstName(),
                'lastName'   => $u->getLastName(),
                'email'      => $u->getEmail(),
                'phone'      => $u->getPhone(),
                'role'       => $u->getRole(),
                'isActive'   => $u->isActive(),
                'createdAt'  => $u->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(User::class)->findAll());
    }

    private function exportClients(): array
    {
        return array_map(function (Client $c) {
            return [
                'id'          => $c->getId(),
                'name'        => $c->getName(),
                'siret'       => $c->getSiret(),
                'email'       => $c->getEmail(),
                'phone'       => $c->getPhone(),
                'address'     => $c->getAddress(),
                'billingRate' => $c->getBillingRate(),
                'isActive'    => $c->isActive(),
                'createdAt'   => $c->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Client::class)->findAll());
    }

    private function exportSites(): array
    {
        return array_map(function (Site $s) {
            return [
                'id'               => $s->getId(),
                'name'             => $s->getName(),
                'address'          => $s->getAddress(),
                'latitude'         => $s->getLatitude(),
                'longitude'        => $s->getLongitude(),
                'type'             => $s->getType(),
                'geofencingRadius' => $s->getGeofencingRadius(),
                'isActive'         => $s->isActive(),
                'clientId'         => $s->getClient()?->getId(),
                'parentId'         => $s->getParent()?->getId(),
                'createdAt'        => $s->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Site::class)->findAll());
    }

    private function exportAssignments(): array
    {
        return array_map(function (Assignment $a) {
            return [
                'id'        => $a->getId(),
                'agentId'   => $a->getAgent()?->getId(),
                'siteId'    => $a->getSite()?->getId(),
                'status'    => $a->getStatus(),
                'startDate' => $a->getStartDate()?->format(\DateTimeInterface::ATOM),
                'endDate'   => $a->getEndDate()?->format(\DateTimeInterface::ATOM),
                'createdAt' => $a->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Assignment::class)->findAll());
    }

    private function exportRounds(): array
    {
        return array_map(function (Round $r) {
            return [
                'id'             => $r->getId(),
                'name'           => $r->getName(),
                'agentId'        => $r->getAgent()?->getId(),
                'supervisorId'   => $r->getSupervisor()?->getId(),
                'status'         => $r->getStatus(),
                'scheduledStart' => $r->getScheduledStart()?->format(\DateTimeInterface::ATOM),
                'scheduledEnd'   => $r->getScheduledEnd()?->format(\DateTimeInterface::ATOM),
                'actualStart'    => $r->getActualStart()?->format(\DateTimeInterface::ATOM),
                'actualEnd'      => $r->getActualEnd()?->format(\DateTimeInterface::ATOM),
                'createdAt'      => $r->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Round::class)->findAll());
    }

    private function exportIncidents(): array
    {
        return array_map(function (Incident $i) {
            return [
                'id'          => $i->getId(),
                'title'       => $i->getTitle(),
                'description' => $i->getDescription(),
                'category'    => $i->getCategory(),
                'severity'    => $i->getSeverity(),
                'status'      => $i->getStatus(),
                'siteId'      => $i->getSite()?->getId(),
                'reporterId'  => $i->getReporter()?->getId(),
                'assignedToId'=> $i->getAssignedTo()?->getId(),
                'reportedAt'  => $i->getReportedAt()?->format(\DateTimeInterface::ATOM),
                'resolvedAt'  => $i->getResolvedAt()?->format(\DateTimeInterface::ATOM),
                'resolution'  => $i->getResolution(),
                'createdAt'   => $i->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Incident::class)->findAll());
    }

    private function exportPresences(): array
    {
        return array_map(function (Presence $p) {
            return [
                'id'             => $p->getId(),
                'agentId'        => $p->getAgent()?->getId(),
                'siteId'         => $p->getSite()?->getId(),
                'assignmentId'   => $p->getAssignment()?->getId(),
                'checkIn'        => $p->getCheckIn()?->format(\DateTimeInterface::ATOM),
                'checkOut'       => $p->getCheckOut()?->format(\DateTimeInterface::ATOM),
                'status'         => $p->getStatus(),
                'suspicionScore' => $p->getSuspicionScore(),
                'gpsLatitude'    => $p->getGpsLatitude(),
                'gpsLongitude'   => $p->getGpsLongitude(),
                'createdAt'      => $p->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Presence::class)->findAll());
    }

    private function exportTimesheets(): array
    {
        return array_map(function (Timesheet $t) {
            return [
                'id'            => $t->getId(),
                'agentId'       => $t->getAgent()?->getId(),
                'siteId'        => $t->getSite()?->getId(),
                'date'          => $t->getDate()?->format('Y-m-d'),
                'hoursWorked'   => $t->getHoursWorked(),
                'overtimeHours' => $t->getOvertimeHours(),
                'nightHours'    => $t->getNightHours(),
                'breakMinutes'  => $t->getBreakMinutes(),
                'status'        => $t->getStatus(),
                'notes'         => $t->getNotes(),
                'createdAt'     => $t->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ];
        }, $this->em->getRepository(Timesheet::class)->findAll());
    }

    private function exportSettings(): array
    {
        $settings = [];
        foreach ($this->em->getRepository(AppSettings::class)->findAll() as $s) {
            $settings[$s->getSettingKey()] = $s->getSettingValue();
        }
        return $settings;
    }
}

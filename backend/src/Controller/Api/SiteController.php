<?php

namespace App\Controller\Api;

use App\Entity\Site;
use App\Entity\User;
use App\Repository\PresenceRepository;
use App\Repository\SiteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/sites')]
#[IsGranted('ROLE_CONTROLEUR')]
class SiteController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private SiteRepository $siteRepository,
        private PresenceRepository $presenceRepository
    ) {}

    #[Route('', name: 'api_sites_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $criteria = [];
        $orderBy = ['name' => 'ASC'];

        if ($clientId = $request->query->get('clientId')) {
            $criteria['client'] = $clientId;
        }
        if ($type = $request->query->get('type')) {
            $criteria['type'] = $type;
        }
        if ($isActive = $request->query->get('isActive')) {
            $criteria['isActive'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN);
        }

        $sites = $this->siteRepository->findBy($criteria, $orderBy);

        return $this->json(array_map(fn(Site $s) => [
            'id' => $s->getId(),
            'name' => $s->getName(),
            'client' => $s->getClient()->getName(),
            'type' => $s->getType(),
            'address' => $s->getAddress(),
            'latitude' => $s->getLatitude(),
            'longitude' => $s->getLongitude(),
            'hasQrCode' => $s->getQrCode() !== null,
            'isActive' => $s->isActive(),
        ], $sites));
    }

    #[Route('/{id}', name: 'api_sites_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $site = $this->siteRepository->find($id);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $site->getId(),
            'name' => $site->getName(),
            'client' => [
                'id' => $site->getClient()->getId(),
                'name' => $site->getClient()->getName(),
            ],
            'parent' => $site->getParent() ? [
                'id' => $site->getParent()->getId(),
                'name' => $site->getParent()->getName(),
            ] : null,
            'children' => array_map(fn($c) => [
                'id' => $c->getId(),
                'name' => $c->getName(),
            ], $site->getChildren()->toArray()),
            'type' => $site->getType(),
            'address' => $site->getAddress(),
            'latitude' => $site->getLatitude(),
            'longitude' => $site->getLongitude(),
            'qrCode' => $site->getQrCode(),
            'geofencingRadius' => $site->getGeofencingRadius(),
            'isActive' => $site->isActive(),
            'createdAt' => $site->getCreatedAt()->format('c'),
            'stats' => [
                'activeAssignments' => $site->getAssignments()->filter(fn($a) => $a->getStatus() === 'ACTIVE')->count(),
                'todayPresences' => $this->presenceRepository->createQueryBuilder('p')
                    ->select('COUNT(p.id)')
                    ->where('p.site = :site')
                    ->andWhere('p.checkIn >= :start')
                    ->andWhere('p.checkIn <= :end')
                    ->setParameter('site',  $site->getId())
                    ->setParameter('start', new \DateTimeImmutable('today 00:00:00'))
                    ->setParameter('end',   new \DateTimeImmutable('today 23:59:59'))
                    ->getQuery()
                    ->getSingleScalarResult(),
            ]
        ]);
    }

    #[Route('', name: 'api_sites_create', methods: ['POST'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $site = new Site();
        $site->setName($data['name']);
        $site->setAddress($data['address']);
        $site->setType($data['type'] ?? 'PRIMARY');
        $site->setLatitude($data['latitude'] ?? null);
        $site->setLongitude($data['longitude'] ?? null);
        $site->setGeofencingRadius($data['geofencingRadius'] ?? 100);
        $site->setIsActive($data['isActive'] ?? true);

        // Client
        if (isset($data['clientId'])) {
            $client = $this->entityManager->getReference(\App\Entity\Client::class, $data['clientId']);
            $site->setClient($client);
        }

        // Parent (site parent pour hiérarchie)
        if (isset($data['parentId'])) {
            $parent = $this->siteRepository->find($data['parentId']);
            if ($parent) {
                $site->setParent($parent);
            }
        }

        // Générer un QR code unique
        $site->setQrCode(uniqid('site_', true));

        $this->entityManager->persist($site);
        $this->entityManager->flush();

        return $this->json([
            'id' => $site->getId(),
            'name' => $site->getName(),
            'qrCode' => $site->getQrCode(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_sites_update', methods: ['PUT'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function update(int $id, Request $request): JsonResponse
    {
        $site = $this->siteRepository->find($id);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['name'])) $site->setName($data['name']);
        if (isset($data['address'])) $site->setAddress($data['address']);
        if (isset($data['type'])) $site->setType($data['type']);
        if (isset($data['latitude'])) $site->setLatitude($data['latitude']);
        if (isset($data['longitude'])) $site->setLongitude($data['longitude']);
        if (isset($data['geofencingRadius'])) $site->setGeofencingRadius($data['geofencingRadius']);
        if (isset($data['isActive'])) $site->setIsActive($data['isActive']);

        if (isset($data['parentId'])) {
            $parent = $data['parentId'] ? $this->siteRepository->find($data['parentId']) : null;
            $site->setParent($parent);
        }

        $this->entityManager->flush();

        return $this->json(['message' => 'Site updated successfully']);
    }

    #[Route('/{id}/qr', name: 'api_sites_qr_regenerate', methods: ['POST'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function regenerateQr(int $id): JsonResponse
    {
        $site = $this->siteRepository->find($id);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        $site->setQrCode(uniqid('site_', true));
        $this->entityManager->flush();

        return $this->json([
            'qrCode' => $site->getQrCode(),
        ]);
    }

    #[Route('/qr/{qrCode}', name: 'api_sites_by_qr', methods: ['GET'])]
    public function getByQr(string $qrCode): JsonResponse
    {
        $site = $this->siteRepository->findOneBy(['qrCode' => $qrCode]);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        /** @var User $user */
        $user = $this->getUser();

        // Vérifier si l'agent est assigné à ce site
        $isAssigned = $site->getAssignments()->exists(function ($key, $assignment) use ($user) {
            return $assignment->getAgent()->getId() === $user->getId()
                && $assignment->getStatus() === 'ACTIVE';
        });

        return $this->json([
            'id' => $site->getId(),
            'name' => $site->getName(),
            'address' => $site->getAddress(),
            'latitude' => $site->getLatitude(),
            'longitude' => $site->getLongitude(),
            'geofencingRadius' => $site->getGeofencingRadius(),
            'isAssigned' => $isAssigned,
        ]);
    }

    #[Route('/{id}/toggle', name: 'api_sites_toggle', methods: ['PATCH'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function toggle(int $id): JsonResponse
    {
        $site = $this->siteRepository->find($id);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        $site->setIsActive(!$site->isActive());
        $this->entityManager->flush();

        return $this->json(['isActive' => $site->isActive()]);
    }

    #[Route('/{id}/assignments', name: 'api_sites_assignments', methods: ['GET'])]
    public function assignments(int $id): JsonResponse
    {
        $site = $this->siteRepository->find($id);

        if (!$site) {
            return $this->json(['error' => 'Site not found'], Response::HTTP_NOT_FOUND);
        }

        // ✅ Ne plus filtrer, retourner TOUTES les affectations (pas seulement ACTIVE)
        $allAssignments = $site->getAssignments();

        return $this->json(array_map(fn($a) => [
            'id' => $a->getId(),
            'agent' => [
                'id' => $a->getAgent()->getId(),
                'fullName' => $a->getAgent()->getFullName(),
            ],
            'status' => $a->getStatus(), // ✅ Ajouter le statut
            'startDate' => $a->getStartDate()->format('c'),
            'endDate' => $a->getEndDate()?->format('c'),
        ], $allAssignments->toArray()));
    }
}
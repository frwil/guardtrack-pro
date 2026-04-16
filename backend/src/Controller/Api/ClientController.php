<?php

namespace App\Controller\Api;

use App\Entity\Client;
use App\Repository\ClientRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/clients')]
#[IsGranted('ROLE_SUPERVISEUR')]
class ClientController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ClientRepository $clientRepository
    ) {
    }

    #[Route('', name: 'api_clients_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $isActive = $request->query->get('isActive');
        $criteria = [];
        
        if ($isActive !== null) {
            $criteria['isActive'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN);
        }
        
        $clients = $this->clientRepository->findBy($criteria, ['name' => 'ASC']);
        
        return $this->json(array_map(fn(Client $c) => [
            'id' => $c->getId(),
            'name' => $c->getName(),
            'siret' => $c->getSiret(),
            'email' => $c->getEmail(),
            'phone' => $c->getPhone(),
            'billingRate' => $c->getBillingRate(),
            'isActive' => $c->isActive(),
            'sitesCount' => $c->getSites()->count(),
        ], $clients));
    }

    #[Route('/{id}', name: 'api_clients_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        $client = $this->clientRepository->find($id);
        
        if (!$client) {
            return $this->json(['error' => 'Client not found'], Response::HTTP_NOT_FOUND);
        }
        
        return $this->json([
            'id' => $client->getId(),
            'name' => $client->getName(),
            'siret' => $client->getSiret(),
            'email' => $client->getEmail(),
            'phone' => $client->getPhone(),
            'address' => $client->getAddress(),
            'billingRate' => $client->getBillingRate(),
            'isActive' => $client->isActive(),
            'createdAt' => $client->getCreatedAt()->format('c'),
            'sites' => array_map(fn($s) => [
                'id' => $s->getId(),
                'name' => $s->getName(),
                'type' => $s->getType(),
                'isActive' => $s->isActive(),
            ], $client->getSites()->toArray()),
        ]);
    }

    #[Route('', name: 'api_clients_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        $client = new Client();
        $client->setName($data['name']);
        $client->setSiret($data['siret'] ?? null);
        $client->setEmail($data['email'] ?? null);
        $client->setPhone($data['phone'] ?? null);
        $client->setAddress($data['address'] ?? null);
        $client->setBillingRate($data['billingRate'] ?? '15.00');
        $client->setIsActive($data['isActive'] ?? true);
        
        $this->entityManager->persist($client);
        $this->entityManager->flush();
        
        return $this->json([
            'id' => $client->getId(),
            'name' => $client->getName(),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_clients_update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]
    public function update(int $id, Request $request): JsonResponse
    {
        $client = $this->clientRepository->find($id);
        
        if (!$client) {
            return $this->json(['error' => 'Client not found'], Response::HTTP_NOT_FOUND);
        }
        
        $data = json_decode($request->getContent(), true);
        
        if (isset($data['name'])) $client->setName($data['name']);
        if (isset($data['siret'])) $client->setSiret($data['siret']);
        if (isset($data['email'])) $client->setEmail($data['email']);
        if (isset($data['phone'])) $client->setPhone($data['phone']);
        if (isset($data['address'])) $client->setAddress($data['address']);
        if (isset($data['billingRate'])) $client->setBillingRate($data['billingRate']);
        if (isset($data['isActive'])) $client->setIsActive($data['isActive']);
        
        $this->entityManager->flush();
        
        return $this->json(['message' => 'Client updated successfully']);
    }

    #[Route('/{id}/toggle', name: 'api_clients_toggle', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggle(int $id): JsonResponse
    {
        $client = $this->clientRepository->find($id);
        
        if (!$client) {
            return $this->json(['error' => 'Client not found'], Response::HTTP_NOT_FOUND);
        }
        
        $client->setIsActive(!$client->isActive());
        $this->entityManager->flush();
        
        return $this->json(['isActive' => $client->isActive()]);
    }

    #[Route('/{id}/sites', name: 'api_clients_sites', methods: ['GET'])]
    public function sites(int $id): JsonResponse
    {
        $client = $this->clientRepository->find($id);
        
        if (!$client) {
            return $this->json(['error' => 'Client not found'], Response::HTTP_NOT_FOUND);
        }
        
        return $this->json(array_map(fn($s) => [
            'id' => $s->getId(),
            'name' => $s->getName(),
            'type' => $s->getType(),
            'address' => $s->getAddress(),
            'isActive' => $s->isActive(),
        ], $client->getSites()->toArray()));
    }
}
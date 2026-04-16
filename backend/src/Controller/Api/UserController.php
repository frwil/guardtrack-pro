<?php

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/users')]
class UserController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $userRepository,
        private UserPasswordHasherInterface $passwordHasher
    ) {
    }

    // GET /api/users - Liste tous les utilisateurs (selon permissions)
    #[Route('', name: 'api_users_list', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function list(Request $request): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        
        // Filtrage selon le rôle
        $criteria = [];
        $orderBy = ['lastName' => 'ASC', 'firstName' => 'ASC'];
        
        // Filtres optionnels
        if ($role = $request->query->get('role')) {
            $criteria['role'] = $role;
        }
        if ($isActive = $request->query->get('isActive')) {
            $criteria['isActive'] = filter_var($isActive, FILTER_VALIDATE_BOOLEAN);
        }
        
        // Selon le rôle, limiter les utilisateurs visibles
        if ($currentUser->isControleur() && !$currentUser->isSuperviseur()) {
            // Contrôleur ne voit que les agents
            $criteria['role'] = User::ROLE_AGENT;
        } elseif ($currentUser->isSuperviseur() && !$currentUser->isAdmin()) {
            // Superviseur voit agents et contrôleurs
            $users = $this->userRepository->findByRoleIn([User::ROLE_AGENT, User::ROLE_CONTROLEUR]);
            return $this->json(array_map(fn($u) => $u->toArray(), $users));
        }
        
        $users = $this->userRepository->findBy($criteria, $orderBy);
        
        return $this->json(array_map(fn($user) => $user->toArray(), $users));
    }

    // GET /api/users/agents - Liste des agents actifs
    #[Route('/agents', name: 'api_users_agents', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function agents(): JsonResponse
    {
        $agents = $this->userRepository->findActiveAgents();
        return $this->json(array_map(fn($user) => $user->toArray(), $agents));
    }

    // GET /api/users/controleurs - Liste des contrôleurs
    #[Route('/controleurs', name: 'api_users_controleurs', methods: ['GET'])]
    #[IsGranted('ROLE_SUPERVISEUR')]
    public function controleurs(): JsonResponse
    {
        $controleurs = $this->userRepository->findByRole(User::ROLE_CONTROLEUR);
        return $this->json(array_map(fn($user) => $user->toArray(), $controleurs));
    }

    // GET /api/users/superviseurs - Liste des superviseurs
    #[Route('/superviseurs', name: 'api_users_superviseurs', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function superviseurs(): JsonResponse
    {
        $superviseurs = $this->userRepository->findByRole(User::ROLE_SUPERVISEUR);
        return $this->json(array_map(fn($user) => $user->toArray(), $superviseurs));
    }

    // GET /api/users/{id} - Détail d'un utilisateur
    #[Route('/{id}', name: 'api_users_show', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function show(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        
        // Vérifier les permissions
        if (!$this->canViewUser($currentUser, $user)) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        return $this->json($user->toArray($currentUser->isAdmin()));
    }

    // GET /api/users/me - Profil de l'utilisateur connecté
    #[Route('/me', name: 'api_users_me', methods: ['GET'])]
    #[IsGranted('ROLE_AGENT')]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();
        return $this->json($user->toArray(true));
    }

    // POST /api/users - Créer un utilisateur
    #[Route('', name: 'api_users_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        // Vérifier si l'email existe déjà
        $existingUser = $this->userRepository->findOneBy(['email' => $data['email'] ?? '']);
        if ($existingUser) {
            return $this->json(['error' => 'Email already exists'], Response::HTTP_CONFLICT);
        }
        
        $user = new User();
        $user->setEmail($data['email']);
        $user->setPassword($this->passwordHasher->hashPassword($user, $data['password'] ?? 'password123'));
        $user->setFirstName($data['firstName'] ?? null);
        $user->setLastName($data['lastName'] ?? null);
        $user->setRole($data['role'] ?? User::ROLE_AGENT);
        $user->setPhone($data['phone'] ?? null);
        $user->setHourlyRate($data['hourlyRate'] ?? '11.50');
        $user->setIsActive($data['isActive'] ?? true);
        
        if (isset($data['pinCode'])) {
            $user->setPinCode($data['pinCode']);
        }
        
        $this->entityManager->persist($user);
        $this->entityManager->flush();
        
        return $this->json($user->toArray(true), Response::HTTP_CREATED);
    }

    // PUT /api/users/{id} - Mettre à jour un utilisateur
    #[Route('/{id}', name: 'api_users_update', methods: ['PUT'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        
        // Vérifier les permissions d'édition
        if (!$this->canEditUser($currentUser, $user)) {
            return $this->json(['error' => 'Access denied'], Response::HTTP_FORBIDDEN);
        }
        
        $data = json_decode($request->getContent(), true);
        
        // Champs modifiables par tous
        if (isset($data['firstName'])) {
            $user->setFirstName($data['firstName']);
        }
        if (isset($data['lastName'])) {
            $user->setLastName($data['lastName']);
        }
        if (isset($data['phone'])) {
            $user->setPhone($data['phone']);
        }
        
        // Champs modifiables par l'utilisateur lui-même ou admin
        if ($currentUser->getId() === $user->getId() || $currentUser->isAdmin()) {
            if (isset($data['pinCode'])) {
                $user->setPinCode($data['pinCode'] ?: null);
            }
        }
        
        // Champs modifiables uniquement par admin+
        if ($currentUser->isAdmin()) {
            if (isset($data['role']) && $this->canChangeRole($currentUser, $data['role'])) {
                $user->setRole($data['role']);
            }
            if (isset($data['hourlyRate'])) {
                $user->setHourlyRate($data['hourlyRate']);
            }
            if (isset($data['isActive'])) {
                $user->setIsActive($data['isActive']);
            }
        }
        
        // Mot de passe
        if (isset($data['password']) && !empty($data['password'])) {
            if ($currentUser->getId() === $user->getId() || $currentUser->isAdmin()) {
                $user->setPassword($this->passwordHasher->hashPassword($user, $data['password']));
            }
        }
        
        $this->entityManager->flush();
        
        return $this->json($user->toArray($currentUser->isAdmin() || $currentUser->getId() === $user->getId()));
    }

    // PATCH /api/users/{id}/toggle - Activer/désactiver un utilisateur
    #[Route('/{id}/toggle', name: 'api_users_toggle', methods: ['PATCH'])]
    #[IsGranted('ROLE_ADMIN')]
    public function toggle(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        
        // Ne pas se désactiver soi-même
        if ($currentUser->getId() === $user->getId()) {
            return $this->json(['error' => 'Cannot deactivate yourself'], Response::HTTP_BAD_REQUEST);
        }
        
        $user->setIsActive(!$user->isActive());
        $this->entityManager->flush();
        
        return $this->json(['isActive' => $user->isActive()]);
    }

    // DELETE /api/users/{id} - Supprimer un utilisateur
    #[Route('/{id}', name: 'api_users_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function delete(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        /** @var User $currentUser */
        $currentUser = $this->getUser();
        
        // Ne pas se supprimer soi-même
        if ($currentUser->getId() === $user->getId()) {
            return $this->json(['error' => 'Cannot delete yourself'], Response::HTTP_BAD_REQUEST);
        }
        
        // Seul SuperAdmin peut supprimer un Admin
        if ($user->isAdmin() && !$currentUser->isSuperAdmin()) {
            return $this->json(['error' => 'Cannot delete admin user'], Response::HTTP_FORBIDDEN);
        }
        
        $this->entityManager->remove($user);
        $this->entityManager->flush();
        
        return $this->json(['message' => 'User deleted successfully']);
    }

    // GET /api/users/{id}/assignments - Affectations d'un utilisateur
    #[Route('/{id}/assignments', name: 'api_users_assignments', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function assignments(int $id): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        $assignments = $user->getActiveAssignments()->toArray();
        
        return $this->json(array_map(fn($a) => [
            'id' => $a->getId(),
            'site' => [
                'id' => $a->getSite()->getId(),
                'name' => $a->getSite()->getName(),
            ],
            'startDate' => $a->getStartDate()->format('c'),
            'endDate' => $a->getEndDate()?->format('c'),
            'status' => $a->getStatus(),
        ], $assignments));
    }

    // GET /api/users/{id}/presences - Présences d'un utilisateur
    #[Route('/{id}/presences', name: 'api_users_presences', methods: ['GET'])]
    #[IsGranted('ROLE_CONTROLEUR')]
    public function presences(int $id, Request $request): JsonResponse
    {
        $user = $this->userRepository->find($id);
        
        if (!$user) {
            return $this->json(['error' => 'User not found'], Response::HTTP_NOT_FOUND);
        }
        
        $limit = $request->query->get('limit', 50);
        $presences = $user->getPresences()->slice(0, $limit);
        
        return $this->json(array_map(fn($p) => [
            'id' => $p->getId(),
            'site' => $p->getSite()->getName(),
            'checkIn' => $p->getCheckIn()->format('c'),
            'checkOut' => $p->getCheckOut()?->format('c'),
            'status' => $p->getStatus(),
        ], $presences));
    }

    // Méthodes privées de vérification des permissions
    private function canViewUser(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }
        
        if ($currentUser->isAdmin()) {
            return !$targetUser->isSuperAdmin() || $currentUser->isSuperAdmin();
        }
        
        if ($currentUser->isSuperviseur()) {
            return in_array($targetUser->getRole(), [User::ROLE_AGENT, User::ROLE_CONTROLEUR]);
        }
        
        if ($currentUser->isControleur()) {
            return $targetUser->getRole() === User::ROLE_AGENT;
        }
        
        return false;
    }

    private function canEditUser(User $currentUser, User $targetUser): bool
    {
        if ($currentUser->getId() === $targetUser->getId()) {
            return true;
        }
        
        if ($currentUser->isAdmin()) {
            return !$targetUser->isSuperAdmin() || $currentUser->isSuperAdmin();
        }
        
        return false;
    }

    private function canChangeRole(User $currentUser, string $newRole): bool
    {
        $newRoleLevel = User::ROLE_HIERARCHY[$newRole] ?? 0;
        $currentUserLevel = $currentUser->getRoleLevel();
        
        // SuperAdmin peut tout faire
        if ($currentUser->isSuperAdmin()) {
            return true;
        }
        
        // Admin ne peut pas créer de SuperAdmin
        if ($currentUser->isAdmin()) {
            return $newRoleLevel < User::ROLE_HIERARCHY[User::ROLE_ADMIN];
        }
        
        return false;
    }
}
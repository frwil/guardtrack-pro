<?php

namespace App\Controller\Api;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

class AuthController extends AbstractController
{
    #[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(
        Request $request,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher,
        JWTTokenManagerInterface $jwtManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            return $this->json([
                'code' => 400,
                'message' => 'Email and password are required'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Chercher l'utilisateur
        $user = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json([
                'code' => 401,
                'message' => 'Invalid credentials'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Vérifier le mot de passe
        if (!$passwordHasher->isPasswordValid($user, $password)) {
            return $this->json([
                'code' => 401,
                'message' => 'Invalid credentials'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Vérifier si le compte est actif
        if (!$user->isActive()) {
            return $this->json([
                'code' => 403,
                'message' => 'Account is disabled'
            ], Response::HTTP_FORBIDDEN);
        }

        // Mettre à jour la dernière connexion
        $user->setLastLoginAt(new \DateTimeImmutable());
        $entityManager->flush();

        // Générer le token JWT
        $token = $jwtManager->create($user);

        return $this->json([
            'token' => $token,
            'user' => $user->toArray()
        ]);
    }

    #[Route('/api/auth/verify-pin', name: 'api_auth_verify_pin', methods: ['POST'])]
    public function verifyPin(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTTokenManagerInterface $jwtManager
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $pin = $data['pin'] ?? '';

        if (!$email || !$pin) {
            return $this->json([
                'code' => 400,
                'message' => 'Email and PIN are required'
            ], Response::HTTP_BAD_REQUEST);
        }

        $user = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user) {
            return $this->json([
                'code' => 401,
                'message' => 'Invalid credentials'
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->isActive()) {
            return $this->json([
                'code' => 403,
                'message' => 'Account is disabled'
            ], Response::HTTP_FORBIDDEN);
        }

        // Vérifier le PIN
        if (!$user->verifyPinCode($pin)) {
            return $this->json([
                'code' => 401,
                'message' => 'Invalid PIN'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Mettre à jour la dernière connexion
        $user->setLastLoginAt(new \DateTimeImmutable());
        $entityManager->flush();

        // Générer le token JWT
        $token = $jwtManager->create($user);

        return $this->json([
            'token' => $token,
            'user' => $user->toArray()
        ]);
    }

    #[Route('/api/auth/me', name: 'api_auth_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if (!$user) {
            return $this->json([
                'code' => 401,
                'message' => 'Not authenticated'
            ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'user' => $user->toArray()
        ]);
    }

    #[Route('/api/auth/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            return $this->json([
                'code' => 400,
                'message' => 'Email and password are required'
            ], Response::HTTP_BAD_REQUEST);
        }

        // Vérifier si l'email existe déjà
        $existingUser = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return $this->json([
                'code' => 409,
                'message' => 'Email already exists'
            ], Response::HTTP_CONFLICT);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setPassword($passwordHasher->hashPassword($user, $password));
        $user->setFirstName($data['firstName'] ?? null);
        $user->setLastName($data['lastName'] ?? null);
        $user->setRole($data['role'] ?? User::ROLE_AGENT);
        $user->setPhone($data['phone'] ?? null);
        $user->setIsActive(true);

        $entityManager->persist($user);
        $entityManager->flush();

        return $this->json([
            'message' => 'User registered successfully',
            'user' => $user->toArray()
        ], Response::HTTP_CREATED);
    }
}
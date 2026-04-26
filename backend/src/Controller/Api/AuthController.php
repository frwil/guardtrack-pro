<?php

namespace App\Controller\Api;

use App\Entity\ActivityLog;
use App\Entity\User;
use App\Service\ActivityLogger;
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
    public function __construct(private ActivityLogger $activityLogger) {}

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

        $user = $entityManager->getRepository(User::class)->findOneBy(['email' => $email]);

        if (!$user) {
            $this->activityLogger->log(
                ActivityLog::ACTION_LOGIN_FAILED,
                ActivityLog::ENTITY_USER,
                ['email' => $email, 'reason' => 'user_not_found'],
                null,
                ActivityLog::STATUS_FAILED,
            );
            return $this->json(['code' => 401, 'message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$passwordHasher->isPasswordValid($user, $password)) {
            $this->activityLogger->log(
                ActivityLog::ACTION_LOGIN_FAILED,
                ActivityLog::ENTITY_USER,
                ['email' => $email, 'reason' => 'wrong_password'],
                (string) $user->getId(),
                ActivityLog::STATUS_FAILED,
                null,
                $user,
            );
            return $this->json(['code' => 401, 'message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->isActive()) {
            $this->activityLogger->log(
                ActivityLog::ACTION_LOGIN_FAILED,
                ActivityLog::ENTITY_USER,
                ['email' => $email, 'reason' => 'account_disabled'],
                (string) $user->getId(),
                ActivityLog::STATUS_FAILED,
                null,
                $user,
            );
            return $this->json(['code' => 403, 'message' => 'Account is disabled'], Response::HTTP_FORBIDDEN);
        }

        $user->setLastLoginAt(new \DateTimeImmutable());
        $entityManager->flush();

        $this->activityLogger->log(
            ActivityLog::ACTION_LOGIN,
            ActivityLog::ENTITY_USER,
            ['method' => 'password'],
            (string) $user->getId(),
            ActivityLog::STATUS_SUCCESS,
            null,
            $user,
        );

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
            $this->activityLogger->log(
                ActivityLog::ACTION_LOGIN_FAILED,
                ActivityLog::ENTITY_USER,
                ['email' => $email, 'reason' => 'user_not_found', 'method' => 'pin'],
                null,
                ActivityLog::STATUS_FAILED,
            );
            return $this->json(['code' => 401, 'message' => 'Invalid credentials'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->isActive()) {
            return $this->json(['code' => 403, 'message' => 'Account is disabled'], Response::HTTP_FORBIDDEN);
        }

        if (!$user->verifyPinCode($pin)) {
            $this->activityLogger->log(
                ActivityLog::ACTION_PIN_VERIFICATION,
                ActivityLog::ENTITY_USER,
                ['reason' => 'wrong_pin'],
                (string) $user->getId(),
                ActivityLog::STATUS_FAILED,
                null,
                $user,
            );
            return $this->json(['code' => 401, 'message' => 'Invalid PIN'], Response::HTTP_UNAUTHORIZED);
        }

        $user->setLastLoginAt(new \DateTimeImmutable());
        $entityManager->flush();

        $this->activityLogger->log(
            ActivityLog::ACTION_PIN_VERIFICATION,
            ActivityLog::ENTITY_USER,
            ['method' => 'pin'],
            (string) $user->getId(),
            ActivityLog::STATUS_SUCCESS,
            null,
            $user,
        );

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
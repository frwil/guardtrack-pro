<?php

namespace App\Controller\Api;

use App\Entity\ActivityLog;
use App\Entity\User;
use App\Service\ActivityLogger;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
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

    // ─────────────────────── FORGOT / RESET PASSWORD ─────────────────────── //

    #[Route('/api/auth/forgot-password', name: 'api_auth_forgot_password', methods: ['POST'])]
    public function forgotPassword(
        Request $request,
        EntityManagerInterface $em,
    ): JsonResponse {
        $data  = json_decode($request->getContent(), true);
        $email = trim($data['email'] ?? '');

        if (!$email) {
            return $this->json(['message' => 'Email requis'], Response::HTTP_BAD_REQUEST);
        }

        /** @var User|null $user */
        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);

        // Toujours renvoyer la même réponse pour ne pas divulguer les emails existants
        if ($user && $user->isActive()) {
            $token     = bin2hex(random_bytes(32)); // 64 caractères hex
            $expiresAt = new \DateTimeImmutable('+1 hour');

            $user->setResetPasswordToken($token);
            $user->setResetPasswordTokenExpiresAt($expiresAt);
            $em->flush();

            // Construction du lien de réinitialisation
            $frontendUrl = $data['frontendUrl'] ?? 'http://localhost:3000';
            $resetLink   = rtrim($frontendUrl, '/') . '/reset-password?token=' . $token;

            // Tentative d'envoi d'email (best-effort)
            $subject = 'Réinitialisation de votre mot de passe';
            $body    = "Bonjour {$user->getFirstName()},\n\n"
                     . "Vous avez demandé la réinitialisation de votre mot de passe.\n\n"
                     . "Cliquez sur ce lien (valable 1 heure) :\n{$resetLink}\n\n"
                     . "Si vous n'avez pas fait cette demande, ignorez cet email.\n\n"
                     . "L'équipe GuardTrack Pro";

            $headers = "From: noreply@guardtrack.pro\r\nContent-Type: text/plain; charset=utf-8";

            @mail($user->getEmail(), $subject, $body, $headers);

            $this->activityLogger->log(
                'PASSWORD_RESET_REQUEST',
                'user',
                ['email' => $email, 'expiresAt' => $expiresAt->format('c')],
                (string) $user->getId(),
                ActivityLog::STATUS_SUCCESS,
                null,
                $user,
            );
        }

        return $this->json([
            'message' => 'Si cet email existe, un lien de réinitialisation a été envoyé. Contactez votre administrateur si vous ne le recevez pas.',
        ]);
    }

    #[Route('/api/auth/reset-password/validate', name: 'api_auth_reset_password_validate', methods: ['GET'])]
    public function validateResetToken(
        Request $request,
        EntityManagerInterface $em,
    ): JsonResponse {
        $token = $request->query->get('token', '');

        if (!$token) {
            return $this->json(['valid' => false, 'message' => 'Token manquant'], Response::HTTP_BAD_REQUEST);
        }

        $user = $em->getRepository(User::class)->findOneBy(['resetPasswordToken' => $token]);

        if (!$user || !$user->isResetTokenValid($token)) {
            return $this->json(['valid' => false, 'message' => 'Token invalide ou expiré'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->json(['valid' => true, 'email' => $user->getEmail()]);
    }

    #[Route('/api/auth/reset-password', name: 'api_auth_reset_password', methods: ['POST'])]
    public function resetPassword(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher,
    ): JsonResponse {
        $data     = json_decode($request->getContent(), true);
        $token    = $data['token'] ?? '';
        $password = $data['password'] ?? '';

        if (!$token || !$password) {
            return $this->json(['message' => 'Token et mot de passe requis'], Response::HTTP_BAD_REQUEST);
        }

        if (strlen($password) < 8) {
            return $this->json(['message' => 'Le mot de passe doit contenir au moins 8 caractères'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var User|null $user */
        $user = $em->getRepository(User::class)->findOneBy(['resetPasswordToken' => $token]);

        if (!$user || !$user->isResetTokenValid($token)) {
            return $this->json(['message' => 'Token invalide ou expiré'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user->setPassword($passwordHasher->hashPassword($user, $password));
        $user->setResetPasswordToken(null);
        $user->setResetPasswordTokenExpiresAt(null);
        $em->flush();

        $this->activityLogger->log(
            'PASSWORD_RESET_SUCCESS',
            'user',
            ['email' => $user->getEmail()],
            (string) $user->getId(),
            ActivityLog::STATUS_SUCCESS,
            null,
            $user,
        );

        return $this->json(['message' => 'Mot de passe réinitialisé avec succès']);
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
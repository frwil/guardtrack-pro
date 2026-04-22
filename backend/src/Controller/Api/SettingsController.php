<?php

namespace App\Controller\Api;

use App\Entity\AppSettings;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/settings')]
class SettingsController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $entityManager
    ) {}

    #[Route('', name: 'api_settings_get', methods: ['GET'])]
    // ✅ Pas de restriction - accessible à tous les utilisateurs authentifiés
    // Les agents ont besoin de lire la configuration IA
    public function getSettings(): JsonResponse
    {
        $settings = $this->getDefaultSettings();

        // Charger les valeurs depuis la base de données
        $repo = $this->entityManager->getRepository(AppSettings::class);

        foreach ($settings as $key => $value) {
            $dbSetting = $repo->findOneBy(['settingKey' => $key]);
            if ($dbSetting) {
                $settings[$key] = $dbSetting->getSettingValue();
            }
        }
        
        // ✅ Retourner TOUJOURS les settings, même pour les utilisateurs non-admin
        // Certaines infos sensibles peuvent être filtrées selon le rôle
        /** @var User|null $user */
        $user = $this->getUser();
        $isAdmin = $user && ($user->isAdmin() || $user->isSuperAdmin());

        // 🔍 LOG TEMPORAIRE POUR DÉBOGUER
        error_log('=== SETTINGS DEBUG ===');
        error_log('User: ' . ($user ? $user->getEmail() : 'NULL'));
        error_log('Is Admin: ' . ($isAdmin ? 'YES' : 'NO'));
        error_log('Z.AI API Key in DB: ' . ($settings['ai_provider_zai_key'] ?? 'NULL'));
        error_log('AI Provider configured: ' . ($settings['ai_provider'] ?? 'NULL'));

        $response = [
            'company' => [
                'name' => $settings['company_name'] ?? 'GuardTrack Pro',
                'email' => $settings['company_email'] ?? 'contact@guardtrack.pro',
                'phone' => $settings['company_phone'] ?? '+237 699 00 00 00',
                'logo' => $settings['company_logo'] ?? null,
            ],
            'security' => [
                'requirePhoto' => $settings['require_photo'] ?? true,
                'requirePin' => $settings['require_pin'] ?? true,
                'requireGeolocation' => $settings['require_geolocation'] ?? true,
                'geofencingRadius' => (int) ($settings['geofencing_radius'] ?? 100),
                'maxSuspicionScore' => (int) ($settings['max_suspicion_score'] ?? 70),
            ],
            // ✅ IA - accessible à tous (les agents en ont besoin)
            'ai' => [
                'provider' => $settings['ai_provider'] ?? 'lightweight',
                'providers' => $this->getAiProviders($settings, $isAdmin),
                'minimumConfidence' => (float) ($settings['ai_min_confidence'] ?? 0.4),
                'enableOfflineFallback' => $settings['ai_offline_fallback'] ?? true,
            ],
            'sync' => [
                'interval' => (int) ($settings['sync_interval'] ?? 60),
                'maxRetries' => (int) ($settings['sync_max_retries'] ?? 5),
                'unstableThreshold' => (int) ($settings['sync_unstable_threshold'] ?? 3),
            ],
        ];

        return $this->json($response);
    }

    #[Route('', name: 'api_settings_update', methods: ['PUT'])]
    #[IsGranted('ROLE_ADMIN')]  // ✅ Réservé aux admins
    public function updateSettings(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $repo = $this->entityManager->getRepository(AppSettings::class);

        // Mise à jour des paramètres
        $mappings = [
            'company.name' => 'company_name',
            'company.email' => 'company_email',
            'company.phone' => 'company_phone',
            'security.requirePhoto' => 'require_photo',
            'security.requirePin' => 'require_pin',
            'security.requireGeolocation' => 'require_geolocation',
            'security.geofencingRadius' => 'geofencing_radius',
            'ai.provider' => 'ai_provider',
            'ai.minimumConfidence' => 'ai_min_confidence',
            'ai.enableOfflineFallback' => 'ai_offline_fallback',
            'sync.interval' => 'sync_interval',
            'sync.maxRetries' => 'sync_max_retries',
            'sync.unstableThreshold' => 'sync_unstable_threshold',
        ];

        foreach ($mappings as $path => $dbKey) {
            $value = $this->getNestedValue($data, $path);
            if ($value !== null) {
                $this->saveSetting($repo, $dbKey, $value);
            }
        }

        // Sauvegarder les providers AI avec leurs clés API
        if (isset($data['ai']['providers'])) {
            foreach ($data['ai']['providers'] as $provider) {
                if (isset($provider['apiKey']) && !empty($provider['apiKey'])) {
                    $this->saveSetting($repo, 'ai_provider_' . $provider['id'] . '_key', $provider['apiKey']);
                }
                if (isset($provider['endpoint'])) {
                    $this->saveSetting($repo, 'ai_provider_' . $provider['id'] . '_endpoint', $provider['endpoint']);
                }
                if (isset($provider['model'])) {
                    $this->saveSetting($repo, 'ai_provider_' . $provider['id'] . '_model', $provider['model']);
                }
            }
        }

        $this->entityManager->flush();

        return $this->json(['message' => 'Settings updated successfully']);
    }

    #[Route('/ai/providers', name: 'api_settings_ai_providers', methods: ['GET'])]
    // ✅ Accessible à tous les authentifiés
    public function getAiProvidersList(): JsonResponse
    {
        return $this->json([
            ['id' => 'lightweight', 'name' => 'Local (léger)', 'enabled' => true, 'requiresAuth' => false],
            ['id' => 'tensorflow', 'name' => 'Local (TensorFlow)', 'enabled' => true, 'requiresAuth' => false],
            ['id' => 'zai', 'name' => 'Z.AI', 'enabled' => false, 'requiresAuth' => true],
            ['id' => 'openai', 'name' => 'OpenAI (GPT-4 Vision)', 'enabled' => false, 'requiresAuth' => true],
            ['id' => 'google', 'name' => 'Google Vision', 'enabled' => false, 'requiresAuth' => true],
            ['id' => 'custom', 'name' => 'API Personnalisée', 'enabled' => false, 'requiresAuth' => true],
        ]);
    }

    #[Route('/ai/test', name: 'api_settings_ai_test', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]  // ✅ Réservé aux admins
    public function testAiProvider(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $provider = $data['provider'] ?? '';
        $apiKey = $data['apiKey'] ?? '';

        $success = false;
        $message = '';

        switch ($provider) {
            case 'zai':
                $success = $this->testZaiConnection($apiKey);
                $message = $success ? 'Connexion Z.AI réussie' : 'Échec de connexion à Z.AI';
                break;
            case 'openai':
                $success = $this->testOpenAiConnection($apiKey);
                $message = $success ? 'Connexion OpenAI réussie' : 'Échec de connexion à OpenAI';
                break;
            case 'google':
                $success = $this->testGoogleVisionConnection($apiKey);
                $message = $success ? 'Connexion Google Vision réussie' : 'Échec de connexion à Google Vision';
                break;
            case 'custom':
                $endpoint = $data['endpoint'] ?? '';
                $success = $this->testCustomApiConnection($endpoint, $apiKey);
                $message = $success ? 'Connexion API réussie' : 'Échec de connexion à l\'API';
                break;
            default:
                $message = 'Test non supporté pour ce provider';
        }

        return $this->json([
            'success' => $success,
            'message' => $message,
        ]);
    }

    // ✅ Route publique pour les settings essentiels (pas d'auth requise)
    #[Route('/public', name: 'api_settings_public', methods: ['GET'])]
    public function getPublicSettings(): JsonResponse
    {
        $settings = $this->getDefaultSettings();
        $repo = $this->entityManager->getRepository(AppSettings::class);

        // Charger uniquement les settings publics
        $publicKeys = ['company_name', 'require_photo', 'require_pin', 'require_geolocation', 'geofencing_radius'];

        $result = [];
        foreach ($publicKeys as $key) {
            $dbSetting = $repo->findOneBy(['settingKey' => $key]);
            $result[$key] = $dbSetting ? $dbSetting->getSettingValue() : ($settings[$key] ?? null);
        }

        return $this->json($result);
    }

    private function getDefaultSettings(): array
    {
        return [
            'company_name' => 'GuardTrack Pro',
            'company_email' => 'contact@guardtrack.pro',
            'company_phone' => '+237 699 00 00 00',
            'require_photo' => true,
            'require_pin' => true,
            'require_geolocation' => true,
            'geofencing_radius' => 100,
            'max_suspicion_score' => 70,
            'ai_provider' => 'lightweight',
            'ai_min_confidence' => 0.4,
            'ai_offline_fallback' => true,
            'sync_interval' => 60,
            'sync_max_retries' => 5,
            'sync_unstable_threshold' => 3,
        ];
    }

    private function getAiProviders(array $settings, bool $isAdmin): array
    {
        $providers = [
            ['id' => 'lightweight', 'name' => 'Local (léger)', 'enabled' => true],
            ['id' => 'tensorflow', 'name' => 'Local (TensorFlow)', 'enabled' => true],
        ];

        // Providers externes
        $externalProviders = [
            'zai' => 'Z.AI',
            'openai' => 'OpenAI',
            'google' => 'Google Vision',
            'custom' => 'API Personnalisée',
        ];

        foreach ($externalProviders as $id => $name) {
            // ✅ Récupérer la clé API depuis les settings
            $apiKey = $settings['ai_provider_' . $id . '_key'] ?? null;
            
            $provider = [
                'id' => $id,
                'name' => $name,
                'enabled' => ($settings['ai_provider'] ?? '') === $id,
            ];

            // ✅ Pour les admins : on expose la vraie clé
            if ($isAdmin) {
                $provider['apiKey'] = $apiKey;
                $provider['endpoint'] = $settings['ai_provider_' . $id . '_endpoint'] ?? null;
                $provider['model'] = $settings['ai_provider_' . $id . '_model'] ?? null;
            } else {
                // ✅ Pour les non-admins : on masque la clé mais on indique si elle existe
                $provider['apiKey'] = null;
                $provider['hasApiKey'] = !empty($apiKey);
            }

            $providers[] = $provider;
        }

        return $providers;
    }

    private function saveSetting($repo, string $key, $value): void
    {
        $setting = $repo->findOneBy(['settingKey' => $key]);

        if (!$setting) {
            $setting = new AppSettings();
            $setting->setSettingKey($key);
        }

        $setting->setSettingValue($value);
        $this->entityManager->persist($setting);
    }

    private function getNestedValue(array $data, string $path)
    {
        $keys = explode('.', $path);
        $value = $data;

        foreach ($keys as $key) {
            if (!isset($value[$key])) {
                return null;
            }
            $value = $value[$key];
        }

        return $value;
    }

    private function testZaiConnection(string $apiKey): bool
    {
        if (empty($apiKey)) {
            error_log('Z.AI Test: API Key is empty');
            return false;
        }

        try {
            error_log('Z.AI Test: Testing connection with API Key: ' . substr($apiKey, 0, 10) . '...');
            
            // Test simple avec l'API REST
            $ch = curl_init('https://api.z.ai/api/paas/v4/chat/completions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'model' => 'glm-4-flash',
                'messages' => [['role' => 'user', 'content' => 'test']],
                'max_tokens' => 1
            ]));
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);

            error_log('Z.AI Test - HTTP Code: ' . $httpCode);
            if ($error) {
                error_log('Z.AI Test - CURL Error: ' . $error);
            } else {
                error_log('Z.AI Test - Response: ' . substr($response, 0, 200));
            }

            // 200 = succès, 401 = clé invalide (mais API accessible)
            return $httpCode === 200 || $httpCode === 401;
        } catch (\Exception $e) {
            error_log('Z.AI Test - Exception: ' . $e->getMessage());
            return false;
        }
    }

    private function testOpenAiConnection(string $apiKey): bool
    {
        if (empty($apiKey)) return false;

        try {
            $ch = curl_init('https://api.openai.com/v1/models');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $apiKey]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode === 200;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function testGoogleVisionConnection(string $apiKey): bool
    {
        if (empty($apiKey)) return false;

        try {
            $ch = curl_init('https://vision.googleapis.com/v1/operations?key=' . $apiKey);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            // Google Vision retourne 200 même sans operations
            return $httpCode === 200;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function testCustomApiConnection(string $endpoint, string $apiKey): bool
    {
        if (empty($endpoint)) return false;

        try {
            $headers = ['Content-Type: application/json'];
            if (!empty($apiKey)) {
                $headers[] = 'Authorization: Bearer ' . $apiKey;
            }

            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request

            curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            return $httpCode > 0 && $httpCode < 500;
        } catch (\Exception $e) {
            return false;
        }
    }
}
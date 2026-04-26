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
        // Clé API : priorité à la requête, sinon variable d'environnement
        $apiKey = !empty($data['apiKey']) ? $data['apiKey'] : '';

        $success = false;
        $message = '';

        $repo = $this->entityManager->getRepository(AppSettings::class);

        switch ($provider) {
            case 'zai':
                if (empty($apiKey)) {
                    $dbKey = $repo->findOneBy(['settingKey' => 'ai_provider_zai_key']);
                    $apiKey = $dbKey ? ($dbKey->getSettingValue() ?? '') : $this->resolveEnv('ZAI_API_KEY');
                }
                [$success, $message] = $this->testZaiConnection($apiKey);
                break;
            case 'openai':
                if (empty($apiKey)) {
                    $dbKey = $repo->findOneBy(['settingKey' => 'ai_provider_openai_key']);
                    $apiKey = $dbKey ? ($dbKey->getSettingValue() ?? '') : $this->resolveEnv('OPENAI_API_KEY');
                }
                [$success, $message] = $this->testOpenAiConnection($apiKey);
                break;
            case 'google':
                if (empty($apiKey)) {
                    $dbKey = $repo->findOneBy(['settingKey' => 'ai_provider_google_key']);
                    $apiKey = $dbKey ? ($dbKey->getSettingValue() ?? '') : $this->resolveEnv('GOOGLE_API_KEY');
                }
                [$success, $message] = $this->testGoogleVisionConnection($apiKey);
                break;
            case 'custom':
                $endpoint = $data['endpoint'] ?? '';
                if (empty($endpoint)) {
                    $dbEndpoint = $repo->findOneBy(['settingKey' => 'ai_provider_custom_endpoint']);
                    $endpoint = $dbEndpoint ? ($dbEndpoint->getSettingValue() ?? '') : '';
                }
                if (empty($apiKey)) {
                    $dbKey = $repo->findOneBy(['settingKey' => 'ai_provider_custom_key']);
                    $apiKey = $dbKey ? ($dbKey->getSettingValue() ?? '') : '';
                }
                [$success, $message] = $this->testCustomApiConnection($endpoint, $apiKey);
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
        $publicKeys = ['company_name', 'company_logo', 'require_photo', 'require_pin', 'require_geolocation', 'geofencing_radius'];

        $result = [];
        foreach ($publicKeys as $key) {
            $dbSetting = $repo->findOneBy(['settingKey' => $key]);
            $result[$key] = $dbSetting ? $dbSetting->getSettingValue() : ($settings[$key] ?? null);
        }

        return $this->json($result);
    }

    #[Route('/logo', name: 'api_settings_logo_upload', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function uploadLogo(Request $request): JsonResponse
    {
        $file = $request->files->get('logo');
        if (!$file) {
            return $this->json(['error' => 'Aucun fichier fourni'], 400);
        }

        $allowedMimes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
        $mimeType = $file->getMimeType();
        if (!in_array($mimeType, $allowedMimes, true)) {
            return $this->json(['error' => 'Format non supporté'], 400);
        }

        if ($file->getSize() > 2 * 1024 * 1024) {
            return $this->json(['error' => 'Le fichier ne doit pas dépasser 2 Mo'], 400);
        }

        $content = file_get_contents($file->getPathname());
        $dataUrl = 'data:' . $mimeType . ';base64,' . base64_encode($content);

        $repo = $this->entityManager->getRepository(AppSettings::class);
        $this->saveSetting($repo, 'company_logo', $dataUrl);
        $this->entityManager->flush();

        return $this->json(['url' => $dataUrl]);
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

    private function resolveEnv(string $name): string
    {
        // Symfony charge les .env dans $_ENV ; getenv() lit les vars C-level
        return $_ENV[$name] ?? getenv($name) ?: '';
    }

    private function curlTest(string $url, array $headers, ?string $body = null, int $timeout = 15): array
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $response = curl_exec($ch);
        $httpCode  = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        return [$httpCode, $curlError, $response];
    }

    /** @return array{bool, string} */
    private function testZaiConnection(string $apiKey): array
    {
        if (empty($apiKey)) {
            return [false, 'Clé API introuvable (base de données et variable ZAI_API_KEY vides)'];
        }

        [$httpCode, $curlError] = $this->curlTest(
            'https://api.z.ai/api/paas/v4/chat/completions',
            ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'],
            json_encode([
                'model'    => 'glm-4-flash',
                'messages' => [['role' => 'user', 'content' => 'test']],
            ])
        );

        if ($curlError) {
            return [false, 'Erreur réseau : ' . $curlError];
        }
        // 200 = succès, 400 = format accepté mais paramètre invalide (clé OK), 429 = quota
        if (in_array($httpCode, [200, 400, 429], true)) {
            return [true, 'Connexion Z.AI réussie'];
        }
        if ($httpCode === 401 || $httpCode === 403) {
            return [false, "Clé API refusée par Z.AI (HTTP $httpCode)"];
        }

        return [false, "Z.AI inaccessible (HTTP $httpCode)"];
    }

    /** @return array{bool, string} */
    private function testOpenAiConnection(string $apiKey): array
    {
        if (empty($apiKey)) {
            return [false, 'Clé API introuvable'];
        }

        [$httpCode, $curlError] = $this->curlTest(
            'https://api.openai.com/v1/models',
            ['Authorization: Bearer ' . $apiKey]
        );

        if ($curlError) return [false, 'Erreur réseau : ' . $curlError];
        if ($httpCode === 200) return [true, 'Connexion OpenAI réussie'];
        if ($httpCode === 401) return [false, 'Clé API OpenAI invalide'];

        return [false, "Réponse inattendue d'OpenAI (HTTP $httpCode)"];
    }

    /** @return array{bool, string} */
    private function testGoogleVisionConnection(string $apiKey): array
    {
        if (empty($apiKey)) {
            return [false, 'Clé API introuvable'];
        }

        [$httpCode, $curlError] = $this->curlTest(
            'https://vision.googleapis.com/v1/operations?key=' . $apiKey,
            ['Content-Type: application/json']
        );

        if ($curlError) return [false, 'Erreur réseau : ' . $curlError];
        if ($httpCode === 200) return [true, 'Connexion Google Vision réussie'];
        if ($httpCode === 400) return [true, 'Google Vision accessible (HTTP 400 — paramètre manquant attendu)'];
        if ($httpCode === 403) return [false, 'Clé API Google refusée'];

        return [false, "Réponse inattendue de Google Vision (HTTP $httpCode)"];
    }

    /** @return array{bool, string} */
    private function testCustomApiConnection(string $endpoint, string $apiKey): array
    {
        if (empty($endpoint)) {
            return [false, 'Endpoint non configuré'];
        }

        $headers = ['Content-Type: application/json'];
        if (!empty($apiKey)) {
            $headers[] = 'Authorization: Bearer ' . $apiKey;
        }

        [$httpCode, $curlError] = $this->curlTest($endpoint, $headers);

        if ($curlError) return [false, 'Erreur réseau : ' . $curlError];
        if ($httpCode > 0 && $httpCode < 500) return [true, "API accessible (HTTP $httpCode)"];

        return [false, $httpCode === 0 ? 'Connexion impossible' : "HTTP $httpCode"];
    }
}
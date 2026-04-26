<?php

namespace App\Controller\Api;

use App\Entity\AppSettings;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/ai')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class AiController extends AbstractController
{
    private array $langNames = [
        'fr' => 'French',
        'en' => 'English',
        'es' => 'Spanish',
        'de' => 'German',
        'it' => 'Italian',
        'pt' => 'Portuguese',
        'ar' => 'Arabic',
    ];

    public function __construct(private EntityManagerInterface $em) {}

    #[Route('/translate', name: 'api_ai_translate', methods: ['POST'])]
    public function translate(Request $request): JsonResponse
    {
        $data     = json_decode($request->getContent(), true) ?? [];
        $text     = trim($data['text'] ?? '');
        $fromLang = $data['fromLang'] ?? 'fr';
        $toLang   = $data['toLang']   ?? 'en';

        if (empty($text)) {
            return $this->json(['error' => 'Le texte est requis'], 400);
        }

        if ($fromLang === $toLang) {
            return $this->json(['translated' => $text]);
        }

        $apiKey = $this->resolveApiKey();
        if (empty($apiKey)) {
            return $this->json(['error' => 'Service IA non configuré'], 503);
        }

        $toName = $this->langNames[$toLang] ?? $toLang;

        $translated = $fromLang === 'auto'
            ? $this->callZaiAutoDetect($apiKey, $text, $toName)
            : $this->callZai($apiKey, $text, $this->langNames[$fromLang] ?? $fromLang, $toName);
        if ($translated === null) {
            return $this->json(['error' => 'Échec de la traduction'], 503);
        }

        return $this->json(['translated' => $translated]);
    }

    private function resolveApiKey(): string
    {
        // 1. Chercher dans la base de données (priorité)
        $setting = $this->em->getRepository(AppSettings::class)
            ->findOneBy(['settingKey' => 'ai_provider_zai_key']);
        if ($setting && !empty($setting->getSettingValue())) {
            return $setting->getSettingValue();
        }

        // 2. Fallback sur la variable d'environnement
        return $_ENV['ZAI_API_KEY'] ?? getenv('ZAI_API_KEY') ?: '';
    }

    private function callZaiAutoDetect(string $apiKey, string $text, string $toName): ?string
    {
        $prompt = sprintf(
            'Detect the language and translate the following text to %s. Return ONLY the translated text, no explanations, no quotes, no markdown:%s%s',
            $toName,
            "\n\n",
            $text
        );

        return $this->callZaiWithPrompt($apiKey, $prompt);
    }

    private function callZai(string $apiKey, string $text, string $fromName, string $toName): ?string
    {
        $prompt = sprintf(
            'Translate the following text from %s to %s. Return ONLY the translated text, no explanations, no quotes, no markdown:%s%s',
            $fromName,
            $toName,
            "\n\n",
            $text
        );

        return $this->callZaiWithPrompt($apiKey, $prompt);
    }

    private function callZaiWithPrompt(string $apiKey, string $prompt): ?string
    {

        $payload = json_encode([
            'model'    => 'glm-4-flash',
            'messages' => [
                [
                    'role'    => 'system',
                    'content' => 'You are a professional translator. Return only the translated text, nothing else.',
                ],
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens'  => 2000,
            'temperature' => 0.2,
        ]);

        $ch = curl_init('https://api.z.ai/api/paas/v4/chat/completions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $payload,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            return null;
        }

        $result = json_decode($response, true);
        $translated = $result['choices'][0]['message']['content'] ?? null;

        return $translated ? trim($translated) : null;
    }
}

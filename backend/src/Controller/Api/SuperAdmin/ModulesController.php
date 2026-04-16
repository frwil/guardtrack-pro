<?php

namespace App\Controller\Api\SuperAdmin;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/superadmin')]
#[IsGranted('ROLE_SUPERADMIN')]
class ModulesController extends AbstractController
{
    #[Route('/modules', name: 'api_superadmin_modules', methods: ['GET'])]
    public function getModules(): JsonResponse
    {
        $categories = $this->getModuleCategories();
        
        return $this->json([
            'categories' => $categories,
        ]);
    }

    #[Route('/modules', name: 'api_superadmin_modules_update', methods: ['PATCH'])]
    public function updateModules(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $changes = $data['changes'] ?? [];
        
        // Ici, on mettrait à jour les modules dans la base de données
        // Pour l'instant, on simule une sauvegarde réussie
        
        return $this->json([
            'success' => true,
            'message' => count($changes) . ' module(s) mis à jour',
        ]);
    }

    private function getModuleCategories(): array
    {
        return [
            [
                'id' => 'core',
                'name' => 'Modules essentiels',
                'description' => 'Modules requis pour le fonctionnement de base',
                'modules' => [
                    [
                        'id' => 'auth',
                        'name' => 'Authentification',
                        'description' => 'Gestion des connexions et de l\'authentification JWT',
                        'enabled' => true,
                        'required' => true,
                        'version' => '1.0.0',
                        'icon' => '🔐',
                        'category' => 'core',
                        'dependencies' => [],
                    ],
                    [
                        'id' => 'users',
                        'name' => 'Gestion des utilisateurs',
                        'description' => 'CRUD utilisateurs, rôles et permissions',
                        'enabled' => true,
                        'required' => true,
                        'version' => '1.0.0',
                        'icon' => '👥',
                        'category' => 'core',
                        'dependencies' => ['auth'],
                    ],
                    [
                        'id' => 'sites',
                        'name' => 'Gestion des sites',
                        'description' => 'Gestion des sites surveillés',
                        'enabled' => true,
                        'required' => true,
                        'version' => '1.0.0',
                        'icon' => '📍',
                        'category' => 'core',
                        'dependencies' => [],
                    ],
                ],
            ],
            [
                'id' => 'security',
                'name' => 'Sécurité et conformité',
                'description' => 'Modules liés à la sécurité et à la traçabilité',
                'modules' => [
                    [
                        'id' => 'audit',
                        'name' => 'Journal d\'audit',
                        'description' => 'Traçabilité complète des actions utilisateurs',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '📝',
                        'category' => 'security',
                        'dependencies' => ['users'],
                    ],
                    [
                        'id' => '2fa',
                        'name' => 'Authentification à deux facteurs',
                        'description' => 'Double authentification par SMS ou application',
                        'enabled' => false,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '📱',
                        'category' => 'security',
                        'dependencies' => ['auth'],
                    ],
                    [
                        'id' => 'antifraud',
                        'name' => 'Anti-fraude',
                        'description' => 'Détection des anomalies et tentatives de fraude',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🛡️',
                        'category' => 'security',
                        'dependencies' => ['audit'],
                    ],
                ],
            ],
            [
                'id' => 'business',
                'name' => 'Modules métier',
                'description' => 'Fonctionnalités de l\'application',
                'modules' => [
                    [
                        'id' => 'pointage',
                        'name' => 'Pointage',
                        'description' => 'Déclaration de présence avec photo et GPS',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '📍',
                        'category' => 'business',
                        'dependencies' => ['sites', 'users'],
                    ],
                    [
                        'id' => 'rondes',
                        'name' => 'Rondes',
                        'description' => 'Planification et exécution des rondes',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🔄',
                        'category' => 'business',
                        'dependencies' => ['pointage'],
                    ],
                    [
                        'id' => 'incidents',
                        'name' => 'Incidents',
                        'description' => 'Déclaration et gestion des incidents',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '⚠️',
                        'category' => 'business',
                        'dependencies' => ['sites'],
                    ],
                    [
                        'id' => 'reports',
                        'name' => 'Rapports',
                        'description' => 'Génération de rapports et exports',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '📊',
                        'category' => 'business',
                        'dependencies' => ['pointage', 'rondes'],
                    ],
                    [
                        'id' => 'offline',
                        'name' => 'Mode hors ligne',
                        'description' => 'Fonctionnement sans connexion internet',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '📴',
                        'category' => 'business',
                        'dependencies' => ['pointage'],
                    ],
                    [
                        'id' => 'ai',
                        'name' => 'Analyse IA',
                        'description' => 'Analyse des photos par intelligence artificielle',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🤖',
                        'category' => 'business',
                        'dependencies' => ['pointage'],
                    ],
                ],
            ],
            [
                'id' => 'integration',
                'name' => 'Intégrations',
                'description' => 'Connexions avec des services externes',
                'modules' => [
                    [
                        'id' => 'notifications',
                        'name' => 'Notifications',
                        'description' => 'Notifications en temps réel via Mercure',
                        'enabled' => true,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🔔',
                        'category' => 'integration',
                        'dependencies' => [],
                    ],
                    [
                        'id' =>'webhook',
                        'name' => 'Webhooks',
                        'description' => 'Envoi d\'événements vers des services externes',
                        'enabled' => false,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🔗',
                        'category' => 'integration',
                        'dependencies' => [],
                    ],
                    [
                        'id' => 'api',
                        'name' => 'API Publique',
                        'description' => 'Endpoints API pour intégrations tierces',
                        'enabled' => false,
                        'required' => false,
                        'version' => '1.0.0',
                        'icon' => '🌐',
                        'category' => 'integration',
                        'dependencies' => ['auth'],
                    ],
                ],
            ],
        ];
    }
}
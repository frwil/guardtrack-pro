'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPuzzlePiece,
  faSpinner,
  faRotate,
  faToggleOn,
  faToggleOff,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faLock,
  faUnlock,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  required: boolean;
  version: string;
  icon: string;
  category: 'core' | 'security' | 'business' | 'integration';
  dependencies: string[];
  settings?: Record<string, any>;
}

interface ModuleCategory {
  id: string;
  name: string;
  description: string;
  modules: Module[];
}

export default function ModulesPage() {
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{ module: Module; action: 'enable' | 'disable' } | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/modules', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
      });
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (module: Module) => {
    if (module.required) {
      alert(`Le module "${module.name}" est requis par le système et ne peut pas être désactivé.`);
      return;
    }

    // Vérifier les dépendances
    if (!module.enabled) {
      const missingDeps = module.dependencies.filter(depId => {
        const dep = findModule(depId);
        return dep && !dep.enabled && !pendingChanges[depId];
      });
      
      if (missingDeps.length > 0) {
        const depNames = missingDeps.map(id => findModule(id)?.name || id).join(', ');
        alert(`Ce module nécessite les modules suivants : ${depNames}`);
        return;
      }
    } else {
      // Vérifier si d'autres modules dépendent de celui-ci
      const dependentModules = findAllModules().filter(m => 
        m.enabled && m.dependencies.includes(module.id)
      );
      
      if (dependentModules.length > 0) {
        setShowConfirmModal({ module, action: 'disable' });
        return;
      }
    }

    applyToggle(module);
  };

  const applyToggle = (module: Module) => {
    setPendingChanges(prev => ({
      ...prev,
      [module.id]: !module.enabled,
    }));
  };

  const findModule = (id: string): Module | undefined => {
    for (const cat of categories) {
      const mod = cat.modules.find(m => m.id === id);
      if (mod) return mod;
    }
    return undefined;
  };

  const findAllModules = (): Module[] => {
    return categories.flatMap(cat => cat.modules);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const changes = Object.entries(pendingChanges).map(([id, enabled]) => ({
        id,
        enabled,
      }));

      await fetch('/api/superadmin/modules', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}`,
        },
        body: JSON.stringify({ changes }),
      });

      await loadModules();
      setPendingChanges({});
      alert('✅ Modules mis à jour avec succès');
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert('❌ Erreur lors de la mise à jour des modules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDisable = () => {
    if (showConfirmModal) {
      applyToggle(showConfirmModal.module);
      setShowConfirmModal(null);
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      core: '⚙️',
      security: '🔒',
      business: '📊',
      integration: '🔌',
    };
    return icons[category] || '📦';
  };

  const getModuleIcon = (module: Module): string => {
    return module.icon || '📦';
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faPuzzlePiece} className="mr-3 text-indigo-600" />
              Gestion des modules
            </h1>
            <p className="text-gray-600 mt-1">
              Activez ou désactivez les fonctionnalités du système
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadModules}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
            {hasPendingChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {isSaving ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : (
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                )}
                Appliquer les modifications ({Object.keys(pendingChanges).length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catégories et modules */}
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">{getCategoryIcon(category.id)}</span>
                {category.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{category.description}</p>
            </div>

            <div className="divide-y">
              {category.modules.map((module) => {
                const isPending = pendingChanges[module.id] !== undefined;
                const isEnabled = isPending ? pendingChanges[module.id] : module.enabled;
                
                return (
                  <div key={module.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{getModuleIcon(module)}</span>
                          <div>
                            <div className="flex items-center">
                              <h3 className="font-medium text-gray-900">{module.name}</h3>
                              <span className="ml-3 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                v{module.version}
                              </span>
                              {module.required && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs flex items-center">
                                  <FontAwesomeIcon icon={faLock} className="mr-1" size="xs" />
                                  Requis
                                </span>
                              )}
                              {isPending && (
                                <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                                  En attente
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{module.description}</p>
                            
                            {module.dependencies.length > 0 && (
                              <div className="mt-2 flex items-center text-xs text-gray-400">
                                <FontAwesomeIcon icon={faPuzzlePiece} className="mr-1" size="xs" />
                                Dépendances : {module.dependencies.map(id => findModule(id)?.name || id).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedModule(module)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Détails"
                        >
                          <FontAwesomeIcon icon={faInfoCircle} />
                        </button>
                        
                        <button
                          onClick={() => handleToggle(module)}
                          disabled={module.required}
                          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${
                            module.required ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                              isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Légende</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-indigo-600 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Module activé</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Module désactivé</span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs mr-2">
              <FontAwesomeIcon icon={faLock} className="mr-1" size="xs" />
              Requis
            </span>
            <span className="text-sm text-gray-600">Ne peut pas être désactivé</span>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs mr-2">
              En attente
            </span>
            <span className="text-sm text-gray-600">Modification non sauvegardée</span>
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-yellow-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmation</h2>
            </div>
            
            <p className="text-gray-700 mb-4">
              Le module <strong>{showConfirmModal.module.name}</strong> est requis par les modules suivants :
            </p>
            
            <ul className="list-disc list-inside mb-4 text-gray-600">
              {findAllModules()
                .filter(m => m.enabled && m.dependencies.includes(showConfirmModal.module.id))
                .map(m => (
                  <li key={m.id}>{m.name}</li>
                ))
              }
            </ul>
            
            <p className="text-gray-700 mb-6">
              Si vous désactivez ce module, les modules dépendants seront également désactivés.
              Voulez-vous continuer ?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDisable}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Désactiver quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails module */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <span className="text-2xl mr-2">{getModuleIcon(selectedModule)}</span>
                {selectedModule.name}
              </h2>
              <button
                onClick={() => setSelectedModule(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">{selectedModule.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Version</p>
                  <p className="font-medium">{selectedModule.version}</p>
                </div>
                <div>
                  <p className="text-gray-500">Catégorie</p>
                  <p className="font-medium">{selectedModule.category}</p>
                </div>
                <div>
                  <p className="text-gray-500">Statut</p>
                  <p className="font-medium">
                    {selectedModule.enabled ? (
                      <span className="text-green-600">✅ Activé</span>
                    ) : (
                      <span className="text-gray-500">❌ Désactivé</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Requis</p>
                  <p className="font-medium">
                    {selectedModule.required ? 'Oui' : 'Non'}
                  </p>
                </div>
              </div>
              
              {selectedModule.dependencies.length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Dépendances</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedModule.dependencies.map(id => (
                      <span key={id} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {findModule(id)?.name || id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedModule.settings && Object.keys(selectedModule.settings).length > 0 && (
                <div>
                  <p className="text-gray-500 mb-1">Paramètres</p>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedModule.settings, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
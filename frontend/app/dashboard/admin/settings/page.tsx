'use client';

import { useEffect, useRef, useState } from 'react';
import { settingsService, AppSettings, AiProvider } from '../../../../src/services/api/settings';
import { useAppSettings } from '../../../../src/contexts/AppSettingsContext';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'ai' | 'sync'>('general');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { refreshBranding } = useAppSettings();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    try {
      await settingsService.updateSettings(settings);
      alert('✅ Paramètres sauvegardés avec succès');
    } catch (error) {
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAi = async (providerId: string) => {
    const provider = settings?.ai?.providers?.find(p => p.id === providerId);
    const result = await settingsService.testAiProvider(providerId, provider?.apiKey);
    setTestResult(result);
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const result = await settingsService.uploadLogo(file);
      if (result?.url) {
        setSettings(s => s ? { ...s, company: { ...s.company, logo: result.url } } : s);
        await refreshBranding();
        alert('✅ Logo mis à jour avec succès');
      } else {
        alert('❌ Erreur lors de l\'upload du logo');
      }
    } catch {
      alert('❌ Erreur lors de l\'upload du logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">⚙️</span>
            Paramètres de l'application
          </h1>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSaving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {(['general', 'security', 'ai', 'sync'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'general' && '🏢 Général'}
                {tab === 'security' && '🔒 Sécurité'}
                {tab === 'ai' && '🤖 Intelligence Artificielle'}
                {tab === 'sync' && '🔄 Synchronisation'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Onglet Général */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de l'entreprise
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                    {settings.company.logo ? (
                      <img src={settings.company.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-3xl">🛡️</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isUploadingLogo ? '⏳ Upload...' : '📁 Choisir un logo'}
                    </button>
                    {settings.company.logo && (
                      <button
                        onClick={async () => {
                          setSettings(s => s ? { ...s, company: { ...s.company, logo: undefined } } : s);
                          await settingsService.updateSettings({ company: { ...settings.company, logo: '' } });
                          await refreshBranding();
                        }}
                        className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        🗑️ Supprimer le logo
                      </button>
                    )}
                    <p className="text-xs text-gray-500">PNG, JPG, SVG ou WebP — recommandé&nbsp;: 200×60&nbsp;px</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  value={settings.company.name}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de contact
                </label>
                <input
                  type="email"
                  value={settings.company.email}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={settings.company.phone}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Onglet Sécurité */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.requirePhoto}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, requirePhoto: e.target.checked }
                  })}
                  className="mr-3"
                />
                <span>Photo obligatoire pour le pointage</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.requirePin}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, requirePin: e.target.checked }
                  })}
                  className="mr-3"
                />
                <span>Code PIN obligatoire</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.security.requireGeolocation}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, requireGeolocation: e.target.checked }
                  })}
                  className="mr-3"
                />
                <span>Géolocalisation obligatoire</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rayon de géorepérage (mètres)
                </label>
                <input
                  type="number"
                  value={settings.security.geofencingRadius}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: { ...settings.security, geofencingRadius: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Onglet IA */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur d'IA
                </label>
                <select
                  value={settings.ai.provider}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, provider: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="lightweight">🧠 Local (léger)</option>
                  <option value="tensorflow">🧠 Local (TensorFlow)</option>
                  <option value="zai">🤖 Z.AI</option>
                  <option value="openai">🤖 OpenAI (GPT-4 Vision)</option>
                  <option value="google">🤖 Google Vision</option>
                  <option value="custom">🔧 API Personnalisée</option>
                </select>
              </div>

              {/* Info : clés API via env vars */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  ℹ️ Les clés API sont configurées via les variables d'environnement du serveur. Cette page permet uniquement de vérifier que la connexion au fournisseur fonctionne correctement.
                </p>
              </div>

              {/* Test de connexion pour les fournisseurs externes */}
              {['zai', 'openai', 'google', 'custom'].includes(settings.ai.provider) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">
                        {settings.ai.provider === 'zai' && 'Z.AI'}
                        {settings.ai.provider === 'openai' && 'OpenAI (GPT-4 Vision)'}
                        {settings.ai.provider === 'google' && 'Google Vision'}
                        {settings.ai.provider === 'custom' && 'API Personnalisée'}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">Fournisseur actif</p>
                    </div>
                    {testResult ? (
                      <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        testResult.success
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${testResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        {testResult.success ? 'Connexion OK' : 'Échec de connexion'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTestAi(settings.ai.provider)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        🧪 Tester la connexion
                      </button>
                    )}
                  </div>
                  {testResult && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-gray-600">{testResult.message}</p>
                      <button
                        onClick={() => setTestResult(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 ml-4"
                      >
                        Retester
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil de confiance minimum (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.ai.minimumConfidence * 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, minimumConfidence: parseInt(e.target.value) / 100 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.ai.enableOfflineFallback}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai: { ...settings.ai, enableOfflineFallback: e.target.checked }
                  })}
                  className="mr-3"
                />
                <span>Utiliser l'analyse locale en cas d'échec de l'API</span>
              </label>
            </div>
          )}

          {/* Onglet Synchronisation */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalle de synchronisation (secondes)
                </label>
                <input
                  type="number"
                  value={settings.sync.interval}
                  onChange={(e) => setSettings({
                    ...settings,
                    sync: { ...settings.sync, interval: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre maximum de tentatives
                </label>
                <input
                  type="number"
                  value={settings.sync.maxRetries}
                  onChange={(e) => setSettings({
                    ...settings,
                    sync: { ...settings.sync, maxRetries: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil d'instabilité (reconnexions/2min)
                </label>
                <input
                  type="number"
                  value={settings.sync.unstableThreshold}
                  onChange={(e) => setSettings({
                    ...settings,
                    sync: { ...settings.sync, unstableThreshold: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
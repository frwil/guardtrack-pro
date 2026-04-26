'use client';

import { useEffect, useState, useRef } from 'react';
import { settingsService, AppSettings, AiProvider } from '../../../../src/services/api/settings';
import { CURRENCIES, useAppSettings } from '../../../../src/contexts/AppSettingsContext';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'ai' | 'sync'>('general');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { refreshSettings } = useAppSettings();

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    const file = logoInputRef.current?.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const result = await settingsService.uploadLogo(file);
      if (result?.url) {
        setSettings(s => s ? { ...s, company: { ...s.company, logo: result.url } } : s);
        setLogoPreview(null);
        if (logoInputRef.current) logoInputRef.current.value = '';
        await refreshSettings();
        alert('✅ Logo mis à jour');
      }
    } catch {
      alert('❌ Erreur lors de l\'upload du logo');
    } finally {
      setIsUploadingLogo(false);
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
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo de l'entreprise</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                    {(logoPreview || settings.company.logo) ? (
                      <img
                        src={logoPreview || settings.company.logo!}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">🏢</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      onChange={handleLogoChange}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <p className="text-xs text-gray-400">JPEG, PNG, WebP, SVG — max 2 Mo</p>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isUploadingLogo ? '⏳ Upload...' : '⬆️ Envoyer le logo'}
                      </button>
                    )}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💱 Devise
                </label>
                <select
                  value={settings.company.currency ?? 'XOF'}
                  onChange={(e) => setSettings({
                    ...settings,
                    company: { ...settings.company, currency: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  {CURRENCIES.map(({ code, name, symbol }) => (
                    <option key={code} value={code}>
                      {code} — {symbol} — {name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Utilisée dans le module Finance et sur les rapports.
                </p>
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

              {/* Configuration Z.AI */}
              {settings.ai.provider === 'zai' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Configuration Z.AI</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Clé API</label>
                    <input
                      type="password"
                      placeholder="zai_..."
                      value={settings.ai.providers?.find(p => p.id === 'zai')?.apiKey || ''}
                      onChange={(e) => {
                        const providers = settings.ai.providers || [];
                        const index = providers.findIndex(p => p.id === 'zai');
                        if (index >= 0) {
                          providers[index].apiKey = e.target.value;
                        } else {
                          providers.push({ id: 'zai', name: 'Z.AI', enabled: true, apiKey: e.target.value });
                        }
                        setSettings({ ...settings, ai: { ...settings.ai, providers } });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => handleTestAi('zai')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🧪 Tester la connexion
                  </button>
                </div>
              )}

              {/* Configuration OpenAI */}
              {settings.ai.provider === 'openai' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Configuration OpenAI</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Clé API</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={settings.ai.providers?.find(p => p.id === 'openai')?.apiKey || ''}
                      onChange={(e) => {
                        const providers = settings.ai.providers || [];
                        const index = providers.findIndex(p => p.id === 'openai');
                        if (index >= 0) {
                          providers[index].apiKey = e.target.value;
                        } else {
                          providers.push({ id: 'openai', name: 'OpenAI', enabled: true, apiKey: e.target.value, model: 'gpt-4-vision-preview' });
                        }
                        setSettings({ ...settings, ai: { ...settings.ai, providers } });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => handleTestAi('openai')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🧪 Tester la connexion
                  </button>
                </div>
              )}

              {/* Configuration API Personnalisée */}
              {settings.ai.provider === 'custom' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium">Configuration API Personnalisée</h3>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Endpoint URL</label>
                    <input
                      type="url"
                      placeholder="https://api.example.com/v1/analyze"
                      value={settings.ai.providers?.find(p => p.id === 'custom')?.endpoint || ''}
                      onChange={(e) => {
                        const providers = settings.ai.providers || [];
                        const index = providers.findIndex(p => p.id === 'custom');
                        if (index >= 0) {
                          providers[index].endpoint = e.target.value;
                        } else {
                          providers.push({ id: 'custom', name: 'API Personnalisée', enabled: true, endpoint: e.target.value });
                        }
                        setSettings({ ...settings, ai: { ...settings.ai, providers } });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Clé API (optionnel)</label>
                    <input
                      type="password"
                      placeholder="Bearer token..."
                      value={settings.ai.providers?.find(p => p.id === 'custom')?.apiKey || ''}
                      onChange={(e) => {
                        const providers = settings.ai.providers || [];
                        const index = providers.findIndex(p => p.id === 'custom');
                        if (index >= 0) {
                          providers[index].apiKey = e.target.value;
                        }
                        setSettings({ ...settings, ai: { ...settings.ai, providers } });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => handleTestAi('custom')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🧪 Tester la connexion
                  </button>
                </div>
              )}

              {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResult.message}
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
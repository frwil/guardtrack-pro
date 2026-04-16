"use client";

import { useState, useEffect } from "react";
import { apiConfig } from "../services/api/config";
import { apiClient } from "../services/api/client";
import { unregisterServiceWorker, clearAllCaches } from '../../src/services/sw/register';
interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApiConfigModal({
  isOpen,
  onClose,
  onSuccess,
}: ApiConfigModalProps) {
  const [apiUrl, setApiUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(apiConfig.getApiUrl().replace(/\/api$/, ""));
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    const url = apiUrl.endsWith("/api") ? apiUrl : apiUrl + "/api";
    const result = await apiClient.testConnection(url);

    setTestResult(result);
    setIsTesting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Sauvegarder l'URL
    apiConfig.setApiUrl(apiUrl);

    // Attendre un peu pour montrer le feedback
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsSaving(false);
    onSuccess();
    onClose();
  };

  const handleReset = () => {
    apiConfig.resetToDefault();
    setApiUrl("http://localhost:8000");
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Configuration de l'API
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Entrez l'URL de l'API GuardTrack Pro (ex: http://localhost:8000)
        </p>

        <div className="space-y-4">
          {/* Input URL */}
          <div>
            <label
              htmlFor="apiUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              URL de l'API
            </label>
            <input
              id="apiUrl"
              type="text"
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://localhost:8000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              L'URL doit pointer vers votre serveur backend
            </p>
          </div>

          {/* Résultat du test */}
          {testResult && (
            <div
              className={`p-3 rounded-md ${
                testResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              {testResult.success ? (
                <p className="text-sm text-green-800 flex items-center">
                  <span className="mr-2">✅</span>
                  Connexion réussie ! L'API est accessible.
                </p>
              ) : (
                <p className="text-sm text-red-800">
                  <span className="mr-2">❌</span>
                  {testResult.error || "Impossible de se connecter à l'API"}
                </p>
              )}
            </div>
          )}

          {/* URL par défaut */}
          <div className="text-xs text-gray-500">
            <p>URL actuelle : {apiConfig.getApiUrl()}</p>
            {apiConfig.hasCustomApiUrl() && (
              <button
                onClick={handleReset}
                className="mt-1 text-indigo-600 hover:text-indigo-800"
              >
                Réinitialiser à l'URL par défaut
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Annuler
          </button>

          <button
            onClick={handleTest}
            disabled={!apiUrl || isTesting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isTesting ? "Test..." : "Tester la connexion"}
          </button>

          <button
            onClick={handleSave}
            disabled={!apiUrl || !testResult?.success || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={async () => {
              await unregisterServiceWorker();
              await clearAllCaches();
              localStorage.clear();
              alert("✅ Service Worker et caches nettoyés. Rechargez la page.");
              window.location.reload();
            }}
            className="text-xs text-gray-400 underline mt-4"
          >
            🧹 Nettoyer le cache SW
          </button>
        </div>
      </div>
    </div>
  );
}

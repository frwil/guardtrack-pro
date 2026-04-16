'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../src/services/api/client';
import { apiConfig } from '../src/services/api/config';
import { ApiConfigModal } from '../src/components/ApiConfigModal';
export default function HomePage() {
  const router = useRouter();
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [showConfig, setShowConfig] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    setApiStatus('checking');
    const result = await apiClient.testConnection();
    alert(`Test connexion: ${result.success ? 'OK' : 'Échec'}`);
    
    if (result.success) {
      setApiStatus('available');
      // Rediriger vers login après un court délai
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else {
      setApiStatus('unavailable');
      setErrorDetails(result.error || '');
    }
  };

  const handleConfigSuccess = () => {
    setShowConfig(false);
    checkApiConnection();
  };

  // Écran de chargement
  if (apiStatus === 'checking') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-indigo-100 to-purple-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛡️ GuardTrack Pro
          </h1>
          <div className="flex items-center justify-center space-x-2 mt-8">
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <p className="mt-4 text-gray-600">
            Connexion à l'API...
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {apiConfig.getApiUrl()}
          </p>
        </div>
      </main>
    );
  }

  // API disponible - Redirection vers login
  if (apiStatus === 'available') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-100 to-emerald-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛡️ GuardTrack Pro
          </h1>
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <p className="text-xl text-gray-700">
            API connectée !
          </p>
          <p className="mt-2 text-gray-500">
            Redirection vers la page de connexion...
          </p>
        </div>
      </main>
    );
  }

  // API non disponible - Affichage de la configuration
  return (
    <>
      <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-red-100 to-orange-100">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🛡️ GuardTrack Pro
          </h1>
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            API non accessible
          </h2>
          <p className="text-gray-600 mb-4">
            Impossible de se connecter à l'API GuardTrack.
          </p>
          {errorDetails && (
            <p className="text-sm text-red-600 mb-4 bg-red-50 p-2 rounded">
              {errorDetails}
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            URL actuelle : {apiConfig.getApiUrl()}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => setShowConfig(true)}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Configurer l'URL de l'API
            </button>
            
            <button
              onClick={checkApiConnection}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </main>

      <ApiConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        onSuccess={handleConfigSuccess}
      />
    </>
  );
}
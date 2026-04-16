'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faServer,
  faDatabase,
  faHardDrive,
  faMemory,
  faMicrochip,
  faCircleCheck,
  faCircleExclamation,
  faTriangleExclamation,
  faSpinner,
  faRotate,
  faClock,
  faNetworkWired,
  faDownload,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';

interface SystemInfo {
  php: { version: string; memoryLimit: string; maxExecutionTime: number };
  database: { version: string; size: string; connections: number };
  server: { software: string; uptime: string; load: number[] };
  storage: { total: string; used: string; free: string; percent: number };
  cache: { hits: number; misses: number; size: string };
  queue: { pending: number; processing: number; failed: number };
  network: { download: string; upload: string; latency: number };
}

export default function SystemPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const loadSystemInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/system', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
      });
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !systemInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
      </div>
    );
  }

  const getStorageColor = (percent: number) => {
    if (percent < 70) return 'text-green-600';
    if (percent < 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faServer} className="mr-3 text-purple-600" />
            Santé système
          </h1>
          <button
            onClick={loadSystemInfo}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faRotate} className="mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Cartes principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">PHP</p>
              <p className="text-xl font-bold">{systemInfo.php.version}</p>
            </div>
            <FontAwesomeIcon icon={faMicrochip} className="text-2xl text-indigo-300" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Mémoire: {systemInfo.php.memoryLimit} • Timeout: {systemInfo.php.maxExecutionTime}s
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Base de données</p>
              <p className="text-xl font-bold">{systemInfo.database.version}</p>
            </div>
            <FontAwesomeIcon icon={faDatabase} className="text-2xl text-blue-300" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Taille: {systemInfo.database.size} • Connexions: {systemInfo.database.connections}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stockage</p>
              <p className="text-xl font-bold">{systemInfo.storage.used} / {systemInfo.storage.total}</p>
            </div>
            <FontAwesomeIcon icon={faHardDrive} className="text-2xl text-green-300" />
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  systemInfo.storage.percent < 70 ? 'bg-green-500' :
                  systemInfo.storage.percent < 90 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${systemInfo.storage.percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="text-xl font-bold">{systemInfo.server.uptime}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-2xl text-purple-300" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Load: {systemInfo.server.load.map(l => l.toFixed(2)).join(' / ')}
          </p>
        </div>
      </div>

      {/* Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4 flex items-center">
            <FontAwesomeIcon icon={faMemory} className="mr-2 text-indigo-600" />
            Cache
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Hits</span>
              <span className="font-medium text-green-600">{systemInfo.cache.hits}</span>
            </div>
            <div className="flex justify-between">
              <span>Misses</span>
              <span className="font-medium text-yellow-600">{systemInfo.cache.misses}</span>
            </div>
            <div className="flex justify-between">
              <span>Taux de réussite</span>
              <span className="font-medium">
                {((systemInfo.cache.hits / (systemInfo.cache.hits + systemInfo.cache.misses || 1)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taille</span>
              <span>{systemInfo.cache.size}</span>
            </div>
          </div>
        </div>

        {/* Files d'attente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-4 flex items-center">
            <FontAwesomeIcon icon={faNetworkWired} className="mr-2 text-orange-600" />
            Files d'attente
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>En attente</span>
              <span className="font-medium text-yellow-600">{systemInfo.queue.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>En cours</span>
              <span className="font-medium text-blue-600">{systemInfo.queue.processing}</span>
            </div>
            <div className="flex justify-between">
              <span>Échouées</span>
              <span className="font-medium text-red-600">{systemInfo.queue.failed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Réseau */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4 flex items-center">
          <FontAwesomeIcon icon={faNetworkWired} className="mr-2 text-blue-600" />
          Réseau
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <FontAwesomeIcon icon={faDownload} className="text-2xl text-green-600 mb-2" />
            <p className="text-sm text-gray-500">Download</p>
            <p className="text-xl font-bold">{systemInfo.network.download}</p>
          </div>
          <div className="text-center">
            <FontAwesomeIcon icon={faUpload} className="text-2xl text-blue-600 mb-2" />
            <p className="text-sm text-gray-500">Upload</p>
            <p className="text-xl font-bold">{systemInfo.network.upload}</p>
          </div>
          <div className="text-center">
            <FontAwesomeIcon icon={faClock} className="text-2xl text-purple-600 mb-2" />
            <p className="text-sm text-gray-500">Latence</p>
            <p className="text-xl font-bold">{systemInfo.network.latency}ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
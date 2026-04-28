'use client';

import { useEffect, useState } from 'react';
import { backupService, BackupStats } from '../../../../src/services/api/backup';

const ENTITY_LABELS: Record<keyof BackupStats, string> = {
  users:       'Utilisateurs',
  clients:     'Clients',
  sites:       'Sites',
  assignments: 'Affectations',
  rounds:      'Rondes',
  incidents:   'Incidents',
  presences:   'Présences',
  timesheets:  'Feuilles de temps',
};

export default function BackupPage() {
  const [stats, setStats]         = useState<BackupStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [lastBackup, setLastBackup]   = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    backupService.getStats()
      .then(setStats)
      .finally(() => setLoading(false));

    const saved = localStorage.getItem('guardtrack_last_backup');
    if (saved) setLastBackup(saved);
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setSuccess(false);
    try {
      await backupService.download();
      const now = new Date().toLocaleString('fr-FR');
      localStorage.setItem('guardtrack_last_backup', now);
      setLastBackup(now);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du backup');
    } finally {
      setDownloading(false);
    }
  };

  const total = stats
    ? Object.values(stats).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* En-tête */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              💾 Sauvegarde des données
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Exportez l'intégralité de la base de données en JSON.
              Le fichier peut être réimporté ou archivé hors-ligne.
            </p>
            {lastBackup && (
              <p className="mt-2 text-xs text-gray-400">
                Dernier backup : <span className="font-medium text-gray-600">{lastBackup}</span>
              </p>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading || loading}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération…
              </>
            ) : (
              <>⬇️ Télécharger le backup</>
            )}
          </button>
        </div>

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ Backup téléchargé avec succès.
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ❌ {error}
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Contenu du backup
          {!loading && (
            <span className="ml-2 text-sm font-normal text-gray-400">
              — {total.toLocaleString('fr-FR')} enregistrements au total
            </span>
          )}
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.keys(ENTITY_LABELS) as (keyof BackupStats)[]).map((key) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {stats[key].toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{ENTITY_LABELS[key]}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Impossible de charger les statistiques.</p>
        )}
      </div>

      {/* Informations */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">📋 À savoir</h3>
        <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
          <li>Le backup inclut tous les utilisateurs, sites, clients, affectations, rondes, incidents, présences et feuilles de temps.</li>
          <li>Les mots de passe ne sont <strong>jamais</strong> exportés.</li>
          <li>Le fichier JSON peut être archivé ou utilisé pour une migration.</li>
          <li>Planifiez un backup régulier (hebdomadaire recommandé).</li>
        </ul>
      </div>
    </div>
  );
}

// app/dashboard/admin/activity/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { activityLogService, ActivityLogEntry, ActivityLogFilters, ActivityLogStats } from '../../../../src/services/api/activityLog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faHistory, faFilter, faDownload, faSearch,
  faCheckCircle, faTimesCircle, faClock, faUser,
  faCalendar, faChevronDown, faFileExport, faChartBar,
  faSignInAlt, faSignOutAlt, faPlus, faEdit, faTrash,
  faMapMarkerAlt, faClipboardCheck, faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';

export default function ActivityLogPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        activityLogService.list(filters),
        activityLogService.getStats({ startDate: filters.startDate, endDate: filters.endDate }),
      ]);
      setLogs(logsData.data);
      setTotal(logsData.total);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      LOGIN: faSignInAlt,
      LOGOUT: faSignOutAlt,
      CREATE: faPlus,
      UPDATE: faEdit,
      DELETE: faTrash,
      CHECK_IN: faMapMarkerAlt,
      CHECK_OUT: faMapMarkerAlt,
      VALIDATE_PRESENCE: faCheckCircle,
      REJECT_PRESENCE: faTimesCircle,
      CREATE_INCIDENT: faExclamationTriangle,
    };
    return icons[action] || faHistory;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      SUCCESS: { color: 'bg-green-100 text-green-800', icon: faCheckCircle },
      FAILED: { color: 'bg-red-100 text-red-800', icon: faTimesCircle },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: faClock },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', icon: faClock };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const blob = await activityLogService.export(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur d\'export:', error);
    }
  };

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
              <FontAwesomeIcon icon={faHistory} className="mr-3 text-indigo-600" />
              Journal d'Activité
            </h1>
            <p className="text-gray-600 mt-1">
              {total} événement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faFilter} className="mr-2" />
              Filtres
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              JSON
            </button>
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Recherche..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="px-3 py-2 border rounded-lg"
            />
            <select
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value as any, page: 1 })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Toutes les actions</option>
              <option value="LOGIN">Connexion</option>
              <option value="CREATE">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any, page: 1 })}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Tous les statuts</option>
              <option value="SUCCESS">Succès</option>
              <option value="FAILED">Échec</option>
              <option value="PENDING">En attente</option>
            </select>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total événements</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Succès</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus?.SUCCESS || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Échecs</p>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus?.FAILED || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Utilisateurs actifs</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byUser?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Liste des logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entité</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const statusBadge = getStatusBadge(log.status);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                          <div>
                            <p className="font-medium text-gray-900">{log.userEmail}</p>
                            <p className="text-xs text-gray-500">{log.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={getActionIcon(log.action)} className="text-gray-400 mr-2" />
                          <span className="text-sm">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.entity}
                        {log.entityId && <span className="text-gray-400 ml-1">#{log.entityId}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center w-fit ${statusBadge.color}`}>
                          <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedLog(log); setShowDetailModal(true); }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          Voir détails
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > (filters.limit || 50) && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <button
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              disabled={filters.page === 1}
              className="px-3 py-1 text-gray-600 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-600">
              Page {filters.page} sur {Math.ceil(total / (filters.limit || 50))}
            </span>
            <button
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              disabled={filters.page! * (filters.limit || 50) >= total}
              className="px-3 py-1 text-gray-600 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Détails de l'événement</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Utilisateur</p>
                  <p className="font-medium">{selectedLog.userEmail} ({selectedLog.userRole})</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entité</p>
                  <p className="font-medium">{selectedLog.entity} #{selectedLog.entityId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(selectedLog.status).color}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adresse IP</p>
                  <p className="font-medium">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
              </div>
              
              {selectedLog.errorMessage && (
                <div>
                  <p className="text-sm text-gray-500">Erreur</p>
                  <p className="text-red-600">{selectedLog.errorMessage}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-500 mb-2">Détails</p>
                <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
              
              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm text-gray-500">User Agent</p>
                  <p className="text-xs text-gray-400 break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedLog(null); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
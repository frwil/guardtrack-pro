'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScroll,
  faSearch,
  faFilter,
  faCalendar,
  faUser,
  faSpinner,
  faRotate,
  faEye,
  faChevronLeft,
  faChevronRight,
  faDownload,
  faFileExcel,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';

interface AuditLog {
  id: number;
  actionType: string;
  entityType: string;
  entityId: string;
  user: { id: number; fullName: string } | null;
  details: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, userFilter, dateRange]);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin/audit', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
      });
      const data = await response.json();
      setLogs(data.logs || []);
      
      // Extraire les types d'actions uniques
      const actions = [...new Set(data.logs?.map((l: AuditLog) => l.actionType) || [])];
      setActionTypes(actions as string[]);
      
      // Extraire les utilisateurs uniques
      const uniqueUsers = data.logs
        ?.filter((l: AuditLog) => l.user)
        .map((l: AuditLog) => ({ id: l.user!.id, name: l.user!.fullName }))
        .filter((v: any, i: any, a: any) => a.findIndex((t: any) => t.id === v.id) === i);
      setUsers(uniqueUsers || []);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(l =>
        l.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.ipAddress?.includes(searchTerm)
      );
    }

    if (actionFilter) {
      filtered = filtered.filter(l => l.actionType === actionFilter);
    }

    if (userFilter) {
      filtered = filtered.filter(l => l.user?.id.toString() === userFilter);
    }

    if (dateRange.start) {
      filtered = filtered.filter(l => l.createdAt >= dateRange.start);
    }
    if (dateRange.end) {
      filtered = filtered.filter(l => l.createdAt <= dateRange.end + 'T23:59:59');
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      LOGIN: 'Connexion',
      LOGOUT: 'Déconnexion',
      CREATE: 'Création',
      UPDATE: 'Modification',
      DELETE: 'Suppression',
      VALIDATE: 'Validation',
      REJECT: 'Rejet',
      CHECK_IN: 'Pointage entrée',
      CHECK_OUT: 'Pointage sortie',
      START_ROUND: 'Démarrage ronde',
      COMPLETE_ROUND: 'Ronde terminée',
      VISIT_SITE: 'Visite site',
      CREATE_INCIDENT: 'Création incident',
      RESOLVE_INCIDENT: 'Résolution incident',
      ASSIGN: 'Assignation',
      EXPORT: 'Export',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('VALIDATE')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('REJECT')) return 'bg-orange-100 text-orange-800';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (iso: string): string => {
    return new Date(iso).toLocaleString('fr-FR');
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format,
        ...(searchTerm && { search: searchTerm }),
        ...(actionFilter && { action: actionFilter }),
        ...(userFilter && { user: userFilter }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });
      
      const response = await fetch(`/api/superadmin/audit/export?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
              <FontAwesomeIcon icon={faScroll} className="mr-3 text-indigo-600" />
              Journal d'audit
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredLogs.length} événement{filteredLogs.length > 1 ? 's' : ''} enregistré{filteredLogs.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport('excel')}
              disabled={isExporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
              PDF
            </button>
            <button
              onClick={loadAuditLogs}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Toutes les actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>{getActionLabel(action)}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <FontAwesomeIcon icon={faCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="relative flex-1">
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getActionColor(log.actionType)}`}>
                        {getActionLabel(log.actionType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user?.fullName || 'Système'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.entityType ? `${log.entityType} #${log.entityId}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} sur {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal détails */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Détails de l'événement</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    <p className="font-medium">{getActionLabel(selectedLog.actionType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Utilisateur</p>
                    <p className="font-medium">{selectedLog.user?.fullName || 'Système'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adresse IP</p>
                    <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entité</p>
                    <p className="font-medium">
                      {selectedLog.entityType ? `${selectedLog.entityType} #${selectedLog.entityId}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User Agent</p>
                    <p className="font-medium text-xs truncate">{selectedLog.userAgent || '-'}</p>
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Détails</p>
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../../src/stores/authStore';
import { incidentsService, Incident } from '../../../../src/services/api/incidents';
import Link from 'next/link';

export default function AgentIncidentsPage() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await incidentsService.getMyIncidents();
      setIncidents(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, string> = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return badges[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: string }> = {
      OPEN: { color: 'bg-red-100 text-red-800', text: 'Ouvert', icon: '🔴' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', text: 'En cours', icon: '🟡' },
      RESOLVED: { color: 'bg-green-100 text-green-800', text: 'Résolu', icon: '🟢' },
      CLOSED: { color: 'bg-gray-100 text-gray-800', text: 'Fermé', icon: '⚪' },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: '📌' };
  };

  const filteredIncidents = incidents.filter(i => {
    if (filter === 'open') return ['OPEN', 'IN_PROGRESS'].includes(i.status);
    if (filter === 'resolved') return ['RESOLVED', 'CLOSED'].includes(i.status);
    return true;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length,
    resolved: incidents.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des incidents...</p>
        </div>
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
              <span className="mr-3">⚠️</span>
              Mes incidents
            </h1>
            <p className="text-gray-600 mt-1">
              Historique de vos déclarations d'incidents
            </p>
          </div>
          <Link
            href="/dashboard/agent/incidents/create"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <span className="mr-2">🚨</span>
            Déclarer un incident
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">En cours</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Résolus</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-2">
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'Tous'}
              {f === 'open' && '🟡 En cours'}
              {f === 'resolved' && '🟢 Résolus'}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="text-gray-500 text-lg">Aucun incident déclaré</p>
            <Link
              href="/dashboard/agent/incidents/create"
              className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Déclarer un incident
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredIncidents.map((incident) => {
              const statusBadge = getStatusBadge(incident.status);
              
              return (
                <div key={incident.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                        <span className={`ml-3 px-2 py-1 rounded-full text-xs ${getSeverityBadge(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
                          {statusBadge.icon} {statusBadge.text}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{incident.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Catégorie :</span>{' '}
                          <span>{incident.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Site :</span>{' '}
                          <span>{incident.site.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Déclaré le :</span>{' '}
                          <span>{new Date(incident.reportedAt).toLocaleString('fr-FR')}</span>
                        </div>
                        {incident.assignedTo && (
                          <div>
                            <span className="text-gray-500">Assigné à :</span>{' '}
                            <span>{incident.assignedTo.fullName}</span>
                          </div>
                        )}
                        {incident.resolvedAt && (
                          <div>
                            <span className="text-gray-500">Résolu le :</span>{' '}
                            <span>{new Date(incident.resolvedAt).toLocaleString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      
                      {incident.resolution && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-500">Résolution :</p>
                          <p className="text-gray-700">{incident.resolution}</p>
                        </div>
                      )}

                      {incident.hasPhotos && (
                        <p className="text-xs text-gray-400 mt-2">📸 Photos disponibles</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
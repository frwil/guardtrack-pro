'use client';

import { useEffect, useState } from 'react';
import { incidentsService, Incident } from '../../../../src/services/api/incidents';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faCircleExclamation,
  faCircle,
  faClock,
  faMapPin,
  faUser,
  faSpinner,
  faFilter,
  faSearch,
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function ControleurIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    filterIncidents();
  }, [incidents, searchTerm, severityFilter, statusFilter]);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await incidentsService.list();
      setIncidents(data);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterIncidents = () => {
    let filtered = [...incidents];

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.reporter.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (severityFilter) {
      filtered = filtered.filter(i => i.severity === severityFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(i => i.status === statusFilter);
    }

    setFilteredIncidents(filtered);
  };

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      LOW: { color: 'bg-blue-100 text-blue-800', icon: faCircle },
      MEDIUM: { color: 'bg-yellow-100 text-yellow-800', icon: faTriangleExclamation },
      HIGH: { color: 'bg-orange-100 text-orange-800', icon: faTriangleExclamation },
      CRITICAL: { color: 'bg-red-100 text-red-800', icon: faCircleExclamation },
    };
    return badges[severity] || { color: 'bg-gray-100 text-gray-800', icon: faCircle };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      OPEN: 'bg-red-100 text-red-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length,
    critical: incidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length,
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-3">⚠️</span>
          Incidents
        </h1>
        <p className="text-gray-600 mt-1">
          {filteredIncidents.length} incident{filteredIncidents.length > 1 ? 's' : ''}
        </p>
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
          <p className="text-sm text-gray-500">Critiques</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Toutes les sévérités</option>
              <option value="LOW">Faible</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Élevée</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="OPEN">Ouvert</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="RESOLVED">Résolu</option>
              <option value="CLOSED">Fermé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucun incident trouvé</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredIncidents.map((incident) => {
              const severityBadge = getSeverityBadge(incident.severity);

              return (
                <div key={incident.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                        <span className={`ml-3 px-2 py-1 rounded-full text-xs flex items-center ${severityBadge.color}`}>
                          <FontAwesomeIcon icon={severityBadge.icon} className="mr-1" />
                          {incident.severity}
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadge(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-2">{incident.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="mr-2 w-4" />
                          {incident.reporter.fullName}
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faMapPin} className="mr-2 w-4" />
                          {incident.site.name}
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faClock} className="mr-2 w-4" />
                          {new Date(incident.reportedAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/controleur/incidents/${incident.id}`}
                      className="ml-4 text-indigo-600 hover:text-indigo-800"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      Détails
                    </Link>
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
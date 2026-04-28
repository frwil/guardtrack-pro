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
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useTranslation } from '../../../../src/contexts/I18nContext';

export default function ControleurIncidentsPage() {
  const { t } = useTranslation();
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
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      LOW: { color: 'bg-blue-100 text-blue-800', icon: faCircle, label: t('controller.incidents.severityLow') },
      MEDIUM: { color: 'bg-yellow-100 text-yellow-800', icon: faTriangleExclamation, label: t('controller.incidents.severityMedium') },
      HIGH: { color: 'bg-orange-100 text-orange-800', icon: faTriangleExclamation, label: t('controller.incidents.severityHigh') },
      CRITICAL: { color: 'bg-red-100 text-red-800', icon: faCircleExclamation, label: t('controller.incidents.severityCritical') },
    };
    return badges[severity] || { color: 'bg-gray-100 text-gray-800', icon: faCircle, label: severity };
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      OPEN: { color: 'bg-red-100 text-red-800', label: t('controller.incidents.statusOpen') },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: t('controller.incidents.statusInProgress') },
      RESOLVED: { color: 'bg-green-100 text-green-800', label: t('controller.incidents.statusResolved') },
      CLOSED: { color: 'bg-gray-100 text-gray-800', label: t('controller.incidents.statusClosed') },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="mr-3">⚠️</span>
              {t('controller.incidents.title')}
            </h1>
            <p className="text-gray-600 mt-1">
              {`${filteredIncidents.length} ${t('controller.incidents.incidentCount')}`}
            </p>
          </div>
          
          {/* ✅ Bouton pour déclarer un incident */}
          <Link
            href="/dashboard/controleur/incidents/create"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            {t('controller.incidents.reportIncident')}
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('controller.incidents.total')}</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('controller.incidents.inProgress')}</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('controller.incidents.critical')}</p>
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
              placeholder={t('controller.incidents.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('controller.incidents.allSeverities')}</option>
              <option value="LOW">{t('controller.incidents.severityLow')}</option>
              <option value="MEDIUM">{t('controller.incidents.severityMedium')}</option>
              <option value="HIGH">{t('controller.incidents.severityHigh')}</option>
              <option value="CRITICAL">{t('controller.incidents.severityCritical')}</option>
            </select>
          </div>
          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('controller.incidents.allStatuses')}</option>
              <option value="OPEN">{t('controller.incidents.statusOpen')}</option>
              <option value="IN_PROGRESS">{t('controller.incidents.statusInProgress')}</option>
              <option value="RESOLVED">{t('controller.incidents.statusResolved')}</option>
              <option value="CLOSED">{t('controller.incidents.statusClosed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-4xl text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">{t('controller.incidents.none')}</p>
            <Link
              href="/dashboard/controleur/incidents/create"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              {t('controller.incidents.reportIncident')}
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {filteredIncidents.map((incident) => {
              const severityBadge = getSeverityBadge(incident.severity);
              const statusBadge = getStatusBadge(incident.status);

              return (
                <div key={incident.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{incident.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs flex items-center ${severityBadge.color}`}>
                          <FontAwesomeIcon icon={severityBadge.icon} className="mr-1" />
                          {severityBadge.label}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{incident.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faUser} className="mr-2 w-4 text-gray-400" />
                          {incident.reporter.fullName}
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faMapPin} className="mr-2 w-4 text-gray-400" />
                          {incident.site.name}
                        </div>
                        <div className="flex items-center">
                          <FontAwesomeIcon icon={faClock} className="mr-2 w-4 text-gray-400" />
                          {new Date(incident.reportedAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/controleur/incidents/${incident.id}`}
                      className="ml-4 px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-1" />
                      {t('controller.incidents.details')}
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
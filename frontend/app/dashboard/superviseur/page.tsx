'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../src/stores/authStore';
import { dashboardService } from '../../../src/services/api/dashboard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faBuilding,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faChartBar,
  faSpinner,
  faRotate,
  faArrowRight,
  faMapPin,
  faUser,
  faCalendar,
  faClipboardCheck,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function SuperviseurDashboardPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalSites: 0,
    pendingValidations: 0,
    openIncidents: 0,
    disputes: 0,
  });
  const [recentPresences, setRecentPresences] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [sitesWithActivity, setSitesWithActivity] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState({
    presences: 0,
    absences: 0,
    rounds: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const dashData = await dashboardService.getSuperviseur();
      if (!dashData) return;

      setStats({
        totalAgents: dashData.totalAgents ?? 0,
        activeAgents: dashData.activeAgents ?? 0,
        totalSites: dashData.totalSites ?? 0,
        pendingValidations: dashData.pendingValidations ?? 0,
        openIncidents: dashData.openIncidents ?? 0,
        disputes: dashData.disputes ?? 0,
      });

      setRecentPresences(dashData.recentPresences ?? []);
      setRecentIncidents(dashData.recentIncidents ?? []);

      // Activité par site calculée depuis les présences récentes
      const presencesBySite: Record<number, { name: string; address?: string; presenceCount: number; validatedCount: number }> = {};
      for (const p of (dashData.recentPresences ?? [])) {
        const siteId = p.site?.id;
        if (!siteId) continue;
        if (!presencesBySite[siteId]) {
          presencesBySite[siteId] = { name: p.site.name, presenceCount: 0, validatedCount: 0 };
        }
        presencesBySite[siteId].presenceCount++;
        if (p.status === 'VALIDATED') presencesBySite[siteId].validatedCount++;
      }
      setSitesWithActivity(
        Object.entries(presencesBySite)
          .map(([id, data]) => ({ id: Number(id), ...data }))
          .sort((a, b) => b.presenceCount - a.presenceCount)
          .slice(0, 5)
      );

      setTodayStats({
        presences: dashData.todayPresences ?? 0,
        absences: 0,
        rounds: dashData.todayRounds ?? 0,
      });
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getDateString = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.firstName || user?.fullName} !
            </h1>
            <p className="text-indigo-100 mt-1">{getDateString()}</p>
            <p className="text-indigo-200 text-sm mt-2">
              Tableau de bord Superviseur - Vue d'ensemble
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faRotate} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link href="/dashboard/superviseur/sites" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sites</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalSites}</p>
            </div>
            <FontAwesomeIcon icon={faBuilding} className="text-2xl text-indigo-300" />
          </div>
        </Link>

        <Link href="/dashboard/superviseur/assignments" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Agents</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalAgents}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="text-2xl text-blue-300" />
          </div>
          <p className="text-xs text-gray-400 mt-1">{stats.activeAgents} actifs</p>
        </Link>

        <Link href="/dashboard/controleur/validation" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">À valider</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingValidations}</p>
            </div>
            <FontAwesomeIcon icon={faClock} className="text-2xl text-yellow-300" />
          </div>
        </Link>

        <Link href="/dashboard/controleur/incidents" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Incidents ouverts</p>
              <p className="text-2xl font-bold text-red-600">{stats.openIncidents}</p>
            </div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-red-300" />
          </div>
        </Link>

        <Link href="/dashboard/superviseur/disputes" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Litiges</p>
              <p className="text-2xl font-bold text-orange-600">{stats.disputes}</p>
            </div>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-orange-300" />
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Présences aujourd'hui</p>
              <p className="text-2xl font-bold text-green-600">{todayStats.presences}</p>
            </div>
            <FontAwesomeIcon icon={faCheckCircle} className="text-2xl text-green-300" />
          </div>
        </div>
      </div>

      {/* Activité du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">✅ Présences</p>
          <p className="text-2xl font-bold text-green-600">{todayStats.presences}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">❌ Absences</p>
          <p className="text-2xl font-bold text-red-600">{todayStats.absences}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">🔄 Rondes</p>
          <p className="text-2xl font-bold text-blue-600">{todayStats.rounds}</p>
        </div>
      </div>

      {/* Contenu principal - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sites avec activité */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faBuilding} className="mr-2 text-indigo-600" />
              Sites les plus actifs
            </h2>
            <Link href="/dashboard/superviseur/sites" className="text-sm text-indigo-600 hover:text-indigo-800">
              Voir tout <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>
          <div className="p-4">
            {sitesWithActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune activité aujourd'hui</p>
            ) : (
              <div className="space-y-3">
                {sitesWithActivity.map((site) => (
                  <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-gray-500">{site.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{site.presenceCount} pointages</p>
                      <p className="text-xs text-green-600">{site.validatedCount} validés</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Incidents récents */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2 text-red-600" />
              Incidents récents
            </h2>
            <Link href="/dashboard/controleur/incidents" className="text-sm text-indigo-600 hover:text-indigo-800">
              Voir tout <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>
          <div className="p-4">
            {recentIncidents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun incident récent</p>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/dashboard/controleur/incidents/${incident.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <p className="text-sm text-gray-500">{incident.site?.name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        incident.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        incident.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(incident.reportedAt).toLocaleString('fr-FR')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dernières présences */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faClipboardCheck} className="mr-2 text-green-600" />
            Dernières présences
          </h2>
        </div>
        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Agent</th>
                <th className="py-2">Site</th>
                <th className="py-2">Heure</th>
                <th className="py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentPresences.map((presence) => (
                <tr key={presence.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{presence.agent?.fullName}</td>
                  <td className="py-2">{presence.site?.name}</td>
                  <td className="py-2">{new Date(presence.checkIn).toLocaleTimeString('fr-FR')}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      presence.status === 'VALIDATED' ? 'bg-green-100 text-green-800' :
                      presence.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {presence.status === 'VALIDATED' ? 'Validé' :
                       presence.status === 'PENDING' ? 'En attente' : 'Rejeté'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
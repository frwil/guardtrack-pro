'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../src/stores/authStore';
import { dashboardService } from '../../../src/services/api/dashboard';
import { usersService } from '../../../src/services/api/users';
import { sitesService } from '../../../src/services/api/sites';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faBuilding,
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
  faArrowRight,
  faChartBar,
  faScroll,
  faPuzzlePiece,
  faShield,
  faCrown,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { useAppSettings } from '../../../src/contexts/AppSettingsContext';

interface SystemHealth {
  database: 'connected' | 'disconnected';
  storage: 'ok' | 'warning' | 'critical';
  cache: 'ok' | 'warning';
  queue: number;
  uptime: string;
}

export default function SuperAdminDashboardPage() {
  const { user } = useAuthStore();
  const { currencySymbol } = useAppSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalSites: 0,
    totalClients: 0,
    monthRevenue: 0,
    pendingDisputes: 0,
  });
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'connected',
    storage: 'ok',
    cache: 'ok',
    queue: 0,
    uptime: '7 jours',
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activeModules, setActiveModules] = useState<string[]>([
    'pointage', 'rondes', 'incidents', 'rapports', 'offline'
  ]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [dashData, users, sites] = await Promise.all([
        dashboardService.getSuperAdmin(),
        usersService.list(),
        sitesService.list(),
      ]);

      // Calculer les utilisateurs par rôle
      const roleCounts: Record<string, number> = {};
      users.forEach((u: any) => {
        roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
      });
      setUsersByRole(roleCounts);

      setStats({
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.isActive).length,
        totalSites: sites.length,
        totalClients: dashData?.clients?.total || 0,
        monthRevenue: dashData?.financials?.monthRevenue || 0,
        pendingDisputes: dashData?.disputes || 0,
      });

      setSystemHealth(dashData?.system?.health || systemHealth);
      setRecentActivity(dashData?.recentActivity || []);
      setActiveModules(dashData?.system?.modules || activeModules);
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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <FontAwesomeIcon icon={faCrown} className="mr-3" />
              {getGreeting()}, {user?.firstName || user?.fullName} !
            </h1>
            <p className="text-purple-100 mt-1">
              Tableau de bord Super Administrateur
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faRotate} className="mr-2" />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Utilisateurs</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.totalUsers}</p>
            </div>
            <FontAwesomeIcon icon={faUsers} className="text-2xl text-indigo-300" />
          </div>
          <p className="text-xs text-gray-400 mt-1">{stats.activeUsers} actifs</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sites</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalSites}</p>
            </div>
            <FontAwesomeIcon icon={faBuilding} className="text-2xl text-blue-300" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clients</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalClients}</p>
            </div>
            <FontAwesomeIcon icon={faBuilding} className="text-2xl text-green-300" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenu mensuel</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.monthRevenue} {currencySymbol}</p>
            </div>
            <FontAwesomeIcon icon={faChartBar} className="text-2xl text-emerald-300" />
          </div>
        </div>

        <Link href="/dashboard/superadmin/conflicts" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Litiges</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingDisputes}</p>
            </div>
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl text-orange-300" />
          </div>
        </Link>

        <Link href="/dashboard/superadmin/system" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Santé système</p>
              <p className="text-2xl font-bold text-purple-600">
                {systemHealth.database === 'connected' ? '✅' : '⚠️'}
              </p>
            </div>
            <FontAwesomeIcon icon={faServer} className="text-2xl text-purple-300" />
          </div>
        </Link>
      </div>

      {/* Contenu principal - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition des utilisateurs */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faUsers} className="mr-2 text-indigo-600" />
              Répartition des utilisateurs
            </h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {Object.entries(usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-gray-700">{role}</span>
                  <div className="flex items-center">
                    <span className="font-medium mr-3">{count}</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Santé système détaillée */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faServer} className="mr-2 text-purple-600" />
              Santé système
            </h2>
            <Link href="/dashboard/superadmin/system" className="text-sm text-indigo-600 hover:text-indigo-800">
              Détails <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faDatabase} className="mr-2 text-gray-400" />
                Base de données
              </span>
              <span className={systemHealth.database === 'connected' ? 'text-green-600' : 'text-red-600'}>
                <FontAwesomeIcon icon={systemHealth.database === 'connected' ? faCircleCheck : faCircleExclamation} className="mr-1" />
                {systemHealth.database === 'connected' ? 'Connectée' : 'Déconnectée'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faHardDrive} className="mr-2 text-gray-400" />
                Stockage
              </span>
              <span className={
                systemHealth.storage === 'ok' ? 'text-green-600' :
                systemHealth.storage === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }>
                {systemHealth.storage === 'ok' ? 'OK' : 'Attention'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faMemory} className="mr-2 text-gray-400" />
                Cache
              </span>
              <span className={systemHealth.cache === 'ok' ? 'text-green-600' : 'text-yellow-600'}>
                {systemHealth.cache === 'ok' ? 'OK' : 'Attention'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faMicrochip} className="mr-2 text-gray-400" />
                Files d'attente
              </span>
              <span>{systemHealth.queue} en attente</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-gray-400" />
                Uptime
              </span>
              <span>{systemHealth.uptime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modules actifs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <FontAwesomeIcon icon={faPuzzlePiece} className="mr-2 text-indigo-600" />
            Modules actifs
          </h2>
          <Link href="/dashboard/superadmin/modules" className="text-sm text-indigo-600 hover:text-indigo-800">
            Gérer <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
          </Link>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {activeModules.map((module) => (
              <span key={module} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✅ {module}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">⚡ Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/dashboard/superadmin/audit" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
            <FontAwesomeIcon icon={faScroll} className="text-2xl text-indigo-600 mb-2" />
            <p className="font-medium">Journal d'audit</p>
          </Link>
          <Link href="/dashboard/superadmin/system" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
            <FontAwesomeIcon icon={faServer} className="text-2xl text-purple-600 mb-2" />
            <p className="font-medium">Santé système</p>
          </Link>
          <Link href="/dashboard/superadmin/modules" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
            <FontAwesomeIcon icon={faPuzzlePiece} className="text-2xl text-green-600 mb-2" />
            <p className="font-medium">Modules</p>
          </Link>
          <Link href="/dashboard/superadmin/conflicts" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
            <FontAwesomeIcon icon={faShield} className="text-2xl text-orange-600 mb-2" />
            <p className="font-medium">Conflits</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
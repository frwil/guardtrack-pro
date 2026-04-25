"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../../src/stores/authStore";
import { dashboardService } from "../../../src/services/api/dashboard";
import { usersService } from "../../../src/services/api/users";
import { sitesService } from "../../../src/services/api/sites";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserCheck,
  faBuilding,
  faLocationDot,
  faTriangleExclamation,
  faMoneyBillTrendUp,
  faRotate,
  faUserPlus,
  faBuildingUser,
  faMapLocationDot,
  faChartBar,
  faDatabase,
  faHardDrive,
  faMemory,
  faCircle,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSites, setRecentSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dashData, users, sites] = await Promise.all([
        dashboardService.getAdmin(),
        usersService.list({ limit: 5 }),
        sitesService.list({ limit: 5 }),
      ]);

      setDashboard(dashData);
      setRecentUsers(users || []);
      setRecentSites(sites || []);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      name: "Utilisateurs total",
      value: dashboard?.users?.total || 0,
      icon: faUsers,
      color: "bg-blue-500",
      href: "/dashboard/admin/users",
    },
    {
      name: "Utilisateurs actifs",
      value: dashboard?.users?.active || 0,
      icon: faUserCheck,
      color: "bg-green-500",
      href: "/dashboard/admin/users?active=true",
    },
    {
      name: "Clients",
      value: dashboard?.clients?.total || 0,
      icon: faBuilding,
      color: "bg-purple-500",
      href: "/dashboard/admin/clients",
    },
    {
      name: "Sites",
      value: dashboard?.sites?.total || 0,
      icon: faLocationDot,
      color: "bg-orange-500",
      href: "/dashboard/admin/sites",
    },
    {
      name: "Incidents ce mois",
      value: dashboard?.system?.incidents?.month || 0,
      icon: faTriangleExclamation,
      color: "bg-red-500",
      href: "/dashboard/admin/incidents",
    },
    {
      name: "Revenu mensuel",
      value: `${dashboard?.financials?.monthRevenue || 0}€`,
      icon: faMoneyBillTrendUp,
      color: "bg-emerald-500",
      href: "/dashboard/admin/finance",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">
              Administration - Bonjour, {user?.firstName || user?.fullName} !
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadData}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div
                className={`w-10 h-10 ${stat.color} rounded-full flex items-center justify-center text-white`}
              >
                <FontAwesomeIcon icon={stat.icon} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Répartition des utilisateurs par rôle */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FontAwesomeIcon icon={faUsers} className="mr-2 text-indigo-600" />
          Répartition des utilisateurs
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {dashboard?.users?.byRole &&
            Object.entries(dashboard.users.byRole).map(
              ([role, count]: [string, any]) => (
                <div
                  key={role}
                  className="bg-gray-50 rounded-lg p-4 text-center"
                >
                  <p className="text-2xl font-bold text-indigo-600">{count}</p>
                  <p className="text-sm text-gray-600">{role}</p>
                </div>
              ),
            )}
        </div>
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilisateurs récents */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faUserPlus}
                className="mr-2 text-green-600"
              />
              Utilisateurs récents
            </h2>
            <Link
              href="/dashboard/admin/users"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Voir tout
              <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.length > 0 ? (
              recentUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                      {u.firstName?.[0]}
                      {u.lastName?.[0]}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{u.fullName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      u.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {u.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucun utilisateur récent
              </p>
            )}
          </div>
        </div>

        {/* Sites récents */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FontAwesomeIcon
                icon={faMapLocationDot}
                className="mr-2 text-orange-600"
              />
              Sites récents
            </h2>
            <Link
              href="/dashboard/admin/sites"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
            >
              Voir tout
              <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentSites.length > 0 ? (
              recentSites.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 flex items-center">
                      <FontAwesomeIcon
                        icon={faLocationDot}
                        className="mr-2 text-gray-400 text-xs"
                      />
                      {s.name}
                    </p>
                    <p className="text-sm text-gray-500 ml-5">
                      {/* ✅ client est une chaîne directe, pas un objet */}
                      {typeof s.client === "string"
                        ? s.client
                        : s.client?.name || "N/A"}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      s.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {s.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                Aucun site récent
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">⚡ Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/dashboard/admin/users/create"
            className="p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-center"
          >
            <FontAwesomeIcon
              icon={faUserPlus}
              className="text-2xl mb-2 text-indigo-600"
            />
            <span className="font-medium text-indigo-700 block mt-2">
              Nouvel utilisateur
            </span>
          </Link>
          <Link
            href="/dashboard/admin/clients/create"
            className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center"
          >
            <FontAwesomeIcon
              icon={faBuildingUser}
              className="text-2xl mb-2 text-purple-600"
            />
            <span className="font-medium text-purple-700 block mt-2">
              Nouveau client
            </span>
          </Link>
          <Link
            href="/dashboard/admin/sites/create"
            className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center"
          >
            <FontAwesomeIcon
              icon={faMapLocationDot}
              className="text-2xl mb-2 text-orange-600"
            />
            <span className="font-medium text-orange-700 block mt-2">
              Nouveau site
            </span>
          </Link>
          <Link
            href="/dashboard/admin/reports"
            className="p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors text-center"
          >
            <FontAwesomeIcon
              icon={faChartBar}
              className="text-2xl mb-2 text-emerald-600"
            />
            <span className="font-medium text-emerald-700 block mt-2">
              Générer rapport
            </span>
          </Link>
        </div>
      </div>

      {/* Santé système (visible uniquement pour SUPERADMIN) */}
      {user?.role === "SUPERADMIN" && dashboard?.system?.health && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FontAwesomeIcon icon={faDatabase} className="mr-2 text-gray-600" />
            Santé système
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 flex items-center">
                <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                Base de données
              </p>
              <p className="text-lg font-medium flex items-center mt-2">
                <FontAwesomeIcon
                  icon={faCircle}
                  className={`mr-2 text-xs ${
                    dashboard.system.health.database === "connected"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                />
                {dashboard.system.health.database}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 flex items-center">
                <FontAwesomeIcon icon={faHardDrive} className="mr-2" />
                Stockage
              </p>
              <p className="text-lg font-medium flex items-center mt-2">
                <FontAwesomeIcon
                  icon={faCircle}
                  className={`mr-2 text-xs ${
                    dashboard.system.health.storage === "ok"
                      ? "text-green-500"
                      : "text-yellow-500"
                  }`}
                />
                {dashboard.system.health.storage}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 flex items-center">
                <FontAwesomeIcon icon={faMemory} className="mr-2" />
                Cache
              </p>
              <p className="text-lg font-medium flex items-center mt-2">
                <FontAwesomeIcon
                  icon={faCircle}
                  className={`mr-2 text-xs ${
                    dashboard.system.health.cache === "ok"
                      ? "text-green-500"
                      : "text-yellow-500"
                  }`}
                />
                {dashboard.system.health.cache}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

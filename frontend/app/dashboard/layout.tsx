"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../src/stores/authStore";
import { networkMonitor } from "../../src/services/network/monitor";
import { NotificationBell } from "../../src/components/NotificationBell";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [networkStatus, setNetworkStatus] = useState(
    networkMonitor.getStatus(),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setNetworkStatus);
    return unsubscribe;
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const navigation = getNavigationByRole(user.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Indicateur réseau */}
      {networkStatus === "offline" && (
        <div className="sticky top-0 z-50 bg-red-500 text-white text-center py-2 text-sm">
          📴 Mode hors ligne - Les données seront synchronisées au retour de la
          connexion
        </div>
      )}
      {networkStatus === "unstable" && (
        <div className="sticky top-0 z-50 bg-orange-500 text-white text-center py-2 text-sm">
          ⚠️ Connexion instable détectée - Synchronisation en pause (5 minutes)
        </div>
      )}
      {networkStatus === "reconnecting" && (
        <div className="sticky top-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm">
          🔄 Reconnexion en cours...
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-indigo-600">🛡️ GuardTrack</h1>
            <p className="text-xs text-gray-500 mt-1">{user.role}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-medium">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.fullName}
                </p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal - AJOUT DE pb-20 SUR MOBILE */}
      <main
        className={`lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8 ${networkStatus !== "online" && networkStatus !== undefined ? "pt-12" : ""}`}
      >
        {/* Barre mobile avec notifications */}
        <div className="lg:hidden mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <h1 className="text-xl font-bold text-indigo-600">🛡️ GuardTrack</h1>
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="text-red-600"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Header desktop avec notifications */}
        <div className="hidden lg:flex items-center justify-end mb-4 space-x-3">
          <NotificationBell />
        </div>

        {children}
      </main>

      {/* Navigation mobile bottom */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="flex justify-around p-2">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg text-xs ${
                pathname === item.href ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="mt-1">{item.shortName || item.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function getNavigationByRole(role: string) {
  const roleNav: Record<string, any[]> = {
    AGENT: [
      {
        name: "Tableau de bord",
        shortName: "Accueil",
        href: "/dashboard/agent",
        icon: "📍",
      },
      {
        name: "Mes rondes",
        shortName: "Rondes",
        href: "/dashboard/agent/rounds",
        icon: "🔄",
      },
      {
        name: "Incidents",
        shortName: "Incidents",
        href: "/dashboard/agent/incidents",
        icon: "⚠️",
      },
      {
        name: "Mon planning",
        shortName: "Planning",
        href: "/dashboard/agent/schedule",
        icon: "📅",
      },
    ],
    CONTROLEUR: [
      {
        name: "Tableau de bord",
        shortName: "Accueil",
        href: "/dashboard/controleur",
        icon: "📊",
      },
      {
        name: "Validation",
        shortName: "Valider",
        href: "/dashboard/controleur/validation",
        icon: "✅",
      },
      {
        name: "Rondes",
        shortName: "Rondes",
        href: "/dashboard/controleur/rounds",
        icon: "🔄",
      },
      {
        name: "Incidents",
        shortName: "Incidents",
        href: "/dashboard/controleur/incidents",
        icon: "⚠️",
      },
      {
        name: "Agents",
        shortName: "Agents",
        href: "/dashboard/controleur/agents",
        icon: "👥",
      },
      {
        name: "Rapports",
        shortName: "Rapports",
        href: "/dashboard/controleur/reports",
        icon: "📈",
      },
      {
        name: "Planning",
        shortName: "Planning",
        href: "/dashboard/controleur/planning",
        icon: "📅",
      },
    ],
    SUPERVISEUR: [
      {
        name: "Tableau de bord",
        shortName: "Accueil",
        href: "/dashboard/superviseur",
        icon: "📊",
      },
      {
        name: "Sites",
        shortName: "Sites",
        href: "/dashboard/superviseur/sites",
        icon: "🏢",
      },
      {
        name: "Affectations",
        shortName: "Affect.",
        href: "/dashboard/superviseur/assignments",
        icon: "📋",
      },
      {
        name: "Rapports",
        shortName: "Rapports",
        href: "/dashboard/superviseur/reports",
        icon: "📈",
      },
      {
        name: "Litiges",
        shortName: "Litiges",
        href: "/dashboard/superviseur/disputes",
        icon: "⚖️",
      },
    ],
    ADMIN: [
      {
        name: "Tableau de bord",
        shortName: "Accueil",
        href: "/dashboard/admin",
        icon: "⚙️",
      },
      {
        name: "Utilisateurs",
        shortName: "Users",
        href: "/dashboard/admin/users",
        icon: "👤",
      },
      {
        name: "Clients",
        shortName: "Clients",
        href: "/dashboard/admin/clients",
        icon: "🏛️",
      },
      {
        name: "Finance",
        shortName: "Finance",
        href: "/dashboard/admin/finance",
        icon: "💰",
      },
      {
        name: "Paramètres",
        shortName: "Params",
        href: "/dashboard/admin/settings",
        icon: "🔧",
      },
      {
        name: "Conflits",
        shortName: "Conflits",
        href: "/dashboard/admin/conflicts",
        icon: "⚠️",
      },
    ],
    SUPERADMIN: [
      {
        name: "Tableau de bord",
        shortName: "Accueil",
        href: "/dashboard/superadmin",
        icon: "👑",
      },
      {
        name: "Système",
        shortName: "Système",
        href: "/dashboard/superadmin/system",
        icon: "🖥️",
      },
      {
        name: "Audit",
        shortName: "Audit",
        href: "/dashboard/superadmin/audit",
        icon: "📝",
      },
      {
        name: "Modules",
        shortName: "Modules",
        href: "/dashboard/superadmin/modules",
        icon: "🧩",
      },
      {
        name: "Conflits",
        shortName: "Conflits",
        href: "/dashboard/superadmin/conflicts",
        icon: "⚠️",
      },
    ],
  };

  return roleNav[role] || [];
}
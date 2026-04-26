"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../../src/stores/authStore";
import { networkMonitor } from "../../src/services/network/monitor";
import { NotificationBell } from "../../src/components/NotificationBell";
import { ChatWidget } from "../../src/components/ChatWidget";
import { LanguageSwitcher } from "../../src/components/LanguageSwitcher";
import { useTranslation } from "../../src/contexts/I18nContext";
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
  const { t } = useTranslation();
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
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
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
          📴 {t('network.offline')}
        </div>
      )}
      {networkStatus === "unstable" && (
        <div className="sticky top-0 z-50 bg-orange-500 text-white text-center py-2 text-sm">
          ⚠️ {t('network.unstable')}
        </div>
      )}
      {networkStatus === "reconnecting" && (
        <div className="sticky top-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm">
          🔄 {t('network.reconnecting')}
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg hidden lg:block">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-indigo-600">🛡️ GuardTrack</h1>
            <p className="text-xs text-gray-500 mt-1">{user.role}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item, idx) => {
              const prevGroup = navigation[idx - 1]?.group;
              const showHeader = item.group && item.group !== prevGroup;
              return (
                <div key={item.href}>
                  {showHeader && (
                    <div className="pt-3 pb-1 px-3">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {item.group}
                      </p>
                      <hr className="mt-1 border-gray-100" />
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.tKey ? t(item.tKey) : item.name}
                  </Link>
                </div>
              );
            })}
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
              🚪 {t('common.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <main
        className={`lg:ml-64 p-4 lg:p-8 pb-25 lg:pb-8 ${networkStatus !== "online" && networkStatus !== undefined ? "pt-12" : ""}`}
      >
        {/* Barre mobile avec notifications */}
        <div className="lg:hidden mb-4 flex items-center justify-between bg-white p-4 rounded-lg shadow">
          <h1 className="text-xl font-bold text-indigo-600">🛡️ GuardTrack</h1>
          <div className="flex items-center space-x-3">
            <LanguageSwitcher />
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
          <LanguageSwitcher variant="full" />
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
              <span className="mt-1">{item.shortName || (item.tKey ? t(item.tKey) : item.name)}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ✅ Widget de chat - AJOUTÉ ICI */}
      <ChatWidget />
    </div>
  );
}

function getNavigationByRole(role: string) {
  const roleNav: Record<string, any[]> = {
    AGENT: [
      { name: "Tableau de bord", tKey: "nav.dashboard", shortName: "Accueil", href: "/dashboard/agent",          icon: "📍" },
      { name: "Mes rondes",      tKey: "nav.myRounds",  shortName: "Rondes",  href: "/dashboard/agent/rounds",   icon: "🔄" },
      { name: "Incidents",       tKey: "nav.incidents", shortName: "Incidents",href: "/dashboard/agent/incidents",icon: "⚠️" },
      { name: "Mon planning",    tKey: "nav.mySchedule",shortName: "Planning", href: "/dashboard/agent/schedule", icon: "📅" },
    ],
    CONTROLEUR: [
      { name: "Tableau de bord", tKey: "nav.dashboard",  shortName: "Accueil",  href: "/dashboard/controleur",             icon: "📊" },
      { name: "Validation",      tKey: "nav.validation", shortName: "Valider",  href: "/dashboard/controleur/validation",   icon: "✅" },
      { name: "Rondes",          tKey: "nav.rounds",     shortName: "Rondes",   href: "/dashboard/controleur/rounds",       icon: "🔄" },
      { name: "Incidents",       tKey: "nav.incidents",  shortName: "Incidents",href: "/dashboard/controleur/incidents",    icon: "⚠️" },
      { name: "Agents",          tKey: "nav.agents",     shortName: "Agents",   href: "/dashboard/controleur/agents",       icon: "👥" },
      { name: "Rapports",        tKey: "nav.reports",    shortName: "Rapports", href: "/dashboard/controleur/reports",      icon: "📈" },
      { name: "Planning",        tKey: "nav.planning",   shortName: "Planning", href: "/dashboard/controleur/planning",     icon: "📅" },
    ],
    SUPERVISEUR: [
      { name: "Tableau de bord", tKey: "nav.dashboard",   shortName: "Accueil", href: "/dashboard/superviseur",             icon: "📊" },
      { name: "Sites",           tKey: "nav.sites",       shortName: "Sites",   href: "/dashboard/superviseur/sites",       icon: "🏢" },
      { name: "Affectations",    tKey: "nav.assignments", shortName: "Affect.", href: "/dashboard/superviseur/assignments", icon: "📋" },
      { name: "Rapports",        tKey: "nav.reports",     shortName: "Rapports",href: "/dashboard/superviseur/reports",     icon: "📈" },
      { name: "Litiges",         tKey: "nav.disputes",    shortName: "Litiges", href: "/dashboard/superviseur/disputes",    icon: "⚖️" },
    ],
    ADMIN: [
      { name: "Tableau de bord", tKey: "nav.dashboard", shortName: "Accueil", href: "/dashboard/admin",          icon: "⚙️" },
      { name: "Utilisateurs",    tKey: "nav.users",     shortName: "Users",   href: "/dashboard/admin/users",    icon: "👤" },
      { name: "Clients",         tKey: "nav.clients",   shortName: "Clients", href: "/dashboard/admin/clients",  icon: "🏛️" },
      { name: "Finance",         tKey: "nav.finance",   shortName: "Finance", href: "/dashboard/admin/finance",  icon: "💰" },
      { name: "Paramètres",      tKey: "nav.settings",  shortName: "Params",  href: "/dashboard/admin/settings", icon: "🔧" },
      { name: "Conflits",        tKey: "nav.conflicts", shortName: "Conflits",href: "/dashboard/admin/conflicts",icon: "⚠️" },
      { name: "Sites",           tKey: "nav.sites",       shortName: "Sites",   href: "/dashboard/superviseur/sites",       icon: "🏢", group: "Supervision" },
      { name: "Affectations",    tKey: "nav.assignments", shortName: "Affect.", href: "/dashboard/superviseur/assignments", icon: "📋", group: "Supervision" },
      { name: "Rapports",        tKey: "nav.reports",     shortName: "Rapports",href: "/dashboard/superviseur/reports",     icon: "📈", group: "Supervision" },
      { name: "Litiges",         tKey: "nav.disputes",    shortName: "Litiges", href: "/dashboard/superviseur/disputes",    icon: "⚖️", group: "Supervision" },
    ],
    SUPERADMIN: [
      { name: "Tableau de bord", tKey: "nav.dashboard", shortName: "Accueil", href: "/dashboard/superadmin",        icon: "👑" },
      { name: "Système",         tKey: "nav.system",    shortName: "Système", href: "/dashboard/superadmin/system", icon: "🖥️" },
      { name: "Audit",           tKey: "nav.audit",     shortName: "Audit",   href: "/dashboard/superadmin/audit",  icon: "📝" },
      { name: "Modules",         tKey: "nav.modules",   shortName: "Modules", href: "/dashboard/superadmin/modules",icon: "🧩" },
      { name: "Tableau de bord Admin", tKey: "nav.dashboard", shortName: "Admin",   href: "/dashboard/admin",          icon: "⚙️", group: "Administration" },
      { name: "Utilisateurs",          tKey: "nav.users",     shortName: "Users",   href: "/dashboard/admin/users",    icon: "👤", group: "Administration" },
      { name: "Clients",               tKey: "nav.clients",   shortName: "Clients", href: "/dashboard/admin/clients",  icon: "🏛️", group: "Administration" },
      { name: "Finance",               tKey: "nav.finance",   shortName: "Finance", href: "/dashboard/admin/finance",  icon: "💰", group: "Administration" },
      { name: "Paramètres",            tKey: "nav.settings",  shortName: "Params",  href: "/dashboard/admin/settings", icon: "🔧", group: "Administration" },
      { name: "Conflits",              tKey: "nav.conflicts", shortName: "Conflits",href: "/dashboard/admin/conflicts",icon: "⚠️", group: "Administration" },
      { name: "Sites",        tKey: "nav.sites",       shortName: "Sites",   href: "/dashboard/superviseur/sites",       icon: "🏢", group: "Supervision" },
      { name: "Affectations", tKey: "nav.assignments", shortName: "Affect.", href: "/dashboard/superviseur/assignments", icon: "📋", group: "Supervision" },
      { name: "Rapports",     tKey: "nav.reports",     shortName: "Rapports",href: "/dashboard/superviseur/reports",     icon: "📈", group: "Supervision" },
      { name: "Litiges",      tKey: "nav.disputes",    shortName: "Litiges", href: "/dashboard/superviseur/disputes",    icon: "⚖️", group: "Supervision" },
    ],
  };

  return roleNav[role] || [];
}
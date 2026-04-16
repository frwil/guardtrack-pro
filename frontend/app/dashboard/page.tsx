'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../src/stores/authStore';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (!user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser, router]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              🛡️ GuardTrack Pro
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.fullName} ({user.role})
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Carte Profil */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 Profil</h2>
            <div className="space-y-2">
              <p className="text-sm"><span className="font-medium text-gray-700">Email:</span> {user.email}</p>
              <p className="text-sm"><span className="font-medium text-gray-700">Rôle:</span> {user.role}</p>
              <p className="text-sm"><span className="font-medium text-gray-700">Niveau:</span> {user.roleLevel}/5</p>
              <p className="text-sm"><span className="font-medium text-gray-700">Téléphone:</span> {user.phone || 'Non renseigné'}</p>
            </div>
          </div>

          {/* Carte Permissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🔐 Permissions</h2>
            <ul className="space-y-2">
              {Object.entries(user.permissions).map(([key, value]) => (
                <li key={key} className="flex items-center text-sm">
                  <span className={`w-2 h-2 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-700">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Carte Statistiques */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Statistiques</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium text-gray-700">Notifications non lues:</span>{' '}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {user.unreadNotifications}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Dernière connexion:</span>{' '}
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('fr-FR') : 'Jamais'}
              </p>
              <p className="text-sm">
                <span className="font-medium text-gray-700">Compte créé le:</span>{' '}
                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        {/* Message de bienvenue */}
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-2">
            Bienvenue sur GuardTrack Pro, {user.firstName || user.fullName} !
          </h3>
          <p className="text-indigo-100">
            {user.role === 'SUPERADMIN' && 'Vous avez un accès complet au système.'}
            {user.role === 'ADMIN' && 'Vous pouvez gérer les utilisateurs et les configurations.'}
            {user.role === 'SUPERVISEUR' && 'Vous supervisez les opérations terrain.'}
            {user.role === 'CONTROLEUR' && 'Vous validez les présences et les rondes.'}
            {user.role === 'AGENT' && 'Vous pouvez pointer vos présences et effectuer vos rondes.'}
          </p>
        </div>
      </main>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { usersService } from "../../../../src/services/api/users";
import { User } from "../../../../src/types";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faUserPlus,
  faEdit,
  faTrash,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await usersService.list();
      setUsers(data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((u) => u.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (id: number) => {
    if (!navigator.onLine) { alert('📵 Action impossible hors ligne.'); return; }
    const result = await usersService.toggleActive(id);
    if (result) loadUsers();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!navigator.onLine) { alert('📵 Action impossible hors ligne.'); return; }
    if (confirm(`Supprimer l'utilisateur ${name} ?`)) {
      const result = await usersService.delete(id);
      if (result) loadUsers();
    }
  };

  const roles = [
    "SUPERADMIN",
    "ADMIN",
    "SUPERVISEUR",
    "CONTROLEUR",
    "AGENT",
    "GUEST",
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
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
              Gestion des utilisateurs
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredUsers.length} utilisateur(s)
            </p>
          </div>
          <Link
            href="/dashboard/admin/users/create"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
            Nouvel utilisateur
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rechercher
            </label>
            <input
              type="text"
              placeholder="Nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tous les rôles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rôle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Téléphone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière connexion
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.fullName}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "SUPERADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : user.role === "ADMIN"
                          ? "bg-blue-100 text-blue-800"
                          : user.role === "SUPERVISEUR"
                            ? "bg-green-100 text-green-800"
                            : user.role === "CONTROLEUR"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.phone || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(user.id)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {user.isActive ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("fr-FR")
                    : "Jamais"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/dashboard/admin/users/${user.id}`}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </Link>
                  <button
                    onClick={() => handleDelete(user.id, user.fullName)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Aucun utilisateur trouvé
          </div>
        )}
      </div>
    </div>
  );
}

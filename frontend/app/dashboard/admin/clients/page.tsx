// app/dashboard/admin/clients/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { clientsService, Client } from '../../../../src/services/api/clients';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { apiClient } from '../../../../src/services/api/client';
import {
  faPlus,
  faSearch,
  faFilter,
  faSpinner,
  faRotate,
  faEye,
  faEdit,
  faTrash,
  faBuilding,
  faEnvelope,
  faPhone,
  faToggleOn,
  faToggleOff,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  totalSites: number;
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    active: 0,
    inactive: 0,
    totalSites: 0,
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm, statusFilter]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const data = await clientsService.list();
      setClients(data);
      
      // Calculer les statistiques
      const sitesCount = data.reduce((acc, client) => acc + (client.sitesCount || 0), 0);
      
      setStats({
        total: data.length,
        active: data.filter(c => c.isActive).length,
        inactive: data.filter(c => !c.isActive).length,
        totalSites: sitesCount,
      });
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.siret?.includes(searchTerm)
      );
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => !c.isActive);
    }

    setFilteredClients(filtered);
  };

  const handleToggleActive = async (client: Client) => {
    setIsProcessing(true);
    try {
      await clientsService.toggleActive(client.id);
      await loadClients();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification du statut');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsProcessing(true);
    try {
      await apiClient.delete(`/clients/${selectedClient.id}`);
      await loadClients();
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la suppression du client');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faBuilding} className="mr-3 text-indigo-600" />
              Gestion des Clients
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadClients}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
            <Link
              href="/dashboard/admin/clients/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nouveau client
            </Link>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total clients</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Clients actifs</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Clients inactifs</p>
          <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total sites</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalSites}</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, SIRET..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Clients actifs</option>
              <option value="inactive">Clients inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des clients */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SIRET
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taux facturation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sites
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <FontAwesomeIcon icon={faBuilding} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <div className="flex items-center text-sm text-gray-500 space-x-3">
                            {client.email && (
                              <span className="flex items-center">
                                <FontAwesomeIcon icon={faEnvelope} className="mr-1 text-xs" />
                                {client.email}
                              </span>
                            )}
                            {client.phone && (
                              <span className="flex items-center">
                                <FontAwesomeIcon icon={faPhone} className="mr-1 text-xs" />
                                {client.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {client.siret || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.billingRate)}
                      </span>
                      <span className="text-xs text-gray-500"> /heure</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        <FontAwesomeIcon icon={faBuilding} className="mr-1 text-gray-400" />
                        {client.sitesCount || 0} site(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(client)}
                        disabled={isProcessing}
                        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${
                          client.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <FontAwesomeIcon 
                          icon={client.isActive ? faToggleOn : faToggleOff} 
                          className="mr-1" 
                        />
                        {client.isActive ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/dashboard/admin/clients/${client.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Voir"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Link>
                      <Link
                        href={`/dashboard/admin/clients/${client.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500 mr-3" />
              <h2 className="text-xl font-semibold">Confirmer la suppression</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer le client <strong>{selectedClient.name}</strong> ? 
              Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedClient(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isProcessing ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
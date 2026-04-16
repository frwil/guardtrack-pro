"use client";

import { useEffect, useState } from "react";
import { sitesService, Site } from "../../../../src/services/api/sites";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faPlus,
  faSearch,
  faFilter,
  faSpinner,
  faRotate,
  faEye,
  faEdit,
  faTrash,
  faToggleOn,
  faToggleOff,
  faMapPin,
  faUser,
  faQrcode,
  faChevronRight,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function SuperviseurSitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  useEffect(() => {
    filterSites();
  }, [sites, searchTerm, typeFilter, statusFilter]);

  const loadSites = async () => {
    setIsLoading(true);
    try {
      const data = await sitesService.list();
      setSites(data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSites = () => {
    let filtered = [...sites];

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((s) => s.isActive === isActive);
    }

    setFilteredSites(filtered);
  };

  const handleToggleActive = async (site: Site) => {
    setIsProcessing(true);
    try {
      await sitesService.toggleActive(site.id);
      await loadSites();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la modification");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSite) return;

    setIsProcessing(true);
    try {
      await sitesService.delete(selectedSite.id);
      await loadSites();
      setShowDeleteModal(false);
      setSelectedSite(null);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la suppression");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateQr = async (site: Site) => {
    setIsProcessing(true);
    try {
      const result = await sitesService.regenerateQr(site.id);
      if (result) {
        await loadSites();
        alert("✅ QR Code régénéré avec succès");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la régénération du QR code");
    } finally {
      setIsProcessing(false);
    }
  };

  const siteTypes = [...new Set(sites.map((s) => s.type))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          className="text-3xl text-indigo-600"
        />
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
              <FontAwesomeIcon
                icon={faBuilding}
                className="mr-3 text-indigo-600"
              />
              Gestion des sites
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredSites.length} site{filteredSites.length > 1 ? "s" : ""}{" "}
              trouvé{filteredSites.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadSites}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
            <Link
              href="/dashboard/superviseur/sites/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Nouveau site
            </Link>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher un site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon
              icon={faFilter}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les types</option>
              {siteTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon
              icon={faFilter}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total sites</p>
          <p className="text-2xl font-bold text-indigo-600">{sites.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Sites actifs</p>
          <p className="text-2xl font-bold text-green-600">
            {sites.filter((s) => s.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Types de sites</p>
          <p className="text-2xl font-bold text-blue-600">{siteTypes.length}</p>
        </div>
      </div>

      {/* Liste des sites */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Code
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
              {filteredSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Aucun site trouvé
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="text-indigo-600"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {site.name}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <FontAwesomeIcon
                              icon={faMapPin}
                              className="mr-1 text-gray-400 text-xs"
                            />
                            {site.address.substring(0, 40)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {site.client?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {site.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {site.qrCode ? (
                        <button
                          onClick={() => {
                            setSelectedSite(site);
                            setShowQrModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <FontAwesomeIcon icon={faQrcode} className="mr-1" />
                          Voir
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(site)}
                        disabled={isProcessing}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          site.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {site.isActive ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/dashboard/superviseur/sites/${site.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Voir"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Link>
                      <Link
                        href={`/dashboard/superviseur/sites/${site.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Link>
                      <button
                        onClick={() => handleRegenerateQr(site)}
                        className="text-green-600 hover:text-green-900"
                        title="Régénérer QR"
                      >
                        <FontAwesomeIcon icon={faQrcode} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSite(site);
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
      {showDeleteModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="text-3xl text-red-500 mr-3"
              />
              <h2 className="text-xl font-semibold">
                Confirmer la suppression
              </h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir supprimer le site{" "}
              <strong>{selectedSite.name}</strong> ? Cette action est
              irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSite(null);
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
                {isProcessing ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">
              QR Code - {selectedSite.name}
            </h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedSite.qrCode}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4 break-all">
              {selectedSite.qrCode}
            </p>
            <button
              onClick={() => {
                setShowQrModal(false);
                setSelectedSite(null);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

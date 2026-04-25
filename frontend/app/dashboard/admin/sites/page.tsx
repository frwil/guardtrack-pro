// app/dashboard/admin/sites/page.tsx
'use client';

import { useEffect, useState } from "react";
import { sitesService, Site, ArchiveCheckResult } from "../../../../src/services/api/sites";
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
  faArchive,
  faBoxArchive,
  faToggleOn,
  faToggleOff,
  faMapPin,
  faQrcode,
  faExclamationTriangle,
  faChartBar,
  faCheckCircle,
  faTimesCircle,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function AdminSitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [archivedFilter, setArchivedFilter] = useState<boolean>(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [archiveCheck, setArchiveCheck] = useState<ArchiveCheckResult | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveHistory, setArchiveHistory] = useState<any>(null);

  useEffect(() => {
    loadSites();
    loadStats();
  }, [archivedFilter]);

  useEffect(() => {
    filterSites();
  }, [sites, searchTerm, typeFilter, statusFilter, clientFilter]);

  const loadSites = async () => {
    setIsLoading(true);
    try {
      const data = await sitesService.list({ isArchived: archivedFilter });
      setSites(data);
      
      // Extraire les clients uniques
      const uniqueClients = Array.from(
        new Map(data.map(s => [s.client?.id, s.client])).values()
      ).filter(c => c) as { id: number; name: string }[];
      setClients(uniqueClients);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await sitesService.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erreur de chargement des stats:", error);
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

    if (clientFilter) {
      filtered = filtered.filter((s) => s.client?.id.toString() === clientFilter);
    }

    setFilteredSites(filtered);
  };

  const handleToggleActive = async (site: Site) => {
    setIsProcessing(true);
    try {
      await sitesService.toggleActive(site.id);
      await loadSites();
      await loadStats();
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la modification");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchiveClick = async (site: Site) => {
    setSelectedSite(site);
    setIsProcessing(true);
    try {
      const check = await sitesService.canArchive(site.id);
      setArchiveCheck(check);
      setArchiveReason("");
      setShowArchiveModal(true);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la vérification");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedSite) return;

    setIsProcessing(true);
    try {
      await sitesService.archive(selectedSite.id, archiveReason || undefined);
      await loadSites();
      await loadStats();
      setShowArchiveModal(false);
      setSelectedSite(null);
      setArchiveReason("");
      setArchiveCheck(null);
      alert(`✅ Site "${selectedSite.name}" archivé avec succès`);
    } catch (error: any) {
      console.error("Erreur:", error);
      alert(error.message || "Erreur lors de l'archivage");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreClick = (site: Site) => {
    setSelectedSite(site);
    setShowRestoreModal(true);
  };

  const handleRestore = async () => {
    if (!selectedSite) return;

    setIsProcessing(true);
    try {
      await sitesService.restore(selectedSite.id);
      await loadSites();
      await loadStats();
      setShowRestoreModal(false);
      setSelectedSite(null);
      alert(`✅ Site "${selectedSite.name}" restauré avec succès`);
    } catch (error: any) {
      console.error("Erreur:", error);
      alert(error.message || "Erreur lors de la restauration");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHistoryClick = async (site: Site) => {
    setSelectedSite(site);
    setIsProcessing(true);
    try {
      const history = await sitesService.getArchiveHistory(site.id);
      setArchiveHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du chargement de l'historique");
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const siteTypes = [...new Set(sites.map((s) => s.type))];

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
              Gestion des Sites (Admin)
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredSites.length} site{filteredSites.length > 1 ? "s" : ""} trouvé{filteredSites.length > 1 ? "s" : ""}
              {archivedFilter && " (archivés)"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setArchivedFilter(!archivedFilter)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                archivedFilter 
                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faBoxArchive} className="mr-2" />
              {archivedFilter ? 'Voir sites actifs' : 'Voir archives'}
            </button>
            <button
              onClick={() => { loadSites(); loadStats(); }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
            {!archivedFilter && (
              <Link
                href="/dashboard/admin/sites/create"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Nouveau site
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques Admin */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total sites</p>
            <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Sites actifs</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Sites inactifs</p>
            <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Sites archivés</p>
            <p className="text-2xl font-bold text-orange-600">{stats.archived || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Types de sites</p>
            <p className="text-2xl font-bold text-blue-600">{Object.keys(stats.byType || {}).length}</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les types</option>
              {siteTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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

          <div className="relative">
            <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Liste des sites */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Aucun site trouvé
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <tr key={site.id} className={`hover:bg-gray-50 ${site.isArchived ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          site.isArchived ? 'bg-orange-100' : 'bg-indigo-100'
                        }`}>
                          <FontAwesomeIcon 
                            icon={site.isArchived ? faBoxArchive : faBuilding} 
                            className={site.isArchived ? 'text-orange-600' : 'text-indigo-600'} 
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{site.name}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <FontAwesomeIcon icon={faMapPin} className="mr-1 text-gray-400 text-xs" />
                            {site.address.substring(0, 40)}...
                          </p>
                          {site.isArchived && site.archivedAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              Archivé le {formatDate(site.archivedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {typeof site.client === 'string' ? site.client : site.client?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {site.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {site.qrCode ? (
                        <button
                          onClick={() => { setSelectedSite(site); setShowQrModal(true); }}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          <FontAwesomeIcon icon={faQrcode} className="mr-1" /> Voir
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!site.isArchived ? (
                        <button
                          onClick={() => handleToggleActive(site)}
                          disabled={isProcessing}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            site.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {site.isActive ? "Actif" : "Inactif"}
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                          Archivé
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {!site.isArchived ? (
                        <>
                          <Link href={`/dashboard/admin/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-900" title="Voir">
                            <FontAwesomeIcon icon={faEye} />
                          </Link>
                          <Link href={`/dashboard/admin/sites/${site.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Modifier">
                            <FontAwesomeIcon icon={faEdit} />
                          </Link>
                          <button onClick={() => handleRegenerateQr(site)} className="text-green-600 hover:text-green-900" title="Régénérer QR">
                            <FontAwesomeIcon icon={faQrcode} />
                          </button>
                          <button
                            onClick={() => handleArchiveClick(site)}
                            className="text-orange-600 hover:text-orange-900" title="Archiver"
                          >
                            <FontAwesomeIcon icon={faArchive} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleHistoryClick(site)}
                            className="text-blue-600 hover:text-blue-900" title="Historique"
                          >
                            <FontAwesomeIcon icon={faHistory} />
                          </button>
                          <button
                            onClick={() => handleRestoreClick(site)}
                            className="text-green-600 hover:text-green-900" title="Restaurer"
                          >
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal d'archivage */}
      {showArchiveModal && selectedSite && archiveCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faArchive} className="text-3xl text-orange-500 mr-3" />
              <h2 className="text-xl font-semibold">Archiver le site</h2>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                Vous êtes sur le point d'archiver le site <strong>{selectedSite.name}</strong>.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800 font-medium mb-2">Données qui seront conservées :</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {archiveCheck.stats.totalPresences || 0} pointages historiques</li>
                  <li>• {archiveCheck.stats.totalAssignments || 0} affectations passées</li>
                  <li>• {archiveCheck.stats.totalRounds || 0} rondes effectuées</li>
                  <li>• {archiveCheck.stats.totalIncidents || 0} incidents signalés</li>
                </ul>
              </div>
              
              {archiveCheck.stats.activeAssignments > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                    Attention : {archiveCheck.stats.activeAssignments} affectation(s) active(s) seront automatiquement terminées.
                  </p>
                </div>
              )}
              
              {!archiveCheck.canArchive && archiveCheck.reasons.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-red-800 font-medium">Impossible d'archiver :</p>
                  <ul className="text-sm text-red-700">
                    {archiveCheck.reasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison de l'archivage (optionnel)
              </label>
              <textarea
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Ex: Site fermé, Contrat terminé..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowArchiveModal(false);
                  setSelectedSite(null);
                  setArchiveReason("");
                  setArchiveCheck(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleArchive}
                disabled={isProcessing || !archiveCheck.canArchive}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {isProcessing ? 'Archivage...' : 'Confirmer l\'archivage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de restauration */}
      {showRestoreModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-500 mr-3" />
              <h2 className="text-xl font-semibold">Restaurer le site</h2>
            </div>
            <p className="text-gray-700 mb-6">
              Êtes-vous sûr de vouloir restaurer le site <strong>{selectedSite.name}</strong> ?<br />
              <span className="text-sm text-gray-500">Le site sera de nouveau actif et disponible.</span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setShowRestoreModal(false); setSelectedSite(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleRestore}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Restauration...' : 'Restaurer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && selectedSite && archiveHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FontAwesomeIcon icon={faHistory} className="text-3xl text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Historique d'archivage</h2>
            </div>
            <div className="space-y-3 mb-4">
              <p><strong>Site :</strong> {selectedSite.name}</p>
              <p><strong>Archivé le :</strong> {formatDate(archiveHistory.archivedAt)}</p>
              <p><strong>Archivé par :</strong> {archiveHistory.archivedBy?.name || 'N/A'}</p>
              {archiveHistory.reason && (
                <p><strong>Raison :</strong> {archiveHistory.reason}</p>
              )}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium mb-2">Données conservées :</p>
                <ul className="text-sm space-y-1">
                  <li>• {archiveHistory.stats.totalPresences} pointages</li>
                  <li>• {archiveHistory.stats.totalAssignments} affectations</li>
                  <li>• {archiveHistory.stats.totalRounds} rondes</li>
                  <li>• {archiveHistory.stats.totalIncidents} incidents</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowHistoryModal(false); setSelectedSite(null); setArchiveHistory(null); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && selectedSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">QR Code - {selectedSite.name}</h2>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedSite.qrCode}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4 break-all">{selectedSite.qrCode}</p>
            <button
              onClick={() => { setShowQrModal(false); setSelectedSite(null); }}
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
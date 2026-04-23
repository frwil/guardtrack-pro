"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { roundsService } from "../../../../../src/services/api/rounds";
import { sitesService } from "../../../../../src/services/api/sites";
import { useChat } from "../../../../../src/hooks/useChat";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faMapLocationDot,
  faPlay,
  faSpinner,
  faCheckCircle,
  faClock,
  faLocationDot,
  faUser,
  faCalendar,
  faChevronRight,
  faCircleCheck,
  faCircle,
  faHourglassHalf,
  faPlus,
  faLock,
  faSearch,
  faTimes,
  faBan,
  faComment,
} from "@fortawesome/free-solid-svg-icons";

export default function ControllerRoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = parseInt(params.id as string);

  const [round, setRound] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isAddingSites, setIsAddingSites] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour l'ajout de sites
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [availableSites, setAvailableSites] = useState<any[]>([]);
  const [searchSite, setSearchSite] = useState("");
  const [filteredSites, setFilteredSites] = useState<any[]>([]);
  const [selectedSites, setSelectedSites] = useState<number[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);

  // ✅ Hook de chat
  const { getRoundConversation, setCurrentConversation } = useChat();

  useEffect(() => {
    loadRound();
  }, [roundId]);

  useEffect(() => {
    if (showSiteSelector) {
      loadAvailableSites();
    }
  }, [showSiteSelector]);

  useEffect(() => {
    filterSites();
  }, [searchSite, availableSites, round]);

  const loadRound = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roundsService.getById(roundId);
      setRound(data);
    } catch (error) {
      console.error("Erreur chargement ronde:", error);
      setError("Erreur lors du chargement de la ronde");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSites = async () => {
    setIsLoadingSites(true);
    try {
      const sites = await sitesService.list({ isActive: true });
      
      // Filtrer les sites qui ne sont pas déjà dans la ronde
      const existingSiteIds = round?.sites?.map((rs: any) => rs.site.id) || [];
      const available = sites.filter((site: any) => !existingSiteIds.includes(site.id));
      
      setAvailableSites(available);
      setFilteredSites(available);
    } catch (error) {
      console.error("Erreur chargement sites:", error);
    } finally {
      setIsLoadingSites(false);
    }
  };

  const filterSites = () => {
    let filtered = availableSites;
    
    if (searchSite.trim()) {
      filtered = filtered.filter((site: any) =>
        site.name.toLowerCase().includes(searchSite.toLowerCase()) ||
        site.address?.toLowerCase().includes(searchSite.toLowerCase()) ||
        site.client?.name?.toLowerCase().includes(searchSite.toLowerCase())
      );
    }
    
    setFilteredSites(filtered);
  };

  const handleStartRound = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await roundsService.startAsController(roundId);
      await loadRound();
    } catch (error: any) {
      console.error("Erreur démarrage ronde:", error);
      
      // ✅ Gestion de l'erreur de tournée non clôturée
      if (error?.response?.status === 403) {
        const data = error.response.data;
        if (data.unclosedRoundId) {
          setError(data.error);
          // Proposer de voir la tournée non clôturée
          if (confirm(`${data.error}\n\nVoulez-vous voir la tournée non clôturée ?`)) {
            router.push(`/dashboard/controleur/rounds/${data.unclosedRoundId}`);
          }
        } else {
          setError(data.error || "Erreur lors du démarrage de la ronde");
        }
      } else {
        setError("Erreur lors du démarrage de la ronde");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleCloseRound = async () => {
    if (!confirm("Clôturer cette tournée ? Vous ne pourrez plus ajouter de sites.")) {
      return;
    }
    
    setIsClosing(true);
    setError(null);
    try {
      await roundsService.closeRound(roundId);
      await loadRound();
    } catch (error: any) {
      console.error("Erreur clôture ronde:", error);
      
      if (error?.response?.status === 403) {
        const data = error.response.data;
        setError(data.error);
      } else {
        setError("Erreur lors de la clôture de la ronde");
      }
    } finally {
      setIsClosing(false);
    }
  };

  const handleAddSites = async () => {
    if (selectedSites.length === 0) {
      setShowSiteSelector(false);
      return;
    }
    
    setIsAddingSites(true);
    setError(null);
    try {
      const result = await roundsService.addSites(roundId, selectedSites);
      setShowSiteSelector(false);
      setSelectedSites([]);
      setSearchSite("");
      await loadRound();
      alert(result?.message || "Sites ajoutés avec succès");
    } catch (error: any) {
      console.error("Erreur ajout sites:", error);
      
      if (error?.response?.status === 403) {
        setError(error.response.data.error);
      } else {
        setError("Erreur lors de l'ajout des sites");
      }
    } finally {
      setIsAddingSites(false);
    }
  };

  const toggleSiteSelection = (siteId: number) => {
    setSelectedSites(prev =>
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  // ✅ Ouvrir le chat de la ronde
  const openRoundChat = async () => {
    try {
      const conversation = await getRoundConversation(roundId);
      setCurrentConversation(conversation);
      // Le widget de chat s'ouvrira automatiquement ou peut être ouvert via un état global
    } catch (error) {
      console.error("Erreur ouverture chat:", error);
      setError("Erreur lors de l'ouverture du chat");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      PLANNED: { color: "bg-blue-100 text-blue-800", text: "Planifiée", icon: faCalendar },
      IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", text: "En cours", icon: faPlay },
      COMPLETED: { color: "bg-green-100 text-green-800", text: "Terminée", icon: faCheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800", text: "Annulée", icon: faBan },
    };
    return badges[status] || badges.PLANNED;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const canAddSites = round && !['COMPLETED', 'CANCELLED'].includes(round.status);
  const canCloseRound = round && round.status === 'IN_PROGRESS';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-4" />
          <p className="text-gray-600">Chargement de la ronde...</p>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ronde non trouvée</p>
      </div>
    );
  }

  const statusBadge = getStatusBadge(round.status);
  const progress = round.progress || 0;
  const visitedCount = round.visitedSitesCount || 0;
  const totalCount = round.sitesCount || 0;
  const validatedCount = round.validatedSitesCount || 0;

  return (
    <div className="space-y-6">
      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 flex items-center">
            <FontAwesomeIcon icon={faTimes} className="mr-2 cursor-pointer" onClick={() => setError(null)} />
            {error}
          </p>
        </div>
      )}

      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Retour
        </button>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/controleur/rounds/${roundId}/sites`}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <FontAwesomeIcon icon={faMapLocationDot} className="mr-2" />
            Afficher sur la carte
          </Link>
          
          {/* ✅ Bouton Chat de la ronde */}
          <button
            onClick={openRoundChat}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faComment} className="mr-2" />
            Chat
          </button>
          
          {/* ✅ Bouton Ajouter des sites */}
          {canAddSites && (
            <button
              onClick={() => setShowSiteSelector(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Ajouter des sites
            </button>
          )}
        </div>
      </div>

      {/* Informations de la ronde */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              {round.name}
              <span className={`ml-3 px-3 py-1 rounded-full text-sm ${statusBadge.color}`}>
                <FontAwesomeIcon icon={statusBadge.icon} className="mr-1" />
                {statusBadge.text}
              </span>
            </h1>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <FontAwesomeIcon icon={faUser} className="mr-2 w-4" />
                  Agent
                </p>
                <p className="font-medium">{round.agent?.fullName || "Non assigné"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 flex items-center">
                  <FontAwesomeIcon icon={faCalendar} className="mr-2 w-4" />
                  Début prévu
                </p>
                <p className="font-medium">
                  {new Date(round.scheduledStart).toLocaleString("fr-FR")}
                </p>
              </div>
              {round.scheduledEnd && (
                <div>
                  <p className="text-sm text-gray-500">Fin prévue</p>
                  <p className="font-medium">
                    {new Date(round.scheduledEnd).toLocaleString("fr-FR")}
                  </p>
                </div>
              )}
              {round.actualStart && (
                <div>
                  <p className="text-sm text-gray-500">Début réel</p>
                  <p className="font-medium">
                    {new Date(round.actualStart).toLocaleString("fr-FR")}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            {round.status === "PLANNED" && (
              <button
                onClick={handleStartRound}
                disabled={isStarting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isStarting ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : (
                  <FontAwesomeIcon icon={faPlay} className="mr-2" />
                )}
                Démarrer la ronde
              </button>
            )}
            
            {/* ✅ Bouton Clôturer */}
            {canCloseRound && (
              <button
                onClick={handleCloseRound}
                disabled={isClosing}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                {isClosing ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                ) : (
                  <FontAwesomeIcon icon={faLock} className="mr-2" />
                )}
                Clôturer la ronde
              </button>
            )}
          </div>
        </div>

        {/* Progression */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium">
              {visitedCount}/{totalCount} sites visités
              {validatedCount > 0 && ` (${validatedCount} validés)`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`${getProgressColor(progress)} h-3 rounded-full transition-all`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Liste des sites */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center">
            <FontAwesomeIcon icon={faLocationDot} className="mr-2 text-indigo-600" />
            Sites à visiter ({visitedCount}/{totalCount})
          </h2>
        </div>

        <div className="divide-y">
          {round.sites?.map((roundSite: any, index: number) => {
            const isVisited = !!roundSite.visitedAt;
            const isValidated = roundSite.isValidated;
            
            return (
              <div key={roundSite.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {isValidated ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
                        </div>
                      ) : isVisited ? (
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faHourglassHalf} className="text-yellow-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium text-gray-900">{roundSite.site.name}</p>
                      <p className="text-sm text-gray-500">{roundSite.site.address}</p>
                      {isVisited && (
                        <p className="text-xs text-gray-400 mt-1">
                          Visité le {new Date(roundSite.visitedAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                      {isValidated && (
                        <p className="text-xs text-green-600 mt-1 flex items-center">
                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                          Validé
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {!isVisited && round.status === "IN_PROGRESS" && (
                      <Link
                        href={`/dashboard/controleur/rounds/${roundId}/sites/${roundSite.site.id}/visit`}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center"
                      >
                        Visiter
                        <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                      </Link>
                    )}
                    {isVisited && !isValidated && (
                      <span className="text-sm text-yellow-600 flex items-center">
                        <FontAwesomeIcon icon={faClock} className="mr-1" />
                        En attente validation
                      </span>
                    )}
                    {isValidated && (
                      <span className="text-sm text-green-600">✓ Terminé</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {(!round.sites || round.sites.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            Aucun site dans cette ronde
          </div>
        )}
      </div>

      {/* Modal sélecteur de site */}
      {showSiteSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Ajouter des sites</h2>
                <button
                  onClick={() => {
                    setShowSiteSelector(false);
                    setSearchSite("");
                    setSelectedSites([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sélectionnez les sites à ajouter à cette ronde
              </p>
              <div className="mt-3 relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Rechercher un site..."
                  value={searchSite}
                  onChange={(e) => setSearchSite(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {isLoadingSites ? (
                <div className="text-center py-8">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-indigo-600" />
                </div>
              ) : filteredSites.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucun site disponible
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredSites.map((site: any) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => toggleSiteSelection(site.id)}
                      className={`w-full text-left p-4 border rounded-lg transition-all ${
                        selectedSites.includes(site.id)
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-indigo-500 hover:bg-indigo-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSites.includes(site.id)}
                          onChange={() => toggleSiteSelection(site.id)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{site.name}</p>
                          <p className="text-sm text-gray-500">{site.address}</p>
                          {site.client && (
                            <p className="text-xs text-gray-400 mt-1">
                              Client : {site.client.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-between">
              <button
                onClick={() => {
                  setShowSiteSelector(false);
                  setSearchSite("");
                  setSelectedSites([]);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleAddSites}
                disabled={isAddingSites || selectedSites.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isAddingSites ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Ajout...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Ajouter ({selectedSites.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
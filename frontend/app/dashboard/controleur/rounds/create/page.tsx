"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../../../../src/stores/authStore";
import { roundsService } from "../../../../../src/services/api/rounds";
import { sitesService } from "../../../../../src/services/api/sites";
import { assignmentsService } from "../../../../../src/services/api/assignments";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { serverTime } from "../../../../../src/services/time/serverTime";
import { offlineDB } from "../../../../../src/services/storage/db";
import { networkMonitor } from "../../../../../src/services/network/monitor";
import { syncManager } from "../../../../../src/services/sync/manager";
import {
  faArrowLeft,
  faSave,
  faSpinner,
  faPlus,
  faTrash,
  faMapPin,
  faUser,
  faCalendar,
  faChevronUp,
  faChevronDown,
  faSearch,
  faExclamationTriangle,
  faPlay,
  faClock,
  faInfoCircle,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

type CreationMode = "plan" | "start";

export default function CreateRoundPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ MODIFICATION : Ne stocker que les sites avec assignation active
  const [availableSites, setAvailableSites] = useState<any[]>([]);
  const [sitesWithoutAgent, setSitesWithoutAgent] = useState<any[]>([]);
  
  const [selectedSites, setSelectedSites] = useState<any[]>([]);
  const [showSiteSelector, setShowSiteSelector] = useState(false);
  const [searchSite, setSearchSite] = useState("");
  const [filteredSites, setFilteredSites] = useState<any[]>([]);
  const [creationMode, setCreationMode] = useState<CreationMode>("plan");

  const [formData, setFormData] = useState({
    name: "",
    scheduledStart: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSites();
  }, [searchSite, availableSites, selectedSites]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Récupérer tous les sites actifs
      const sitesList = await sitesService.list({ isActive: true });
      
      // 2. Récupérer les assignations actives
      const assignments = await assignmentsService.getActive();
      
      // 3. Créer un Set des IDs de sites qui ont une assignation active
      const sitesWithActiveAgent = new Set<number>();
      assignments.forEach((assignment: any) => {
        if (assignment.site?.id && assignment.agent) {
          sitesWithActiveAgent.add(assignment.site.id);
        }
      });

      // 4. Séparer les sites avec et sans agent
      const withAgent: any[] = [];
      const withoutAgent: any[] = [];

      sitesList.forEach((site: any) => {
        if (sitesWithActiveAgent.has(site.id)) {
          withAgent.push(site);
        } else {
          withoutAgent.push(site);
        }
      });

      setAvailableSites(withAgent);
      setSitesWithoutAgent(withoutAgent);
      setFilteredSites(withAgent);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSites = () => {
    let filtered = availableSites.filter(
      (site) => !selectedSites.find((s) => s.id === site.id),
    );

    if (searchSite.trim()) {
      filtered = filtered.filter(
        (site) =>
          site.name.toLowerCase().includes(searchSite.toLowerCase()) ||
          site.address.toLowerCase().includes(searchSite.toLowerCase()) ||
          site.client?.name?.toLowerCase().includes(searchSite.toLowerCase()),
      );
    }

    setFilteredSites(filtered);
  };

  const handleAddSite = (site: any) => {
    setSelectedSites((prev) => [...prev, site]);
    setShowSiteSelector(false);
    setSearchSite("");
  };

  const handleRemoveSite = (siteId: number) => {
    setSelectedSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const handleMoveSite = (index: number, direction: "up" | "down") => {
    const newSites = [...selectedSites];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newSites.length) return;

    [newSites[index], newSites[newIndex]] = [
      newSites[newIndex],
      newSites[index],
    ];
    setSelectedSites(newSites);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom de la ronde est requis";
    }
    if (!formData.scheduledStart) {
      newErrors.scheduledStart = "La date et heure de début sont requises";
    }
    if (selectedSites.length === 0) {
      newErrors.sites = "Veuillez sélectionner au moins un site";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent, mode: CreationMode) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (networkMonitor.isSyncAllowed()) {
        await serverTime.ensureSynced();
      }

      const roundData = {
        name: formData.name,
        scheduledStart: formData.scheduledStart,
        sites: selectedSites.map((site) => ({ id: site.id })),
      };

      const operationTime = {
        clientTime: new Date().toISOString(),
        clientTimestamp: Date.now(),
        serverTimeEstimated: serverTime.isSynced()
          ? serverTime.getServerISOString()
          : undefined,
        timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
      };

      if (networkMonitor.isSyncAllowed() && serverTime.isSynced()) {
        // Mode online
        const result = await roundsService.create(roundData);

        if (result) {
          if (mode === "start" && result.id) {
            await roundsService.startAsController(result.id);
          }
          router.push("/dashboard/controleur/rounds");
        }
      } else {
        // Mode offline
        const localId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await offlineDB.addToSyncQueue({
          type: "CREATE_ROUND",
          entity: "round",
          data: {
            ...roundData,
            localId,
            _operationTime: operationTime,
          },
          clientTime: operationTime.clientTime,
          clientTimestamp: operationTime.clientTimestamp,
          serverTimeEstimated: operationTime.serverTimeEstimated,
          timeOffset: operationTime.timeOffset,
          createdAt: new Date().toISOString(),
        });

        if (mode === "start") {
          await offlineDB.addToSyncQueue({
            type: "START_ROUND",
            entity: "round",
            data: {
              localId,
              _operationTime: operationTime,
            },
            clientTime: operationTime.clientTime,
            clientTimestamp: operationTime.clientTimestamp,
            serverTimeEstimated: operationTime.serverTimeEstimated,
            timeOffset: operationTime.timeOffset,
            createdAt: new Date().toISOString(),
          });
        }

        const message =
          mode === "start"
            ? "Ronde créée et sera démarrée localement. Elle sera synchronisée dès le retour de la connexion."
            : "Ronde créée localement. Elle sera synchronisée dès le retour de la connexion.";

        alert(message);
        router.push("/dashboard/controleur/rounds");
      }
    } catch (error) {
      console.error("Erreur de création:", error);
      setErrors({ submit: "Erreur lors de la création de la ronde" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Créer une nouvelle ronde
          </h1>
        </div>
        <p className="text-gray-600 mt-2 ml-10">
          L'agent est automatiquement déduit du site sélectionné
        </p>
      </div>

      {/* ✅ NOUVEAU : Message d'avertissement pour les sites sans agent */}
      {sitesWithoutAgent.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <FontAwesomeIcon
              icon={faInfoCircle}
              className="text-yellow-600 mr-3 mt-1"
            />
            <div>
              <p className="font-medium text-yellow-800 mb-1">
                {sitesWithoutAgent.length} site(s) sans agent assigné
              </p>
              <p className="text-sm text-yellow-700">
                Les sites suivants n'ont pas d'agent assigné actuellement et ne peuvent pas être inclus dans une ronde :
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {sitesWithoutAgent.slice(0, 5).map((site) => (
                  <li key={site.id}>{site.name}</li>
                ))}
                {sitesWithoutAgent.length > 5 && (
                  <li>et {sitesWithoutAgent.length - 5} autre(s)...</li>
                )}
              </ul>
              <p className="text-sm text-yellow-700 mt-3">
                <Link
                  href="/dashboard/superviseur/assignments/create"
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Créer une assignation →
                </Link>{" "}
                pour ces sites afin de pouvoir les utiliser dans une ronde.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODIFICATION : Message si aucun site disponible */}
      {availableSites.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-4xl text-orange-500 mb-3"
          />
          <p className="font-medium text-orange-800 mb-2">
            Aucun site avec agent assigné disponible
          </p>
          <p className="text-sm text-orange-700 mb-4">
            Vous devez d'abord créer des assignations d'agents sur des sites avant de pouvoir créer une ronde.
          </p>
          <Link
            href="/dashboard/superviseur/assignments/create"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Créer une assignation
          </Link>
        </div>
      )}

      {/* Choix du mode de création */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Mode de création
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setCreationMode("plan")}
            className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all ${
              creationMode === "plan"
                ? "border-indigo-500 bg-indigo-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FontAwesomeIcon
              icon={faCalendar}
              className={`text-3xl mb-2 ${
                creationMode === "plan" ? "text-indigo-600" : "text-gray-400"
              }`}
            />
            <span
              className={`font-medium ${
                creationMode === "plan" ? "text-indigo-700" : "text-gray-600"
              }`}
            >
              Planifier
            </span>
            <span className="text-xs text-gray-500 mt-1">
              La ronde sera créée sans être démarrée
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCreationMode("start")}
            className={`p-4 border-2 rounded-lg flex flex-col items-center transition-all ${
              creationMode === "start"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FontAwesomeIcon
              icon={faPlay}
              className={`text-3xl mb-2 ${
                creationMode === "start" ? "text-green-600" : "text-gray-400"
              }`}
            />
            <span
              className={`font-medium ${
                creationMode === "start" ? "text-green-700" : "text-gray-600"
              }`}
            >
              Démarrer maintenant
            </span>
            <span className="text-xs text-gray-500 mt-1">
              La ronde sera créée et démarrée immédiatement
            </span>
          </button>
        </div>
      </div>

      {/* Formulaire - désactivé si aucun site disponible */}
      <div className={`bg-white rounded-lg shadow p-6 ${availableSites.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
        <form
          onSubmit={(e) => handleSubmit(e, creationMode)}
          className="space-y-6"
        >
          {/* Nom de la ronde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Nom de la ronde *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Ronde matinale - Afriland"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Date de début */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faCalendar} className="mr-2" />
              Date et heure de début *
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) =>
                setFormData({ ...formData, scheduledStart: e.target.value })
              }
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.scheduledStart ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.scheduledStart && (
              <p className="text-red-600 text-sm mt-1">
                {errors.scheduledStart}
              </p>
            )}
          </div>

          {/* Sites à visiter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FontAwesomeIcon icon={faMapPin} className="mr-2" />
              Sites à visiter *
            </label>

            {selectedSites.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-500">
                  {selectedSites.length} site
                  {selectedSites.length > 1 ? "s" : ""} sélectionné
                  {selectedSites.length > 1 ? "s" : ""} (dans l'ordre de visite)
                </p>
                {selectedSites.map((site, index) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center flex-1">
                      <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-medium mr-3">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{site.name}</p>
                        <p className="text-sm text-gray-500">{site.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleMoveSite(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                      >
                        <FontAwesomeIcon icon={faChevronUp} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSite(index, "down")}
                        disabled={index === selectedSites.length - 1}
                        className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                      >
                        <FontAwesomeIcon icon={faChevronDown} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSite(site.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSiteSelector(true)}
              disabled={availableSites.length === 0}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-500"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Ajouter un site
            </button>

            {errors.sites && (
              <p className="text-red-600 text-sm mt-1">{errors.sites}</p>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableSites.length === 0}
              className={`px-6 py-3 text-white rounded-lg disabled:opacity-50 flex items-center ${
                creationMode === "start"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <FontAwesomeIcon
                    icon={creationMode === "start" ? faPlay : faSave}
                    className="mr-2"
                  />
                  {creationMode === "start"
                    ? "Créer et démarrer"
                    : "Créer la ronde"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal sélecteur de site */}
      {showSiteSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Sélectionner un site</h2>
                <button
                  onClick={() => {
                    setShowSiteSelector(false);
                    setSearchSite("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Seuls les sites avec un agent assigné sont affichés
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
              {filteredSites.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Aucun site disponible
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredSites.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => handleAddSite(site)}
                      className="w-full text-left p-4 border rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-gray-500">{site.address}</p>
                      {site.client && (
                        <p className="text-xs text-gray-400 mt-1">
                          Client : {site.client.name}
                        </p>
                      )}
                      <p className="text-xs mt-1 flex items-center text-green-600">
                        <FontAwesomeIcon icon={faUser} className="mr-1" />
                        Agent : {site.agent ? site.agent.name : "Aucun agent assigné"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => {
                  setShowSiteSelector(false);
                  setSearchSite("");
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { roundsService } from "../../../../../../src/services/api/rounds";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faList,
  faMap,
  faSpinner,
  faCheckCircle,
  faClock,
  faLocationDot,
  faChevronRight,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";

// Import dynamique de la carte pour éviter les erreurs SSR
const RoundSitesMap = dynamic(
  () => import("../../../../../../src/components/maps/RoundSitesMap"),
  { ssr: false, loading: () => (
    <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
    </div>
  )}
);

export default function ControllerRoundSitesPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = parseInt(params.id as string);

  const [round, setRound] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  useEffect(() => {
    loadRound();
  }, [roundId]);

  const loadRound = async () => {
    setIsLoading(true);
    try {
      const data = await roundsService.getById(roundId);
      setRound(data);
    } catch (error) {
      console.error("Erreur chargement ronde:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSiteStatus = (roundSite: any): "visited" | "pending" | "validated" => {
    if (roundSite.isValidated) return "validated";
    if (roundSite.visitedAt) return "visited";
    return "pending";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600 mb-4" />
          <p className="text-gray-600">Chargement des sites...</p>
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

  const sites = round.sites || [];
  const visitedCount = round.visitedSitesCount || 0;
  const totalCount = round.sitesCount || 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Retour à la ronde
          </button>
          <h1 className="text-xl font-semibold text-gray-900">
            Sites de la ronde : {round.name}
          </h1>
        </div>

        {/* Toggle vue */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("map")}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              viewMode === "map"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faMap} className="mr-2" />
            Carte
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-md flex items-center transition-colors ${
              viewMode === "list"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <FontAwesomeIcon icon={faList} className="mr-2" />
            Liste
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total sites</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Visités</p>
          <p className="text-2xl font-bold text-yellow-600">{visitedCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Validés</p>
          <p className="text-2xl font-bold text-green-600">{round.validatedSitesCount || 0}</p>
        </div>
      </div>

      {/* Contenu selon le mode */}
      {viewMode === "map" ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <RoundSitesMap
            sites={sites.map((rs: any) => ({
              id: rs.site.id,
              name: rs.site.name,
              address: rs.site.address,
              latitude: parseFloat(rs.site.latitude),
              longitude: parseFloat(rs.site.longitude),
              status: getSiteStatus(rs),
              visitedAt: rs.visitedAt,
              isValidated: rs.isValidated,
              roundSiteId: rs.id,
            }))}
            roundId={roundId}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {sites.map((roundSite: any, index: number) => {
            const isVisited = !!roundSite.visitedAt;
            const isValidated = roundSite.isValidated;
            
            return (
              <div key={roundSite.id} className="p-4 hover:bg-gray-50">
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
                          <span className="text-gray-600">{index + 1}</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium">{roundSite.site.name}</p>
                      <p className="text-sm text-gray-500">{roundSite.site.address}</p>
                      {isVisited && (
                        <p className="text-xs text-gray-400 mt-1">
                          Visité le {new Date(roundSite.visitedAt).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isVisited && round.status === "IN_PROGRESS" && (
                    <Link
                      href={`/dashboard/controleur/rounds/${roundId}/sites/${roundSite.site.id}/visit`}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center text-sm"
                    >
                      Visiter
                      <FontAwesomeIcon icon={faChevronRight} className="ml-2" />
                    </Link>
                  )}
                  {isVisited && !isValidated && (
                    <span className="text-yellow-600 text-sm flex items-center">
                      <FontAwesomeIcon icon={faClock} className="mr-1" />
                      En attente
                    </span>
                  )}
                  {isValidated && (
                    <span className="text-green-600 text-sm">✓ Validé</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { roundsService } from "../../../../../src/services/api/rounds";
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
} from "@fortawesome/free-solid-svg-icons";

export default function ControllerRoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = parseInt(params.id as string);

  const [round, setRound] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

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

  const handleStartRound = async () => {
    setIsStarting(true);
    try {
      await roundsService.startAsController(roundId);
      await loadRound();
    } catch (error) {
      console.error("Erreur démarrage ronde:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string; icon: any }> = {
      PLANNED: { color: "bg-blue-100 text-blue-800", text: "Planifiée", icon: faCalendar },
      IN_PROGRESS: { color: "bg-yellow-100 text-yellow-800", text: "En cours", icon: faPlay },
      COMPLETED: { color: "bg-green-100 text-green-800", text: "Terminée", icon: faCheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800", text: "Annulée", icon: faCircle },
    };
    return badges[status] || badges.PLANNED;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-blue-500";
  };

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
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Retour
        </button>
        <Link
          href={`/dashboard/controleur/rounds/${roundId}/sites`}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <FontAwesomeIcon icon={faMapLocationDot} className="mr-2" />
          Afficher sur la carte
        </Link>
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
        <div className="p-4 border-b">
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
    </div>
  );
}
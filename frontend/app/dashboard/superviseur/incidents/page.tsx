"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../../../src/stores/authStore";
import { apiClient } from "../../../../src/services/api/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faRotate,
  faFilter,
  faTimes,
  faCheckCircle,
  faClock,
  faCircle,
  faUser,
  faLocationDot,
  faCalendar,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

interface IncidentData {
  id: number;
  title: string;
  category: string;
  severity: string;
  status: string;
  reporter: { id: number; fullName: string };
  site: { id: number; name: string };
  reportedAt: string;
  assignedTo: { id: number; fullName: string } | null;
  hasPhotos: boolean;
  description?: string;
  resolution?: string;
  resolvedAt?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<string, any> = {
  OPEN: faCircle,
  IN_PROGRESS: faClock,
  RESOLVED: faCheckCircle,
  CLOSED: faTimes,
};

export default function IncidentsPage() {
  const { user } = useAuthStore();
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: string;
    severity?: string;
    category?: string;
  }>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentData | null>(null);

  useEffect(() => {
    loadCategories();
    loadIncidents();
  }, [filter]);

  const loadCategories = async () => {
    try {
      const res = await apiClient.get<{
        categories: string[];
        severities: string[];
      }>("/incidents/categories");
      if (res.data?.categories) setCategories(res.data.categories);
    } catch (error) {
      console.error("Erreur chargement catégories:", error);
    }
  };

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.severity) params.set("severity", filter.severity);
      if (filter.category) params.set("category", filter.category);

      const res = await apiClient.get<IncidentData[]>(
        `/incidents?${params}`
      );
      if (res.data) setIncidents(res.data);
    } catch (error) {
      console.error("Erreur chargement incidents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (incidentId: number, userId: number | null) => {
    try {
      await apiClient.patch(`/incidents/${incidentId}/assign`, { userId });
      loadIncidents();
    } catch (error) {
      console.error("Erreur assignation:", error);
    }
  };

  const handleResolve = async (incidentId: number, resolution: string) => {
    try {
      await apiClient.patch(`/incidents/${incidentId}/resolve`, { resolution });
      loadIncidents();
      setSelectedIncident(null);
    } catch (error) {
      console.error("Erreur résolution:", error);
    }
  };

  const handleClose = async (incidentId: number) => {
    try {
      await apiClient.patch(`/incidents/${incidentId}/close`, {});
      loadIncidents();
    } catch (error) {
      console.error("Erreur fermeture:", error);
    }
  };

  const handleEscalate = async (incidentId: number) => {
    try {
      await apiClient.patch(`/incidents/${incidentId}/escalate`, {});
      loadIncidents();
    } catch (error) {
      console.error("Erreur escalade:", error);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Chargement des incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon
                icon={faTriangleExclamation}
                className="mr-3 text-red-600"
              />
              Incidents
            </h1>
            <p className="text-gray-600 mt-1">
              {incidents.length} incident{incidents.length > 1 ? "s" : ""} trouvé
              {incidents.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {(filter.status || filter.severity || filter.category) && (
              <button
                onClick={() => setFilter({})}
                className="px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Réinitialiser filtres
              </button>
            )}
            <button
              onClick={loadIncidents}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
          <select
            value={filter.status || ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, status: e.target.value || undefined }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouvert</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="RESOLVED">Résolu</option>
            <option value="CLOSED">Fermé</option>
          </select>
          <select
            value={filter.severity || ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, severity: e.target.value || undefined }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Toutes les sévérités</option>
            <option value="LOW">Basse</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="HIGH">Haute</option>
            <option value="CRITICAL">Critique</option>
          </select>
          <select
            value={filter.category || ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, category: e.target.value || undefined }))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des incidents */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FontAwesomeIcon
              icon={faCheckCircle}
              className="text-5xl text-green-400 mb-4"
            />
            <p className="text-gray-500 text-lg">Aucun incident trouvé</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter.status || filter.severity || filter.category
                ? "Essayez de modifier les filtres"
                : "Tout est sous contrôle"}
            </p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className={`bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow ${
                incident.status === "OPEN" || incident.status === "IN_PROGRESS"
                  ? "border-l-4 border-red-500"
                  : "border-l-4 border-green-500"
              }`}
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {incident.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[incident.severity]}`}
                    >
                      {incident.severity}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[incident.status]}`}
                    >
                      <FontAwesomeIcon
                        icon={STATUS_ICONS[incident.status]}
                        className="mr-1"
                      />
                      {incident.status === "IN_PROGRESS"
                        ? "En cours"
                        : incident.status === "OPEN"
                        ? "Ouvert"
                        : incident.status === "RESOLVED"
                        ? "Résolu"
                        : "Fermé"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4 mt-2">
                    <span className="flex items-center">
                      <FontAwesomeIcon icon={faUser} className="mr-1" />
                      {incident.reporter.fullName}
                    </span>
                    <span className="flex items-center">
                      <FontAwesomeIcon icon={faLocationDot} className="mr-1" />
                      {incident.site.name}
                    </span>
                    <span className="flex items-center">
                      <FontAwesomeIcon icon={faCalendar} className="mr-1" />
                      {formatDate(incident.reportedAt)}
                    </span>
                    {incident.assignedTo && (
                      <span className="flex items-center text-indigo-600">
                        → Assigné à {incident.assignedTo.fullName}
                      </span>
                    )}
                    {incident.hasPhotos && (
                      <span className="text-gray-400">📷 Photos</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setSelectedIncident(
                        selectedIncident?.id === incident.id ? null : incident
                      )
                    }
                    className="px-3 py-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex items-center"
                  >
                    Détails
                    <FontAwesomeIcon icon={faArrowRight} className="ml-1" />
                  </button>
                </div>
              </div>

              {/* Détails expandés */}
              {selectedIncident?.id === incident.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 mb-3">
                    <strong>Description :</strong>{" "}
                    {incident.description || "Aucune description"}
                  </p>
                  {incident.resolution && (
                    <p className="text-gray-700 mb-3">
                      <strong>Résolution :</strong> {incident.resolution}
                    </p>
                  )}
                  {incident.resolvedAt && (
                    <p className="text-gray-500 text-sm mb-3">
                      Résolu le {formatDate(incident.resolvedAt)}
                    </p>
                  )}

                  {/* Actions */}
                  {(incident.status === "OPEN" ||
                    incident.status === "IN_PROGRESS") && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {user?.role === "SUPERVISEUR" && (
                        <>
                          <button
                            onClick={() =>
                              handleAssign(
                                incident.id,
                                incident.assignedTo ? null : user.id
                              )
                            }
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            {incident.assignedTo
                              ? "Désassigner"
                              : "M'assigner"}
                          </button>
                          <button
                            onClick={() =>
                              handleResolve(
                                incident.id,
                                "Résolu par le superviseur"
                              )
                            }
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                          >
                            Résoudre
                          </button>
                          <button
                            onClick={() => handleClose(incident.id)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          >
                            Fermer
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEscalate(incident.id)}
                        className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200"
                      >
                        Escalader
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
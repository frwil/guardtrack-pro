"use client";

import { useEffect, useState } from "react";
import {
  presencesService,
  Presence,
} from "../../../../src/services/api/presences";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faCheck,
  faTimes,
  faEye,
  faUser,
  faBuilding,
  faClock,
  faMapPin,
  faCamera,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Étendre l'interface Presence avec les champs spécifiques aux litiges
interface DisputedPresence extends Presence {
  agentDeclared: "PRESENT" | "ABSENT";
  controllerVerdict: "PRESENT" | "ABSENT" | null;
  controller: { id: number; fullName: string } | null;
  controllerComment?: string;
  photo?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  suspicionScore?: number;
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<DisputedPresence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputedPresence | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // ✅ Utiliser le service API avec la bonne URL
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presences/disputes`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // ✅ Vérifier le nom de la clé
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("Vous n'avez pas les droits pour accéder aux litiges.");
        } else {
          setError("Erreur lors du chargement des litiges.");
        }
        setDisputes([]);
        return;
      }
      
      const data = await response.json();
      console.log('📊 Litiges reçus:', data);
      setDisputes(data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
      setError("Erreur réseau lors du chargement des litiges.");
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (
    presenceId: number,
    resolution: "AGENT_WINS" | "CONTROLLER_WINS",
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/presences/${presenceId}/resolve-dispute`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ resolution, note: resolutionNote }),
        }
      );
      
      if (!response.ok) {
        throw new Error("Erreur lors de la résolution");
      }
      
      await loadDisputes();
      setSelectedDispute(null);
      setResolutionNote("");
    } catch (error) {
      console.error("Erreur de résolution:", error);
      setError("Erreur lors de la résolution du litige");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConflictDescription = (dispute: DisputedPresence) => {
    if (
      dispute.agentDeclared === "PRESENT" &&
      dispute.controllerVerdict === "ABSENT"
    ) {
      return "L'agent déclare être présent, mais le contrôleur ne l'a pas vu";
    }
    if (
      dispute.agentDeclared === "ABSENT" &&
      dispute.controllerVerdict === "PRESENT"
    ) {
      return "L'agent n'a pas pointé, mais le contrôleur l'a vu présent";
    }
    return "Conflit de déclaration";
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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="mr-3 text-orange-600"
          />
          Gestion des litiges
        </h1>
        <p className="text-gray-600 mt-1">
          {disputes.length} litige{disputes.length > 1 ? "s" : ""} en attente de
          résolution
        </p>
      </div>

      {/* ✅ Message d'erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </p>
        </div>
      )}

      {/* Liste des litiges */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {disputes.length === 0 ? (
            <div className="p-12 text-center">
              <FontAwesomeIcon
                icon={faCheck}
                className="text-4xl text-green-500 mb-3"
              />
              <p className="text-gray-500">
                {error ? "Impossible de charger les litiges" : "Aucun litige en attente"}
              </p>
            </div>
          ) : (
            disputes.map((dispute) => (
              <div key={dispute.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                        ⚠️ Litige
                      </span>
                      <span className="ml-3 text-sm text-gray-500">
                        {new Date(dispute.checkIn).toLocaleString("fr-FR")}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-3">
                      {getConflictDescription(dispute)}
                    </p>

                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <FontAwesomeIcon icon={faUser} className="mr-2" />
                          Déclaration agent
                        </p>
                        <p className="font-medium">
                          {dispute.agent.fullName} :{" "}
                          <span
                            className={
                              dispute.agentDeclared === "PRESENT"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {dispute.agentDeclared === "PRESENT"
                              ? "Présent"
                              : "Absent"}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 flex items-center">
                          <FontAwesomeIcon icon={faUser} className="mr-2" />
                          Constat contrôleur
                        </p>
                        <p className="font-medium">
                          {dispute.controller?.fullName || "N/A"} :{" "}
                          <span
                            className={
                              dispute.controllerVerdict === "PRESENT"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {dispute.controllerVerdict === "PRESENT"
                              ? "Présent"
                              : "Absent"}
                          </span>
                        </p>
                        {dispute.controllerComment && (
                          <p className="text-sm text-gray-500 mt-1 italic">
                            "{dispute.controllerComment}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <FontAwesomeIcon icon={faBuilding} className="mr-1" />
                        {dispute.site.name}
                      </span>
                      {dispute.suspicionScore && dispute.suspicionScore > 50 && (
                        <span className="flex items-center text-orange-600">
                          <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            className="mr-1"
                          />
                          Score suspicion: {dispute.suspicionScore}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-6">
                    <button
                      onClick={() => setSelectedDispute(dispute)}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                    >
                      <FontAwesomeIcon icon={faEye} className="mr-2" />
                      Examiner
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal d'examen */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Examiner le litige</h2>

              <div className="space-y-4">
                {/* Résumé du conflit */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="font-medium text-orange-800 mb-2">Conflit</p>
                  <p>{getConflictDescription(selectedDispute)}</p>
                </div>

                {/* Détails agent */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">
                    📋 Déclaration de l'agent
                  </h3>
                  <p>
                    <strong>Agent :</strong> {selectedDispute.agent.fullName}
                  </p>
                  <p>
                    <strong>Site :</strong> {selectedDispute.site.name}
                    {selectedDispute.site.address && ` - ${selectedDispute.site.address}`}
                  </p>
                  <p>
                    <strong>Heure :</strong>{" "}
                    {new Date(selectedDispute.checkIn).toLocaleString("fr-FR")}
                  </p>
                  <p>
                    <strong>Déclaration :</strong>{" "}
                    <span
                      className={
                        selectedDispute.agentDeclared === "PRESENT"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {selectedDispute.agentDeclared === "PRESENT"
                        ? "Présent"
                        : "Absent"}
                    </span>
                  </p>
                  {selectedDispute.gpsLatitude && selectedDispute.gpsLongitude && (
                    <p className="text-sm text-gray-500 mt-1">
                      📍 GPS : {parseFloat(selectedDispute.gpsLatitude).toFixed(6)},{" "}
                      {parseFloat(selectedDispute.gpsLongitude).toFixed(6)}
                    </p>
                  )}
                  {selectedDispute.photo && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-1">📸 Photo de l'agent :</p>
                      <img
                        src={selectedDispute.photo}
                        alt="Photo agent"
                        className="max-w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                
                {/* Détails contrôleur */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">🔍 Constat du contrôleur</h3>
                  <p>
                    <strong>Contrôleur :</strong>{" "}
                    {selectedDispute.controller?.fullName || "N/A"}
                  </p>
                  <p>
                    <strong>Verdict :</strong>{" "}
                    <span
                      className={
                        selectedDispute.controllerVerdict === "PRESENT"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {selectedDispute.controllerVerdict === "PRESENT"
                        ? "Présent"
                        : "Absent"}
                    </span>
                  </p>
                  {selectedDispute.controllerComment && (
                    <p>
                      <strong>Commentaire :</strong>{" "}
                      {selectedDispute.controllerComment}
                    </p>
                  )}
                </div>

                {/* Note de résolution */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Note de résolution (optionnel)
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Expliquez votre décision..."
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedDispute(null);
                    setResolutionNote("");
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={() =>
                    handleResolve(selectedDispute.id, "CONTROLLER_WINS")
                  }
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Donner raison au contrôleur
                </button>
                <button
                  onClick={() =>
                    handleResolve(selectedDispute.id, "AGENT_WINS")
                  }
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Donner raison à l'agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
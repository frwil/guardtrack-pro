"use client";

import { useEffect, useState } from "react";
import { syncManager } from "../../../../src/services/sync/manager";
import { conflictService } from "../../../../src/services/api/conflict";
import { OfflineOperation } from "../../../../src/services/storage/db";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faCheck,
  faTimes,
  faEye,
  faExclamationTriangle,
  faSync,
  faClock,
  faUser,
  faMapMarkerAlt,
  faClipboardList,
  faExclamationCircle,
  faChevronDown,
  faChevronUp,
  faServer,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";

interface ConflictStats {
  local: {
    pending: number;
    rejected: number;
  };
  server?: {
    total: number;
    pending: number;
    resolved: number;
  };
}

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<OfflineOperation[]>([]);
  const [rejected, setRejected] = useState<OfflineOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedOp, setSelectedOp] = useState<OfflineOperation | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState<ConflictStats>({
    local: { pending: 0, rejected: 0 },
  });
  const [activeTab, setActiveTab] = useState<"local" | "server">("local");

  useEffect(() => {
    loadConflicts();
    loadServerStats();
  }, []);

  const loadConflicts = async () => {
    setIsLoading(true);
    try {
      const [conflictOps, rejectedOps] = await Promise.all([
        syncManager.getConflictOperations(),
        syncManager.getRejectedOperations(),
      ]);
      setConflicts(conflictOps);
      setRejected(rejectedOps);
      setStats((prev) => ({
        ...prev,
        local: { pending: conflictOps.length, rejected: rejectedOps.length },
      }));
    } catch (error) {
      console.error("Erreur chargement conflits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServerStats = async () => {
    try {
      const serverStats = await conflictService.getStats();
      if (serverStats) {
        setStats((prev) => ({
          ...prev,
          server: {
            total: serverStats.total,
            pending: serverStats.pending,
            resolved: serverStats.resolved,
          },
        }));
      }
    } catch (error) {
      console.error("Erreur chargement stats serveur:", error);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncManager.forceSync();
      alert(
        `✅ Synchronisation terminée : ${result.syncedCount} succès, ${result.failedCount} échecs, ${result.conflictCount} conflits`,
      );
      await loadConflicts();
    } catch (error) {
      console.error("Erreur synchronisation:", error);
      alert("❌ Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async (id: number) => {
    await syncManager.approveOperation(
      id,
      approveNote || "Approuvé manuellement",
    );
    setApproveNote("");
    setSelectedOp(null);
    setExpandedId(null);
    await loadConflicts();
  };

  const handleReject = async (id: number) => {
    await syncManager.rejectOperation(
      id,
      rejectReason || "Rejeté par superviseur",
    );
    setRejectReason("");
    setSelectedOp(null);
    setExpandedId(null);
    await loadConflicts();
  };

  const handleSendToServer = async (op: OfflineOperation) => {
    if (!op.id) return;

    setIsSyncing(true);
    try {
      const conflictType = op.validationNote?.includes("temporelle")
        ? "TIME_DRIFT"
        : op.validationNote?.includes("fraude")
          ? "FRAUD_SUSPICION"
          : "VALIDATION_FAILED";

      // Créer un objet operation avec les bons types
      // - serverTimeEstimated: string | undefined (pas null)
      // - timeOffset: number | undefined (pas null)
      // - lastAttempt: string | null
      // - syncedAt: string | null
      // - validationNote: string | undefined
      const operationData = {
        id: op.id,
        type: op.type,
        entity: op.entity,
        data: op.data,
        clientTime: op.clientTime,
        clientTimestamp: op.clientTimestamp,
        serverTimeEstimated: op.serverTimeEstimated || undefined, // null → undefined
        timeOffset: op.timeOffset ?? undefined, // null → undefined
        createdAt: op.createdAt,
        attempts: op.attempts || 0,
        lastAttempt: op.lastAttempt || null, // garder null
        syncedAt: op.syncedAt || null, // garder null
        validationStatus: op.validationStatus || "PENDING",
        validationNote: op.validationNote || undefined, // null → undefined
      };

      await conflictService.report({
        operationId: op.id,
        operation: operationData,
        conflictType,
        reason: op.validationNote || "Conflit détecté",
        clientData: op.data,
        resolution: "PENDING",
      });

      alert("✅ Conflit envoyé au serveur pour analyse");
      await loadServerStats();
    } catch (error) {
      console.error("Erreur envoi conflit:", error);
      alert("❌ Erreur lors de l'envoi du conflit");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      presence: "Pointage",
      round: "Ronde",
      round_site: "Visite de site",
      incident: "Incident",
      assignment: "Affectation",
    };
    return labels[entity] || entity;
  };

  const getEntityIcon = (entity: string) => {
    const icons: Record<string, any> = {
      presence: faClock,
      round: faClipboardList,
      round_site: faMapMarkerAlt,
      incident: faExclamationCircle,
      assignment: faUser,
    };
    return icons[entity] || faDatabase;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      CREATE: "Création",
      CREATE_ROUND: "Création de ronde",
      START_ROUND: "Démarrage de ronde",
      VISIT_SITE: "Visite de site",
      UPDATE: "Mise à jour",
      DELETE: "Suppression",
    };
    return labels[type] || type;
  };

  const getConflictSeverity = (note?: string) => {
    if (!note)
      return {
        color: "text-orange-600",
        bg: "bg-orange-100",
        label: "Anomalie",
      };
    if (note.includes("fraude") || note.includes("Fraude")) {
      return {
        color: "text-red-600",
        bg: "bg-red-100",
        label: "Fraude suspectée",
      };
    }
    if (note.includes("futur")) {
      return { color: "text-purple-600", bg: "bg-purple-100", label: "Futur" };
    }
    if (note.includes("ancienne")) {
      return { color: "text-blue-600", bg: "bg-blue-100", label: "Ancienne" };
    }
    return { color: "text-orange-600", bg: "bg-orange-100", label: "Anomalie" };
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="mr-3 text-orange-600"
              />
              Conflits et Anomalies
            </h1>
            <p className="text-gray-600 mt-1">
              Examinez les opérations suspectes détectées par le système
            </p>
          </div>
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            <FontAwesomeIcon icon={faSync} spin={isSyncing} className="mr-2" />
            {isSyncing ? "Synchronisation..." : "Forcer la synchronisation"}
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-orange-600">Conflits locaux</p>
          <p className="text-3xl font-bold text-orange-700">
            {stats.local.pending}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600">Rejetés locaux</p>
          <p className="text-3xl font-bold text-red-700">
            {stats.local.rejected}
          </p>
        </div>
        {stats.server && (
          <>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600">Conflits serveur</p>
              <p className="text-3xl font-bold text-blue-700">
                {stats.server.total}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Résolus serveur</p>
              <p className="text-3xl font-bold text-green-700">
                {stats.server.resolved}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(["local", "server"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "local" && (
                  <>
                    <FontAwesomeIcon icon={faDatabase} className="mr-2" />
                    Conflits locaux ({conflicts.length})
                  </>
                )}
                {tab === "server" && (
                  <>
                    <FontAwesomeIcon icon={faServer} className="mr-2" />
                    Conflits serveur
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "local" && (
            <>
              {/* Liste des conflits */}
              <div className="mb-6">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="mr-2 text-orange-600"
                  />
                  Conflits à examiner ({conflicts.length})
                </h2>
                <div className="divide-y">
                  {conflicts.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">
                      Aucun conflit à examiner
                    </p>
                  ) : (
                    conflicts.map((op) => {
                      const severity = getConflictSeverity(op.validationNote);
                      const isExpanded = expandedId === op.id;

                      return (
                        <div key={op.id} className="py-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2 flex-wrap gap-2">
                                <span className="font-medium">
                                  {getTypeLabel(op.type)}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                  <FontAwesomeIcon
                                    icon={getEntityIcon(op.entity)}
                                    className="mr-1"
                                  />
                                  {getEntityLabel(op.entity)}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded text-xs ${severity.bg} ${severity.color}`}
                                >
                                  {severity.label}
                                </span>
                              </div>

                              <p className="text-sm text-gray-600 mb-2">
                                {op.validationNote}
                              </p>

                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                <p>
                                  Heure client: {formatDateTime(op.clientTime)}
                                </p>
                                {op.serverTimeEstimated && (
                                  <p>
                                    Heure serveur:{" "}
                                    {formatDateTime(op.serverTimeEstimated)}
                                  </p>
                                )}
                                <p>Créé le: {formatDateTime(op.createdAt)}</p>
                                <p>Tentatives: {op.attempts}/5</p>
                              </div>

                              {isExpanded && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm font-medium mb-2">
                                    Données de l'opération :
                                  </p>
                                  <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
                                    {JSON.stringify(op.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <div className="ml-4 flex flex-col items-end space-y-2">
                              <button
                                onClick={() =>
                                  setExpandedId(
                                    isExpanded ? null : op.id || null,
                                  )
                                }
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    isExpanded ? faChevronUp : faChevronDown
                                  }
                                />
                              </button>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleSendToServer(op)}
                                  disabled={isSyncing}
                                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                                  title="Envoyer au serveur pour analyse"
                                >
                                  <FontAwesomeIcon
                                    icon={faServer}
                                    className="mr-1"
                                  />
                                  Envoyer
                                </button>
                                <button
                                  onClick={() => setSelectedOp(op)}
                                  className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm"
                                >
                                  <FontAwesomeIcon
                                    icon={faEye}
                                    className="mr-1"
                                  />
                                  Examiner
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Liste des rejetés */}
              {rejected.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="mr-2 text-red-600"
                    />
                    Opérations rejetées ({rejected.length})
                  </h2>
                  <div className="divide-y">
                    {rejected.map((op) => (
                      <div key={op.id} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center mb-1">
                              <span className="font-medium">
                                {getTypeLabel(op.type)}
                              </span>
                              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                {getEntityLabel(op.entity)}
                              </span>
                              <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                Rejeté
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {op.validationNote}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(op.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "server" && (
            <div className="text-center py-12">
              <FontAwesomeIcon
                icon={faServer}
                className="text-4xl text-gray-400 mb-4"
              />
              <p className="text-gray-500">
                Les conflits envoyés au serveur sont consultables dans
                l'interface d'administration.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Utilisez le bouton "Envoyer" sur les conflits locaux pour les
                transmettre au serveur.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'examen */}
      {selectedOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Examiner l'opération</h2>

            <div className="space-y-3 mb-4">
              <p>
                <strong>Type:</strong> {getTypeLabel(selectedOp.type)} -{" "}
                {getEntityLabel(selectedOp.entity)}
              </p>
              <p>
                <strong>ID:</strong> {selectedOp.id}
              </p>
              <p>
                <strong>Anomalie:</strong> {selectedOp.validationNote}
              </p>
              <p>
                <strong>Heure client:</strong>{" "}
                {formatDateTime(selectedOp.clientTime)}
              </p>
              {selectedOp.serverTimeEstimated && (
                <p>
                  <strong>Heure serveur estimée:</strong>{" "}
                  {formatDateTime(selectedOp.serverTimeEstimated)}
                </p>
              )}
              {selectedOp.timeOffset && (
                <p>
                  <strong>Offset:</strong> {selectedOp.timeOffset}ms
                </p>
              )}
              <p>
                <strong>Créé le:</strong> {formatDateTime(selectedOp.createdAt)}
              </p>
              <p>
                <strong>Tentatives:</strong> {selectedOp.attempts}/5
              </p>
            </div>

            <div className="mb-4">
              <p className="font-medium mb-2">Données de l'opération :</p>
              <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto max-h-64">
                {JSON.stringify(selectedOp.data, null, 2)}
              </pre>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Note d'approbation (optionnel)
                </label>
                <input
                  type="text"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="Ex: Vérifié manuellement, décalage horaire normal"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Motif de rejet
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Fraude confirmée, manipulation de l'horloge"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedOp(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSendToServer(selectedOp)}
                disabled={isSyncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <FontAwesomeIcon icon={faServer} className="mr-2" />
                Envoyer au serveur
              </button>
              <button
                onClick={() => handleReject(selectedOp.id!)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2" />
                Rejeter
              </button>
              <button
                onClick={() => handleApprove(selectedOp.id!)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                Approuver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

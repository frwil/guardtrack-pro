// app/dashboard/superviseur/assignments/smart-switch/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { assignmentsService, AssignmentListItem } from "../../../../../src/services/api/assignments";
import { usersService } from "../../../../../src/services/api/users";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExchangeAlt,
  faUserPlus,
  faCheck,
  faTimes,
  faExclamationTriangle,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

// Interface qui correspond exactement à ce que retourne l'API
interface AgentWithAssignments {
  id: number;
  fullName: string;
  email: string;
  currentAssignments: AssignmentListItem[];
}

interface SwitchPlan {
  type: "swap" | "temporary";
  agent1: AgentWithAssignments | null;
  agent2: AgentWithAssignments | null;
  startDate: string;
  endDate: string;
  isPermanent: boolean;
  resolutionConflicts: ConflictResolution[];
}

interface ConflictResolution {
  assignmentId: number;
  action: "suspend" | "cancel" | "keep";
  reason: string;
}

export default function SmartSwitchPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [switchType, setSwitchType] = useState<"swap" | "temporary">("swap");
  const [agents, setAgents] = useState<AgentWithAssignments[]>([]);
  const [selectedAgent1, setSelectedAgent1] = useState<AgentWithAssignments | null>(null);
  const [selectedAgent2, setSelectedAgent2] = useState<AgentWithAssignments | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [switchPlan, setSwitchPlan] = useState<SwitchPlan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    loadAgentsWithAssignments();
  }, []);

  const loadAgentsWithAssignments = async () => {
    setIsLoading(true);
    try {
      const [agentsData, assignmentsData] = await Promise.all([
        usersService.getAgents(),
        assignmentsService.list(),
      ]);

      // Enrichir les agents avec leurs affectations actives
      // Utiliser le type AssignmentListItem directement
      const enrichedAgents = agentsData.map((agent: any) => ({
        ...agent,
        currentAssignments: assignmentsData.filter(
          (a: AssignmentListItem) =>
            a.agent.id === agent.id &&
            (a.status === "ACTIVE" || a.status === "PENDING"),
        ),
      }));

      setAgents(enrichedAgents);
    } catch (error) {
      console.error("Erreur de chargement:", error);
      alert("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSwitch = () => {
    if (!selectedAgent1 || !selectedAgent2 || !startDate) return null;

    const conflicts: ConflictResolution[] = [];

    // Analyser les conflits potentiels pour l'agent 1
    selectedAgent1.currentAssignments.forEach((assignment) => {
      if (isOverlapping(assignment, startDate, endDate, isPermanent)) {
        conflicts.push({
          assignmentId: assignment.id,
          action: "suspend",
          reason: `Conflit avec la période du switch`,
        });
      }
    });

    // Analyser les conflits potentiels pour l'agent 2
    selectedAgent2.currentAssignments.forEach((assignment) => {
      if (isOverlapping(assignment, startDate, endDate, isPermanent)) {
        conflicts.push({
          assignmentId: assignment.id,
          action: "suspend",
          reason: `Conflit avec la période du switch`,
        });
      }
    });

    return {
      type: switchType,
      agent1: selectedAgent1,
      agent2: selectedAgent2,
      startDate,
      endDate,
      isPermanent,
      resolutionConflicts: conflicts,
    };
  };

  const isOverlapping = (
    assignment: AssignmentListItem,
    start: string,
    end: string,
    permanent: boolean,
  ): boolean => {
    const switchStart = new Date(start);
    const switchEnd = permanent ? null : end ? new Date(end) : null;
    const assignStart = new Date(assignment.startDate);
    // Gérer le cas où endDate est null
    const assignEnd = assignment.endDate ? new Date(assignment.endDate) : null;

    if (switchEnd && assignEnd) {
      return switchStart <= assignEnd && switchEnd >= assignStart;
    } else if (!switchEnd && !assignEnd) {
      return true;
    } else if (!switchEnd && assignEnd) {
      return assignEnd >= switchStart;
    } else if (switchEnd && !assignEnd) {
      return switchEnd >= assignStart;
    }
    return false;
  };

  const generateSwitchPlan = () => {
    const plan = analyzeSwitch();
    setSwitchPlan(plan);
    setStep(3);
  };

  const executeSwitch = async () => {
    if (!switchPlan || !switchPlan.agent1 || !switchPlan.agent2) return;

    setIsExecuting(true);

    // Tableau pour suivre les actions effectuées
    const executionLog: string[] = [];

    try {
      // 1. Résoudre les conflits
      if (switchPlan.resolutionConflicts.length > 0) {
        executionLog.push(
          `Résolution de ${switchPlan.resolutionConflicts.length} conflit(s)...`,
        );

        for (const conflict of switchPlan.resolutionConflicts) {
          if (conflict.action === "suspend") {
            await assignmentsService.update(conflict.assignmentId, {
              status: "SUSPENDED",
            });
            executionLog.push(
              `✓ Affectation #${conflict.assignmentId} suspendue`,
            );
          }
        }
      }

      // 2. Préparer les nouvelles affectations
      const newAssignments = [];
      const site1 = switchPlan.agent2.currentAssignments[0]?.site;
      const site2 = switchPlan.agent1.currentAssignments[0]?.site;

      if (switchType === "swap") {
        if (!site1 || !site2) {
          throw new Error("Impossible de trouver les sites pour le swap");
        }

        newAssignments.push({
          agentId: switchPlan.agent1.id,
          siteId: site1.id,
          startDate: switchPlan.startDate,
          ...(switchPlan.isPermanent ? {} : { endDate: switchPlan.endDate }),
          status: "ACTIVE",
          notes: `🔄 Switch avec ${switchPlan.agent2.fullName}`,
        });

        newAssignments.push({
          agentId: switchPlan.agent2.id,
          siteId: site2.id,
          startDate: switchPlan.startDate,
          ...(switchPlan.isPermanent ? {} : { endDate: switchPlan.endDate }),
          status: "ACTIVE",
          notes: `🔄 Switch avec ${switchPlan.agent1.fullName}`,
        });

        executionLog.push(
          `✓ Préparation du swap entre ${switchPlan.agent1.fullName} et ${switchPlan.agent2.fullName}`,
        );
      } else {
        if (!site1) {
          throw new Error("Impossible de trouver le site pour le remplacement");
        }

        newAssignments.push({
          agentId: switchPlan.agent1.id,
          siteId: site1.id,
          startDate: switchPlan.startDate,
          ...(switchPlan.isPermanent ? {} : { endDate: switchPlan.endDate }),
          status: "ACTIVE",
          replacesId: switchPlan.agent2.id,
          notes: `🔁 Remplacement de ${switchPlan.agent2.fullName}`,
        });

        executionLog.push(
          `✓ Préparation du remplacement de ${switchPlan.agent2.fullName} par ${switchPlan.agent1.fullName}`,
        );
      }

      // 3. Créer les nouvelles affectations
      await Promise.all(
        newAssignments.map((a) => assignmentsService.create(a)),
      );
      executionLog.push(
        `✓ ${newAssignments.length} nouvelle(s) affectation(s) créée(s)`,
      );

      // 4. Afficher le résumé
      const summary = executionLog.join("\n");
      console.log("Résumé du switch:\n" + summary);

      alert(
        `✅ Switch effectué avec succès !\n\n${summary.replace(/✓/g, "•")}`,
      );
      router.push("/dashboard/superviseur/assignments");
    } catch (error: any) {
      console.error("Erreur lors du switch:", error);
      console.log("Log d'exécution:", executionLog);

      alert(
        `❌ Erreur lors du switch: ${error.message}\n\n` +
          `Les actions suivantes ont été effectuées:\n${executionLog.join("\n")}`,
      );
    } finally {
      setIsExecuting(false);
    }
  };
  
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon
              icon={faExchangeAlt}
              className="mr-3 text-indigo-600"
            />
            Switch Intelligent d'Agents
          </h1>
          <Link
            href="/dashboard/superviseur/assignments"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            Annuler
          </Link>
        </div>
      </div>

      {/* Étapes */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${step > s ? "bg-indigo-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Étape 1 : Type de switch */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Quel type d'opération souhaitez-vous effectuer ?
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSwitchType("swap");
                  setStep(2);
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
              >
                <FontAwesomeIcon
                  icon={faExchangeAlt}
                  className="text-4xl text-indigo-600 mb-3"
                />
                <h3 className="font-semibold text-gray-900 mb-2">
                  Interchangement (Swap)
                </h3>
                <p className="text-sm text-gray-600">
                  Échanger les sites de deux agents pour une période donnée
                </p>
              </button>

              <button
                onClick={() => {
                  setSwitchType("temporary");
                  setStep(2);
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
              >
                <FontAwesomeIcon
                  icon={faUserPlus}
                  className="text-4xl text-green-600 mb-3"
                />
                <h3 className="font-semibold text-gray-900 mb-2">
                  Remplacement Temporaire
                </h3>
                <p className="text-sm text-gray-600">
                  Un agent remplace un autre agent indisponible
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Étape 2 : Sélection des agents et période */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {switchType === "swap"
                ? "Sélectionnez les agents à interchanger"
                : "Sélectionnez l'agent remplaçant et l'agent à remplacer"}
            </h2>

            <div className="grid grid-cols-2 gap-6">
              {/* Agent 1 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {switchType === "swap" ? "Agent 1" : "Agent remplaçant"}
                </label>
                <select
                  value={selectedAgent1?.id || ""}
                  onChange={(e) => {
                    const agent = agents.find(
                      (a) => a.id === parseInt(e.target.value),
                    );
                    setSelectedAgent1(agent || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName} ({agent.currentAssignments.length}{" "}
                      affectation(s) active(s))
                    </option>
                  ))}
                </select>

                {selectedAgent1 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">
                      {selectedAgent1.fullName}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Affectations actuelles :
                    </p>
                    {selectedAgent1.currentAssignments.length > 0 ? (
                      selectedAgent1.currentAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="text-sm text-gray-700"
                        >
                          • {assignment.site.name}
                          {assignment.endDate &&
                            ` (jusqu'au ${formatDate(assignment.endDate)})`}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune affectation active</p>
                    )}
                  </div>
                )}
              </div>

              {/* Agent 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {switchType === "swap" ? "Agent 2" : "Agent à remplacer"}
                </label>
                <select
                  value={selectedAgent2?.id || ""}
                  onChange={(e) => {
                    const agent = agents.find(
                      (a) => a.id === parseInt(e.target.value),
                    );
                    setSelectedAgent2(agent || null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={!selectedAgent1}
                >
                  <option value="">Sélectionner un agent</option>
                  {agents
                    .filter((agent) => agent.id !== selectedAgent1?.id)
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.fullName} ({agent.currentAssignments.length}{" "}
                        affectation(s) active(s))
                      </option>
                    ))}
                </select>

                {selectedAgent2 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">
                      {selectedAgent2.fullName}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Affectations actuelles :
                    </p>
                    {selectedAgent2.currentAssignments.length > 0 ? (
                      selectedAgent2.currentAssignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="text-sm text-gray-700"
                        >
                          • {assignment.site.name}
                          {assignment.endDate &&
                            ` (jusqu'au ${formatDate(assignment.endDate)})`}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Aucune affectation active</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Période */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Période du switch</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {!isPermanent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || getTodayDate()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Switch permanent
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                onClick={generateSwitchPlan}
                disabled={
                  !selectedAgent1 ||
                  !selectedAgent2 ||
                  !startDate ||
                  (!isPermanent && !endDate)
                }
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Analyser et continuer
                <FontAwesomeIcon icon={faArrowRight} className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Validation et exécution */}
        {step === 3 && switchPlan && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Récapitulatif du switch
            </h2>

            {/* Résumé */}
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-medium text-indigo-900 mb-3">
                Plan d'action
              </h3>

              {switchType === "swap" ? (
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="font-medium">{switchPlan.agent1?.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {switchPlan.agent1?.currentAssignments[0]?.site.name || "Aucun site"}
                    </p>
                  </div>
                  <FontAwesomeIcon
                    icon={faExchangeAlt}
                    className="text-2xl text-indigo-600"
                  />
                  <div className="text-center">
                    <p className="font-medium">{switchPlan.agent2?.fullName}</p>
                    <p className="text-sm text-gray-600">
                      {switchPlan.agent2?.currentAssignments[0]?.site.name || "Aucun site"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium">{switchPlan.agent1?.fullName}</p>
                  <p className="text-sm text-gray-600">
                    remplacera {switchPlan.agent2?.fullName} sur le site{" "}
                    {switchPlan.agent2?.currentAssignments[0]?.site.name || "sélectionné"}
                  </p>
                </div>
              )}
            </div>

            {/* Conflits détectés */}
            {switchPlan.resolutionConflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="text-yellow-600 mr-3 mt-1"
                  />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Conflits détectés ({switchPlan.resolutionConflicts.length}
                      )
                    </h4>
                    <p className="text-sm text-yellow-800 mb-3">
                      Les affectations suivantes seront automatiquement
                      suspendues :
                    </p>
                    <ul className="space-y-1 text-sm text-yellow-800">
                      {switchPlan.resolutionConflicts.map((conflict, index) => {
                        const assignment = [
                          ...(switchPlan.agent1?.currentAssignments || []),
                          ...(switchPlan.agent2?.currentAssignments || []),
                        ].find((a) => a.id === conflict.assignmentId);

                        return (
                          <li key={index}>
                            • {assignment?.agent.fullName} -{" "}
                            {assignment?.site.name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Message si aucun conflit */}
            {switchPlan.resolutionConflicts.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="text-green-600 mr-3 mt-1"
                  />
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">
                      Aucun conflit détecté
                    </h4>
                    <p className="text-sm text-green-800">
                      Le switch peut être exécuté sans suspension d'affectations existantes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                onClick={executeSwitch}
                disabled={isExecuting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Exécution...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="mr-2" />
                    Exécuter le switch
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
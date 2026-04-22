"use client";

import React, { useEffect, useState } from "react";
import {
  reportsService,
  ReportPeriod,
  CrossTableReport,
  ReportSummary,
} from "../../../../src/services/api/reports";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faDownload,
  faFileExcel,
  faFilePdf,
  faChartBar,
  faTable,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faBuilding,
  faUsers,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faRotate,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Type de regroupement
type GroupBy = "agent" | "site";

export default function ControleurReportsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>({
    type: "week",
    startDate: getStartOfWeek(),
    endDate: getEndOfWeek(),
  });
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [crossTable, setCrossTable] = useState<CrossTableReport | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"summary" | "table">("summary");
  const [groupBy, setGroupBy] = useState<GroupBy>("agent"); // ✅ État pour le regroupement

  useEffect(() => {
    loadReport();
  }, [period]);

  function getStartOfWeek(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  }

  function getEndOfWeek(): string {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + diff);
    sunday.setHours(23, 59, 59, 999);
    return sunday.toISOString().split("T")[0];
  }

  function getStartOfMonth(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split("T")[0];
  }

  function getEndOfMonth(): string {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split("T")[0];
  }

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const [summaryData, tableData, statsData] = await Promise.all([
        reportsService.getSummary(period),
        reportsService.getCrossTable(period),
        reportsService.getDailyStats(period),
      ]);
      setSummary(summaryData);
      setCrossTable(tableData);
      setDailyStats(statsData);
    } catch (error) {
      console.error("Erreur de chargement du rapport:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (type: ReportPeriod["type"]) => {
    let startDate = "";
    let endDate = "";

    switch (type) {
      case "day":
        startDate = new Date().toISOString().split("T")[0];
        endDate = startDate;
        break;
      case "week":
        startDate = getStartOfWeek();
        endDate = getEndOfWeek();
        break;
      case "month":
        startDate = getStartOfMonth();
        endDate = getEndOfMonth();
        break;
      case "custom":
        return;
    }

    setPeriod({ type, startDate, endDate });
  };

  const navigatePeriod = (direction: "prev" | "next") => {
    const currentStart = new Date(period.startDate);
    const currentEnd = new Date(period.endDate);
    const daysDiff = Math.round(
      (currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    const newStart = new Date(currentStart);
    const newEnd = new Date(currentEnd);

    if (direction === "prev") {
      newStart.setDate(currentStart.getDate() - daysDiff - 1);
      newEnd.setDate(currentEnd.getDate() - daysDiff - 1);
    } else {
      newStart.setDate(currentStart.getDate() + daysDiff + 1);
      newEnd.setDate(currentEnd.getDate() + daysDiff + 1);
    }

    setPeriod({
      ...period,
      startDate: newStart.toISOString().split("T")[0],
      endDate: newEnd.toISOString().split("T")[0],
    });
  };

  const handleDownload = async (format: "excel" | "pdf") => {
    setIsDownloading(true);
    try {
      const blob = await reportsService.downloadReport(period, format);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${period.startDate}_${period.endDate}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      alert("Erreur lors du téléchargement du rapport");
    } finally {
      setIsDownloading(false);
    }
  };

  const formatPeriodLabel = (): string => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    if (period.type === "day") {
      return start.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    return `${start.toLocaleDateString("fr-FR")} - ${end.toLocaleDateString("fr-FR")}`;
  };

  const getPresenceIcon = (value: 1 | 0 | null) => {
    if (value === 1)
      return (
        <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
      );
    if (value === 0)
      return <FontAwesomeIcon icon={faTimesCircle} className="text-red-600" />;
    return (
      <FontAwesomeIcon icon={faQuestionCircle} className="text-gray-400" />
    );
  };

  // ✅ Fonction pour regrouper et trier les données
  const getGroupedData = () => {
    if (!crossTable) return { groups: [], dates: [] as string[] };

    const matrix = crossTable.matrix;
    const dates = crossTable.dates;

    if (groupBy === "agent") {
      // Regrouper par agent
      const agentMap = new Map<
        number,
        {
          agentId: number;
          agentName: string;
          sites: string[];
          rows: CrossTableReport["matrix"];
        }
      >();

      matrix.forEach((row) => {
        if (!agentMap.has(row.agentId)) {
          agentMap.set(row.agentId, {
            agentId: row.agentId,
            agentName: row.agentName,
            sites: [],
            rows: [],
          });
        }
        const agent = agentMap.get(row.agentId)!;
        agent.sites.push(row.siteName);
        agent.rows.push(row);
      });

      // Trier par nom d'agent
      const groups = Array.from(agentMap.values()).sort((a, b) =>
        a.agentName.localeCompare(b.agentName),
      );

      return { groups, dates, type: "agent" as const };
    } else {
      // Regrouper par site
      const siteMap = new Map<
        number,
        {
          siteId: number;
          siteName: string;
          agents: string[];
          rows: CrossTableReport["matrix"];
        }
      >();

      matrix.forEach((row) => {
        if (!siteMap.has(row.siteId)) {
          siteMap.set(row.siteId, {
            siteId: row.siteId,
            siteName: row.siteName,
            agents: [],
            rows: [],
          });
        }
        const site = siteMap.get(row.siteId)!;
        site.agents.push(row.agentName);
        site.rows.push(row);
      });

      // Trier par nom de site
      const groups = Array.from(siteMap.values()).sort((a, b) =>
        a.siteName.localeCompare(b.siteName),
      );

      return { groups, dates, type: "site" as const };
    }
  };

  // ✅ Calculer les totaux pour un groupe
  const calculateGroupTotals = (rows: CrossTableReport["matrix"]) => {
    const totalPresent = rows.reduce((sum, r) => sum + r.totalPresent, 0);
    const totalAbsent = rows.reduce((sum, r) => sum + r.totalAbsent, 0);
    const totalUnknown = rows.reduce((sum, r) => sum + r.totalUnknown, 0);
    const total = totalPresent + totalAbsent + totalUnknown;
    const rate =
      totalPresent + totalAbsent > 0
        ? (totalPresent / (totalPresent + totalAbsent)) * 100
        : 0;

    return { totalPresent, totalAbsent, totalUnknown, total, rate };
  };

  // ✅ Calculer les totaux généraux
  const calculateGrandTotals = () => {
    if (!crossTable)
      return {
        totalPresent: 0,
        totalAbsent: 0,
        totalUnknown: 0,
        total: 0,
        rate: 0,
      };

    const allRows = crossTable.matrix;
    const totalPresent = allRows.reduce((sum, r) => sum + r.totalPresent, 0);
    const totalAbsent = allRows.reduce((sum, r) => sum + r.totalAbsent, 0);
    const totalUnknown = allRows.reduce((sum, r) => sum + r.totalUnknown, 0);
    const total = totalPresent + totalAbsent + totalUnknown;
    const rate =
      totalPresent + totalAbsent > 0
        ? (totalPresent / (totalPresent + totalAbsent)) * 100
        : 0;

    return { totalPresent, totalAbsent, totalUnknown, total, rate };
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FontAwesomeIcon
              icon={faChartBar}
              className="mr-3 text-indigo-600"
            />
            Rapports
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => handleDownload("excel")}
              disabled={isDownloading || !summary}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleDownload("pdf")}
              disabled={isDownloading || !summary}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-2">
            <button
              onClick={() => handlePeriodChange("day")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period.type === "day"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => handlePeriodChange("week")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period.type === "week"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => handlePeriodChange("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period.type === "month"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Mois
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigatePeriod("prev")}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <span className="font-medium text-gray-700">
              {formatPeriodLabel()}
            </span>

            <button
              onClick={() => navigatePeriod("next")}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("summary")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === "summary"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-1" />
              Résumé
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FontAwesomeIcon icon={faTable} className="mr-1" />
              Tableau croisé
            </button>
          </div>

          <button
            onClick={loadReport}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>

        {period.type === "custom" && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) =>
                  setPeriod({ ...period, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={period.endDate}
                onChange={(e) =>
                  setPeriod({ ...period, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className="text-3xl text-indigo-600 mb-3"
          />
          <p className="text-gray-500">Génération du rapport...</p>
        </div>
      ) : (
        summary && (
          <>
            {/* Vue Résumé */}
            {viewMode === "summary" && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Sites</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {summary.totalSites}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Agents</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {summary.totalAgents}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Présences</p>
                    <p className="text-2xl font-bold text-green-600">
                      {summary.totalPresences}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Absences</p>
                    <p className="text-2xl font-bold text-red-600">
                      {summary.totalAbsences}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4">
                    <p className="text-sm text-gray-500">Taux de présence</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {summary.presenceRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Résumé par site */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">Résumé par site</h2>
                  </div>
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Site</th>
                          <th className="text-center py-2">Agents</th>
                          <th className="text-center py-2">✅ Présences</th>
                          <th className="text-center py-2">❌ Absences</th>
                          <th className="text-center py-2">❓ Inconnu</th>
                          <th className="text-center py-2">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crossTable?.sites.map((site) => {
                          const siteRows = crossTable.matrix.filter(
                            (r) => r.siteId === site.id,
                          );
                          const totalPresent = siteRows.reduce(
                            (sum, r) => sum + r.totalPresent,
                            0,
                          );
                          const totalAbsent = siteRows.reduce(
                            (sum, r) => sum + r.totalAbsent,
                            0,
                          );
                          const totalUnknown = siteRows.reduce(
                            (sum, r) => sum + r.totalUnknown,
                            0,
                          );
                          const totalEvaluated = totalPresent + totalAbsent;

                          const distinctAgents = new Set(
                            siteRows.map((r) => r.agentId),
                          ).size;

                          const rate =
                            totalEvaluated === 0
                              ? 0
                              : (totalPresent / totalEvaluated) * 100;

                          return (
                            <tr
                              key={site.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="py-2">{site.name}</td>
                              <td className="text-center">{distinctAgents}</td>
                              <td className="text-center text-green-600">
                                {totalPresent}
                              </td>
                              <td className="text-center text-red-600">
                                {totalAbsent}
                              </td>
                              <td className="text-center text-gray-400">
                                {totalUnknown}
                              </td>
                              <td className="text-center font-medium">
                                {totalEvaluated > 0
                                  ? `${rate.toFixed(0)}%`
                                  : "0%"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Vue Tableau croisé */}
            {viewMode === "table" &&
              crossTable &&
              (() => {
                const { groups, dates, type } = getGroupedData();
                const grandTotals = calculateGrandTotals();

                return (
                  <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold">
                            Tableau croisé - Présences par jour
                          </h2>
                          <p className="text-sm text-gray-500 mt-1">
                            ✅ = Présent, ❌ = Absent, ❓ = Non déclaré
                          </p>
                        </div>
                        {/* ✅ Boutons de regroupement */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setGroupBy("agent")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              groupBy === "agent"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <FontAwesomeIcon icon={faUsers} className="mr-1" />
                            Par agent
                          </button>
                          <button
                            onClick={() => setGroupBy("site")}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              groupBy === "site"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            <FontAwesomeIcon
                              icon={faBuilding}
                              className="mr-1"
                            />
                            Par site
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 sticky left-0 bg-gray-50 px-2">
                              {type === "agent" ? "Agent" : "Site"}
                            </th>
                            {dates.map((date) => (
                              <th key={date} className="text-center py-2 px-2">
                                {new Date(date).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </th>
                            ))}
                            <th className="text-center py-2 bg-indigo-50">
                              Total
                            </th>
                            <th className="text-center py-2 bg-purple-50">
                              Taux
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((group: any, groupIdx: number) => {
                            const groupTotals = calculateGroupTotals(
                              group.rows,
                            );
                            const groupName =
                              type === "agent"
                                ? group.agentName
                                : group.siteName;
                            const subName =
                              type === "agent"
                                ? group.sites
                                    .filter(
                                      (s: string, i: number, arr: string[]) =>
                                        arr.indexOf(s) === i,
                                    )
                                    .join(", ")
                                : group.agents
                                    .filter(
                                      (a: string, i: number, arr: string[]) =>
                                        arr.indexOf(a) === i,
                                    )
                                    .join(", ");

                            return (
                              <React.Fragment key={`group-${groupIdx}`}>
                                {/* ✅ En-tête du groupe */}
                                <tr className="bg-gray-100 border-t-2 border-gray-300">
                                  <td className="py-2 sticky left-0 bg-gray-100 px-2 font-semibold">
                                    <div className="flex items-center">
                                      <FontAwesomeIcon
                                        icon={
                                          type === "agent"
                                            ? faUsers
                                            : faBuilding
                                        }
                                        className="mr-2 text-indigo-600 text-xs"
                                      />
                                      <span>{groupName}</span>
                                    </div>
                                    {subName && (
                                      <div className="text-xs text-gray-500 font-normal ml-5">
                                        {subName}
                                      </div>
                                    )}
                                  </td>
                                  {dates.map((date: string) => {
                                    // Fusionner les statuts pour ce groupe et cette date
                                    const hasPresent = group.rows.some(
                                      (r: any) => r.days[date] === 1,
                                    );
                                    const hasAbsent = group.rows.some(
                                      (r: any) => r.days[date] === 0,
                                    );

                                    return (
                                      <td
                                        key={date}
                                        className="text-center py-2"
                                      >
                                        {hasPresent ? (
                                          <FontAwesomeIcon
                                            icon={faCheckCircle}
                                            className="text-green-600"
                                          />
                                        ) : hasAbsent ? (
                                          <FontAwesomeIcon
                                            icon={faTimesCircle}
                                            className="text-red-600"
                                          />
                                        ) : (
                                          <FontAwesomeIcon
                                            icon={faQuestionCircle}
                                            className="text-gray-400"
                                          />
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="text-center py-2 bg-indigo-50 font-medium">
                                    <span className="text-green-600">
                                      {groupTotals.totalPresent}
                                    </span>
                                    <span className="text-gray-400 mx-1">
                                      /
                                    </span>
                                    <span className="text-gray-600">
                                      {groupTotals.total}
                                    </span>
                                  </td>
                                  <td className="text-center py-2 bg-purple-50 font-medium">
                                    {groupTotals.rate.toFixed(0)}%
                                  </td>
                                </tr>

                                {/* ✅ Détail des lignes du groupe */}
                                {group.rows.map((row: any, rowIdx: number) => (
                                  <tr
                                    key={`${row.agentId}-${row.siteId}`}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="py-1.5 sticky left-0 bg-white pl-8 text-gray-600">
                                      {type === "agent"
                                        ? row.siteName
                                        : row.agentName}
                                    </td>
                                    {dates.map((date: string) => (
                                      <td
                                        key={date}
                                        className="text-center py-1.5"
                                      >
                                        {getPresenceIcon(row.days[date])}
                                      </td>
                                    ))}
                                    <td className="text-center py-1.5 bg-indigo-50/50 text-xs">
                                      <span className="text-green-600">
                                        {row.totalPresent}
                                      </span>
                                      <span className="text-gray-400 mx-0.5">
                                        /
                                      </span>
                                      <span className="text-gray-600">
                                        {row.totalPresent +
                                          row.totalAbsent +
                                          row.totalUnknown}
                                      </span>
                                    </td>
                                    <td className="text-center py-1.5 bg-purple-50/50"></td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}

                          {/* ✅ Ligne des totaux généraux */}
                          <tr className="border-t-2 border-gray-400 bg-gray-100 font-semibold">
                            <td className="py-3 sticky left-0 bg-gray-100 px-2">
                              <FontAwesomeIcon
                                icon={faLayerGroup}
                                className="mr-2 text-indigo-600"
                              />
                              TOTAL GÉNÉRAL
                            </td>
                            {dates.map((date: string) => {
                              const allRows = crossTable.matrix;
                              const hasPresent = allRows.some(
                                (r: any) => r.days[date] === 1,
                              );
                              const hasAbsent = allRows.some(
                                (r: any) => r.days[date] === 0,
                              );

                              return (
                                <td key={date} className="text-center py-3">
                                  {hasPresent ? (
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="text-green-600"
                                    />
                                  ) : hasAbsent ? (
                                    <FontAwesomeIcon
                                      icon={faTimesCircle}
                                      className="text-red-600"
                                    />
                                  ) : (
                                    <FontAwesomeIcon
                                      icon={faQuestionCircle}
                                      className="text-gray-400"
                                    />
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center py-3 bg-indigo-100">
                              <span className="text-green-600">
                                {grandTotals.totalPresent}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-600">
                                {grandTotals.total}
                              </span>
                            </td>
                            <td className="text-center py-3 bg-purple-100">
                              {grandTotals.rate.toFixed(0)}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

            {/* Généré le */}
            <p className="text-xs text-gray-400 text-right">
              Rapport généré le{" "}
              {new Date(summary.generatedAt).toLocaleString("fr-FR")}
            </p>
          </>
        )
      )}
    </div>
  );
}

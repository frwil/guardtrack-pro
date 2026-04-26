// src/app/dashboard/admin/finance/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "../../../../src/stores/authStore";
import { getToken } from "../../../../src/services/storage/token";
import { apiClient } from "../../../../src/services/api/client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillTrendUp,
  faDollarSign,
  faClock,
  faUsers,
  faBuilding,
  faUser,
  faLocationDot,
  faRotate,
  faDownload,
  faChartBar,
  faArrowUp,
  faArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FinanceSummary {
  totalRevenue: number;
  todayRevenue: number;
  activeAgents: number;
  averageHourlyRate: number;
  totalHours: number;
  period: { start: string; end: string };
}

interface DailyStats {
  date: string;
  revenue: number;
  hours: number;
}

interface ClientRevenue {
  clientId: number;
  clientName: string;
  revenue: number;
  hours: number;
}

interface AgentRevenue {
  agentId: number;
  agentName: string;
  totalHours: number;
  revenue: number;
}

interface SiteRevenue {
  siteId: number;
  siteName: string;
  clientName: string;
  totalHours: number;
  revenue: number;
  agentCount: number;
}

const PERIOD_PRESETS = [
  { label: "Aujourd'hui", value: "today" },
  { label: "Cette semaine", value: "week" },
  { label: "Ce mois", value: "month" },
  { label: "Ce trimestre", value: "quarter" },
  { label: "Cette année", value: "year" },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatFullDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function FinancePage() {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topClients, setTopClients] = useState<ClientRevenue[]>([]);
  const [topAgents, setTopAgents] = useState<AgentRevenue[]>([]);
  const [siteDetails, setSiteDetails] = useState<SiteRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateRange = (preset: string) => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start.setDate(today.getDate() - today.getDay() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(today.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "quarter":
        start.setMonth(Math.floor(today.getMonth() / 3) * 3, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "year":
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dates =
        customStart && customEnd
          ? { start: customStart, end: customEnd }
          : getDateRange(period);

      const params = new URLSearchParams({
        start: dates.start,
        end: dates.end,
      });

      const [summaryRes, dailyRes, clientRes, agentRes, siteRes] =
        await Promise.all([
          apiClient.get<FinanceSummary>(`/finance/summary?${params}`),
          apiClient.get<DailyStats[]>(`/finance/daily-stats?${params}`),
          apiClient.get<ClientRevenue[]>(`/finance/by-client?${params}`),
          apiClient.get<AgentRevenue[]>(`/finance/by-agent?${params}`),
          apiClient.get<SiteRevenue[]>(`/finance/by-site?${params}`),
        ]);

      if (summaryRes.data) setSummary(summaryRes.data);
      if (dailyRes.data) setDailyStats(dailyRes.data);
      if (clientRes.data) setTopClients(clientRes.data);
      if (agentRes.data) setTopAgents(agentRes.data);
      if (siteRes.data) setSiteDetails(siteRes.data);
    } catch (error) {
      console.error("Erreur de chargement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, customStart, customEnd]);

  const handleExport = async (format: "excel" | "pdf") => {
    console.log(`Export en ${format}`);
    // TODO: Implémenter l'export
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">
            Chargement des données financières...
          </p>
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
                icon={faMoneyBillTrendUp}
                className="mr-3 text-emerald-600"
              />
              Finance
            </h1>
            <p className="text-gray-600 mt-1">
              {summary
                ? `Période : ${formatDate(summary.period.start)} - ${formatDate(summary.period.end)}`
                : "Aucune période sélectionnée"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Sélecteur de période */}
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setCustomStart("");
                setCustomEnd("");
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {PERIOD_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleExport("excel")}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              PDF
            </button>
            <button
              onClick={loadData}
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faRotate} className="mr-2" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Période personnalisée */}
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-sm text-gray-500 mb-3">Période personnalisée</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Du
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                if (e.target.value) setPeriod("");
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Au
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                if (e.target.value) setPeriod("");
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CA Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                <FontAwesomeIcon icon={faDollarSign} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              +{formatCurrency(summary.todayRevenue)} aujourd'hui
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Heures</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(summary.totalHours)} h
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <FontAwesomeIcon icon={faClock} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {summary.activeAgents} agents actifs
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taux horaire moy.</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.averageHourlyRate)}/h
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                <FontAwesomeIcon icon={faChartBar} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Agents facturés</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.activeAgents}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                <FontAwesomeIcon icon={faUsers} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CA / Agent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.activeAgents > 0
                    ? formatCurrency(
                        summary.totalRevenue / summary.activeAgents,
                      )
                    : "N/A"}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white">
                <FontAwesomeIcon icon={faUser} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graphique d'évolution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FontAwesomeIcon icon={faChartBar} className="mr-2 text-indigo-600" />
          Évolution du Chiffre d'Affaires
        </h2>
        {dailyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date: string) => formatDate(date)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#10b981"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const num = typeof value === "number" ? value : 0;
                  if (name === "revenue") return [formatCurrency(num), "CA"];
                  return [`${num}h`, "Heures"];
                }}
                labelFormatter={(label: any) => formatFullDate(String(label))}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="#10b981"
                name="CA"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="hours"
                fill="#3b82f6"
                name="Heures"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FontAwesomeIcon
              icon={faChartBar}
              className="text-4xl mb-3 text-gray-300"
            />
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        )}
      </div>

      {/* Top Clients et Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FontAwesomeIcon
              icon={faBuilding}
              className="mr-2 text-purple-600"
            />
            Top 10 Clients
          </h2>
          <div className="space-y-3">
            {topClients.length > 0 ? (
              topClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-400 mr-3">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {client.clientName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {client.hours}h travaillées
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-emerald-600">
                    {formatCurrency(client.revenue)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600" />
            Top 10 Agents
          </h2>
          <div className="space-y-3">
            {topAgents.length > 0 ? (
              topAgents.map((agent, index) => (
                <div
                  key={agent.agentId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-400 mr-3">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {agent.agentName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {agent.totalHours}h travaillées
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(agent.revenue)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                Aucune donnée disponible
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Détail par Site */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FontAwesomeIcon
            icon={faLocationDot}
            className="mr-2 text-orange-600"
          />
          Détail par Site
        </h2>
        {siteDetails.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Site
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Client
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Heures
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    Agents
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    CA
                  </th>
                </tr>
              </thead>
              <tbody>
                {siteDetails.map((site) => (
                  <tr
                    key={site.siteId}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {site.siteName}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {site.clientName}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {site.totalHours}h
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {site.agentCount}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(site.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FontAwesomeIcon
              icon={faLocationDot}
              className="text-4xl mb-3 text-gray-300"
            />
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        )}
      </div>
    </div>
  );
}

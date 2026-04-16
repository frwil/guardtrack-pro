// app/dashboard/superviseur/reports/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { reportsService, ReportPeriod, CrossTableReport, ReportSummary } from '../../../../src/services/api/reports';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendar,
  faDownload,
  faChartBar,
  faTable,
  faFilter,
  faRotate,
  faFileExcel,
  faFilePdf,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faBuilding,
  faUser,
  faChevronRight,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

export default function SuperviseurReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>({
    type: 'week',
    startDate: getDefaultStartDate('week'),
    endDate: getDefaultEndDate(),
  });
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [crossTable, setCrossTable] = useState<CrossTableReport | null>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'summary' | 'crossTable' | 'charts'>('summary');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  useEffect(() => {
    loadReportData();
  }, [period.type]);

  function getDefaultStartDate(type: 'day' | 'week' | 'month' | 'custom'): string {
    const now = new Date();
    switch (type) {
      case 'day':
        return now.toISOString().split('T')[0];
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1);
        return weekStart.toISOString().split('T')[0];
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthStart.toISOString().split('T')[0];
      default:
        return now.toISOString().split('T')[0];
    }
  }

  function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [summaryData, crossTableData, dailyData] = await Promise.all([
        reportsService.getSummary(period),
        reportsService.getCrossTable(period),
        reportsService.getDailyStats(period),
      ]);

      setSummary(summaryData);
      setCrossTable(crossTableData);
      setDailyStats(dailyData);
    } catch (error) {
      console.error('Erreur de chargement des rapports:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (type: 'day' | 'week' | 'month' | 'custom') => {
    const newPeriod: ReportPeriod = {
      type,
      startDate: type === 'custom' ? period.startDate : getDefaultStartDate(type),
      endDate: period.endDate,
    };
    setPeriod(newPeriod);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await loadReportData();
    setIsGenerating(false);
  };

  const handleDownload = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await reportsService.downloadReport(period, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${period.startDate}_${period.endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      alert('Erreur lors du téléchargement du rapport');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatShortDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getPresenceIcon = (value: 1 | 0 | null) => {
    if (value === 1) {
      return <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" title="Présent" />;
    } else if (value === 0) {
      return <FontAwesomeIcon icon={faTimesCircle} className="text-red-600" title="Absent" />;
    } else {
      return <FontAwesomeIcon icon={faQuestionCircle} className="text-gray-400" title="Inconnu" />;
    }
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
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
              <FontAwesomeIcon icon={faChartBar} className="mr-3 text-indigo-600" />
              Rapports et Statistiques
            </h1>
            <p className="text-gray-600 mt-1">
              Analysez les présences et générez des rapports détaillés
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleDownload('excel')}
              className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200 flex items-center"
            >
              <FontAwesomeIcon icon={faFileExcel} className="mr-2" />
              Excel
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 flex items-center"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filtres de période */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FontAwesomeIcon icon={faFilter} className="mr-2 text-indigo-600" />
          Période du rapport
        </h2>
        
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de période</label>
            <div className="flex space-x-2">
              {(['day', 'week', 'month', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePeriodChange(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    period.type === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'day' && 'Jour'}
                  {type === 'week' && 'Semaine'}
                  {type === 'month' && 'Mois'}
                  {type === 'custom' && 'Personnalisé'}
                </button>
              ))}
            </div>
          </div>

          {period.type === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                  min={period.startDate}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            {isGenerating ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Génération...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faRotate} className="mr-2" />
                Générer le rapport
              </>
            )}
          </button>
        </div>

        {period.type !== 'custom' && (
          <p className="text-sm text-gray-500 mt-3">
            Période : {formatDate(period.startDate)} → {formatDate(period.endDate)}
          </p>
        )}
      </div>

      {/* Onglets de vue */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['summary', 'crossTable', 'charts'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeView === view
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {view === 'summary' && 'Résumé'}
                {view === 'crossTable' && 'Tableau croisé'}
                {view === 'charts' && 'Graphiques'}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Vue Résumé */}
          {activeView === 'summary' && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Total sites</p>
                  <p className="text-3xl font-bold text-blue-900">{summary.totalSites}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4">
                  <p className="text-sm text-indigo-600">Total agents</p>
                  <p className="text-3xl font-bold text-indigo-900">{summary.totalAgents}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm text-green-600">Total présences</p>
                  <p className="text-3xl font-bold text-green-900">{summary.totalPresences}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                  <p className="text-sm text-red-600">Total absences</p>
                  <p className="text-3xl font-bold text-red-900">{summary.totalAbsences}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Taux de présence global</h3>
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full transition-all"
                        style={{ width: `${summary.presenceRate}%` }}
                      />
                    </div>
                  </div>
                  <span className={`ml-4 text-2xl font-bold ${getStatusColor(summary.presenceRate)}`}>
                    {summary.presenceRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-500 text-right">
                Rapport généré le {formatDate(summary.generatedAt)}
              </div>
            </div>
          )}

          {/* Vue Tableau croisé */}
          {activeView === 'crossTable' && crossTable && (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par site</label>
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tous les sites</option>
                    {crossTable.sites.map((site) => (
                      <option key={site.id} value={site.id.toString()}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filtrer par agent</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tous les agents</option>
                    {crossTable.agents.map((agent) => (
                      <option key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left font-medium text-gray-700 sticky left-0 bg-gray-100">
                        Agent / Site
                      </th>
                      {crossTable.dates.map((date) => (
                        <th key={date} className="px-3 py-2 text-center font-medium text-gray-700">
                          {formatShortDate(date)}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossTable.matrix
                      .filter((row) => {
                        if (selectedSite && row.siteId.toString() !== selectedSite) return false;
                        if (selectedAgent && row.agentId.toString() !== selectedAgent) return false;
                        return true;
                      })
                      .map((row, index) => (
                        <tr key={index} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 sticky left-0 bg-white">
                            <div className="font-medium">{row.agentName}</div>
                            <div className="text-xs text-gray-500">{row.siteName}</div>
                          </td>
                          {crossTable.dates.map((date) => (
                            <td key={date} className="px-3 py-2 text-center">
                              {getPresenceIcon(row.days[date])}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center">
                            <span className="font-medium text-green-600">{row.totalPresent}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-red-600">{row.totalAbsent}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Légende */}
              <div className="flex items-center justify-end space-x-4 text-sm">
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 mr-1" />
                  <span>Présent</span>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-red-600 mr-1" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center">
                  <FontAwesomeIcon icon={faQuestionCircle} className="text-gray-400 mr-1" />
                  <span>Inconnu</span>
                </div>
              </div>
            </div>
          )}

          {/* Vue Graphiques */}
          {activeView === 'charts' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Évolution des présences</h3>
                <div className="h-64 flex items-end justify-around">
                  {dailyStats.map((stat, index) => {
                    const maxValue = Math.max(...dailyStats.map((s: any) => s.present), 1);
                    const height = (stat.present / maxValue) * 100;
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div className="text-sm font-medium text-gray-700 mb-1">{stat.present}</div>
                        <div
                          className="w-12 bg-indigo-500 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(height, 5)}%`, minHeight: '20px' }}
                        />
                        <div className="text-xs text-gray-500 mt-2">{formatShortDate(stat.date)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Top 5 Sites</h4>
                  {/* À implémenter avec les données réelles */}
                  <p className="text-gray-500 text-sm">Données à venir...</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Top 5 Agents</h4>
                  {/* À implémenter avec les données réelles */}
                  <p className="text-gray-500 text-sm">Données à venir...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
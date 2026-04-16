// app/dashboard/superviseur/evaluations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  kpiService, 
  AgentKPI, 
  ControllerKPI, 
  KPISummary,
  AIGlobalInsights,
  AIAnalysisResult,
  EnhancedAgentKPI,
  EnhancedControllerKPI
} from '../../../../src/services/api/kpi';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faChartBar, faTrophy, faUser, faUserCheck,
  faClock, faCheckCircle, faTimesCircle, faExclamationTriangle,
  faArrowUp, faArrowDown, faMinus, faDownload, faCalendar,
  faStar, faMedal, faBrain, faLightbulb, faChartLine,
  faWarning, faFilter, faSync, faChevronDown, faChevronUp,
} from '@fortawesome/free-solid-svg-icons';

export default function EvaluationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'agents' | 'controllers' | 'ai'>('summary');
  const [period, setPeriod] = useState({ start: getDefaultStartDate(), end: getDefaultEndDate() });
  const [agents, setAgents] = useState<AgentKPI[]>([]);
  const [controllers, setControllers] = useState<ControllerKPI[]>([]);
  const [summary, setSummary] = useState<KPISummary | null>(null);
  
  // États IA
  const [aiInsights, setAiInsights] = useState<AIGlobalInsights | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<EnhancedAgentKPI | null>(null);
  const [selectedController, setSelectedController] = useState<EnhancedControllerKPI | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedAnalysis, setExpandedAnalysis] = useState<number | null>(null);
  const [aiConfig, setAiConfig] = useState<any>(null);

  function getDefaultStartDate(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return now.toISOString().split('T')[0];
  }

  function getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    if (activeTab === 'ai') {
      loadAIInsights();
    }
  }, [activeTab, period]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsData, controllersData, summaryData] = await Promise.all([
        kpiService.getAllAgentsKPI(period),
        kpiService.getAllControllersKPI(period),
        kpiService.getSummary(period),
      ]);
      setAgents(agentsData.sort((a, b) => b.overallScore - a.overallScore));
      setControllers(controllersData.sort((a, b) => b.overallScore - a.overallScore));
      setSummary(summaryData);
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAIInsights = async () => {
    try {
      const insights = await kpiService.getAIGlobalInsights(period);
      setAiInsights(insights);
    } catch (error) {
      console.error('Erreur chargement insights IA:', error);
    }
  };

  const analyzeAgent = async (agentId: number) => {
    setIsAnalyzing(true);
    try {
      const enhanced = await kpiService.getEnhancedAgentKPI(agentId, period);
      setSelectedAgent(enhanced);
      setSelectedController(null);
    } catch (error) {
      console.error('Erreur analyse agent:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeController = async (controllerId: number) => {
    setIsAnalyzing(true);
    try {
      const enhanced = await kpiService.getEnhancedControllerKPI(controllerId, period);
      setSelectedController(enhanced);
      setSelectedAgent(null);
    } catch (error) {
      console.error('Erreur analyse contrôleur:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshAnalysis = async () => {
    if (selectedAgent) {
      await analyzeAgent(selectedAgent.agentId);
    } else if (selectedController) {
      await analyzeController(selectedController.controllerId);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { color: 'bg-green-100 text-green-800', icon: faTrophy, label: 'Excellent' };
    if (score >= 75) return { color: 'bg-blue-100 text-blue-800', icon: faStar, label: 'Bon' };
    if (score >= 60) return { color: 'bg-yellow-100 text-yellow-800', icon: faMinus, label: 'Moyen' };
    return { color: 'bg-red-100 text-red-800', icon: faExclamationTriangle, label: 'À améliorer' };
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <FontAwesomeIcon icon={faArrowUp} className="text-green-600" />;
    if (trend === 'down') return <FontAwesomeIcon icon={faArrowDown} className="text-red-600" />;
    return <FontAwesomeIcon icon={faMinus} className="text-gray-600" />;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const handleDownload = async (type: 'agents' | 'controllers' | 'full', format: 'pdf' | 'excel') => {
    try {
      const blob = await kpiService.downloadReport(type, format, period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_${type}_${period.start}_${period.end}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleDownloadAIReport = async (type: 'agent' | 'controller' | 'team', entityId?: number) => {
    try {
      const blob = await kpiService.downloadAIReport(type, entityId, 'pdf', period);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analyse_ia_${type}_${period.start}_${period.end}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      alert('Erreur lors du téléchargement du rapport IA');
    }
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
              Évaluation des Performances
            </h1>
            <p className="text-gray-600 mt-1">Analysez les KPIs des agents et contrôleurs avec IA</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <input type="date" value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} className="px-3 py-2 border rounded-lg" />
              <span>→</span>
              <input type="date" value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} className="px-3 py-2 border rounded-lg" />
            </div>
            <button onClick={() => handleDownload('full', 'excel')} className="px-4 py-2 text-green-700 bg-green-100 rounded-lg hover:bg-green-200">
              <FontAwesomeIcon icon={faDownload} className="mr-2" /> Excel
            </button>
            <button onClick={() => handleDownload('full', 'pdf')} className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200">
              <FontAwesomeIcon icon={faDownload} className="mr-2" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['summary', 'agents', 'controllers', 'ai'] as const).map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
              >
                {tab === 'summary' && 'Vue d\'ensemble'}
                {tab === 'agents' && `Agents (${agents.length})`}
                {tab === 'controllers' && `Contrôleurs (${controllers.length})`}
                {tab === 'ai' && (
                  <span className="flex items-center">
                    <FontAwesomeIcon icon={faBrain} className="mr-1" />
                    Analyse IA
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Vue d'ensemble */}
          {activeTab === 'summary' && summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <p className="text-sm text-blue-600">Taux de présence</p>
                  <p className="text-3xl font-bold text-blue-900">{formatPercent(summary.globalStats.averagePresenceRate)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm text-green-600">Ponctualité</p>
                  <p className="text-3xl font-bold text-green-900">{formatPercent(summary.globalStats.averagePunctualityRate)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-sm text-purple-600">Précision validation</p>
                  <p className="text-3xl font-bold text-purple-900">{formatPercent(summary.globalStats.averageValidationAccuracy)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                  <p className="text-sm text-orange-600">Incidents</p>
                  <p className="text-3xl font-bold text-orange-900">{summary.globalStats.totalIncidents}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                  <p className="text-sm text-red-600">Litiges</p>
                  <p className="text-3xl font-bold text-red-900">{summary.globalStats.totalDisputes}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faTrophy} className="mr-2 text-yellow-500" />
                    Top 5 Agents
                  </h3>
                  <div className="space-y-2">
                    {summary.topAgents.map((agent, idx) => (
                      <div key={agent.agentId} className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <span className="w-6 text-gray-500">#{idx + 1}</span>
                          <FontAwesomeIcon icon={faUser} className="text-gray-400 mr-2" />
                          <span>{agent.agentName}</span>
                        </div>
                        <span className={`font-bold ${getScoreColor(agent.overallScore)}`}>{agent.overallScore.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faMedal} className="mr-2 text-indigo-500" />
                    Top 5 Contrôleurs
                  </h3>
                  <div className="space-y-2">
                    {summary.topControllers.map((ctrl, idx) => (
                      <div key={ctrl.controllerId} className="flex items-center justify-between p-2 bg-white rounded">
                        <div className="flex items-center">
                          <span className="w-6 text-gray-500">#{idx + 1}</span>
                          <FontAwesomeIcon icon={faUserCheck} className="text-gray-400 mr-2" />
                          <span>{ctrl.controllerName}</span>
                        </div>
                        <span className={`font-bold ${getScoreColor(ctrl.overallScore)}`}>{ctrl.overallScore.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Agents */}
          {activeTab === 'agents' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Rang</th>
                    <th className="px-4 py-2 text-left">Agent</th>
                    <th className="px-4 py-2 text-center">Score</th>
                    <th className="px-4 py-2 text-center">Présence</th>
                    <th className="px-4 py-2 text-center">Ponctualité</th>
                    <th className="px-4 py-2 text-center">Qualité photo</th>
                    <th className="px-4 py-2 text-center">Validation</th>
                    <th className="px-4 py-2 text-center">Tendance</th>
                    <th className="px-4 py-2 text-center">IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agents.map((agent, idx) => {
                    const badge = getScoreBadge(agent.overallScore);
                    return (
                      <tr key={agent.agentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {idx === 0 && <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 mr-1" />}
                          {idx === 1 && <FontAwesomeIcon icon={faMedal} className="text-gray-400 mr-1" />}
                          {idx === 2 && <FontAwesomeIcon icon={faMedal} className="text-orange-400 mr-1" />}
                          #{agent.rank || idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{agent.agentName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${badge.color}`}>
                            <FontAwesomeIcon icon={badge.icon} className="mr-1" />
                            {agent.overallScore.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={getScoreColor(agent.presenceRate)}>{formatPercent(agent.presenceRate)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={getScoreColor(agent.punctualityRate)}>{formatPercent(agent.punctualityRate)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{agent.photoQualityScore.toFixed(0)}%</td>
                        <td className="px-4 py-3 text-center">{formatPercent(agent.validationRate)}</td>
                        <td className="px-4 py-3 text-center">{getTrendIcon(agent.trend)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => analyzeAgent(agent.agentId)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Analyser avec IA"
                          >
                            <FontAwesomeIcon icon={faBrain} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Contrôleurs */}
          {activeTab === 'controllers' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Rang</th>
                    <th className="px-4 py-2 text-left">Contrôleur</th>
                    <th className="px-4 py-2 text-center">Score</th>
                    <th className="px-4 py-2 text-center">Rondes</th>
                    <th className="px-4 py-2 text-center">Sites visités</th>
                    <th className="px-4 py-2 text-center">Validations</th>
                    <th className="px-4 py-2 text-center">Précision</th>
                    <th className="px-4 py-2 text-center">Litiges perdus</th>
                    <th className="px-4 py-2 text-center">Tendance</th>
                    <th className="px-4 py-2 text-center">IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {controllers.map((ctrl, idx) => {
                    const badge = getScoreBadge(ctrl.overallScore);
                    return (
                      <tr key={ctrl.controllerId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {idx === 0 && <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 mr-1" />}
                          #{ctrl.rank || idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{ctrl.controllerName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${badge.color}`}>
                            {ctrl.overallScore.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{ctrl.totalRounds}</td>
                        <td className="px-4 py-3 text-center">{ctrl.totalSitesVisited}</td>
                        <td className="px-4 py-3 text-center">{ctrl.presencesValidated}</td>
                        <td className="px-4 py-3 text-center">{formatPercent(ctrl.validationAccuracy)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={ctrl.disputesLost > 0 ? 'text-red-600' : 'text-green-600'}>
                            {ctrl.disputesLost}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{getTrendIcon(ctrl.trend)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => analyzeController(ctrl.controllerId)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Analyser avec IA"
                          >
                            <FontAwesomeIcon icon={faBrain} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Panneau d'analyse IA */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Sélection d'analyse */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    Analyser un agent
                  </h3>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (id) analyzeAgent(id);
                    }}
                    value=""
                  >
                    <option value="">Sélectionner un agent...</option>
                    {agents.map(agent => (
                      <option key={agent.agentId} value={agent.agentId}>
                        {agent.agentName} (Score: {agent.overallScore.toFixed(0)}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center">
                    <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
                    Analyser un contrôleur
                  </h3>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => {
                      const id = parseInt(e.target.value);
                      if (id) analyzeController(id);
                    }}
                    value=""
                  >
                    <option value="">Sélectionner un contrôleur...</option>
                    {controllers.map(ctrl => (
                      <option key={ctrl.controllerId} value={ctrl.controllerId}>
                        {ctrl.controllerName} (Score: {ctrl.overallScore.toFixed(0)}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Résultat d'analyse */}
              {(selectedAgent || selectedController) && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <FontAwesomeIcon icon={faBrain} className="mr-2 text-indigo-600" />
                      Analyse IA - {selectedAgent?.agentName || selectedController?.controllerName}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={refreshAnalysis}
                        disabled={isAnalyzing}
                        className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm"
                      >
                        <FontAwesomeIcon icon={faSync} className={isAnalyzing ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => handleDownloadAIReport(
                          selectedAgent ? 'agent' : 'controller',
                          selectedAgent?.agentId || selectedController?.controllerId
                        )}
                        className="px-3 py-1.5 text-green-600 hover:bg-green-100 rounded-lg text-sm"
                      >
                        <FontAwesomeIcon icon={faDownload} className="mr-1" />
                        Rapport
                      </button>
                    </div>
                  </div>

                  {isAnalyzing ? (
                    <div className="flex items-center justify-center py-8">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-indigo-600 mr-3" />
                      <span className="text-gray-600">Analyse en cours...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Scores IA */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Score comportemental</p>
                          <p className="text-2xl font-bold text-indigo-600">
                            {selectedAgent?.aiAnalysis?.behavioralScore || selectedController?.aiAnalysis?.behavioralScore || '-'}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Fiabilité</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedAgent?.aiAnalysis?.reliabilityIndex || selectedController?.aiAnalysis?.reliabilityIndex || '-'}%
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Consistance</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedAgent?.aiAnalysis?.consistencyScore || selectedController?.aiAnalysis?.consistencyScore || '-'}%
                          </p>
                        </div>
                      </div>

                      {/* Prédictions */}
                      {(selectedAgent?.aiAnalysis || selectedController?.aiAnalysis) && (
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                            <FontAwesomeIcon icon={faChartLine} className="mr-2 text-indigo-600" />
                            Prédictions
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Performance prévue</p>
                              <p className="text-xl font-bold">
                                {(selectedAgent?.aiAnalysis?.predictedPerformance || selectedController?.aiAnalysis?.predictedPerformance || 0)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Niveau de risque</p>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(
                                selectedAgent?.aiAnalysis?.riskLevel || selectedController?.aiAnalysis?.riskLevel || 'LOW'
                              )}`}>
                                {selectedAgent?.aiAnalysis?.riskLevel === 'LOW' ? 'Faible' : 
                                 selectedAgent?.aiAnalysis?.riskLevel === 'MEDIUM' ? 'Moyen' : 'Élevé'}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Risque de départ</p>
                              <p className={`text-xl font-bold ${
                                (selectedAgent?.aiAnalysis?.attritionRisk || selectedController?.aiAnalysis?.attritionRisk || 0) > 50 
                                  ? 'text-red-600' 
                                  : (selectedAgent?.aiAnalysis?.attritionRisk || selectedController?.aiAnalysis?.attritionRisk || 0) > 30 
                                    ? 'text-yellow-600' 
                                    : 'text-green-600'
                              }`}>
                                {selectedAgent?.aiAnalysis?.attritionRisk || selectedController?.aiAnalysis?.attritionRisk || 0}%
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Forces et faiblesses */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-green-700 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                            Points forts
                          </h4>
                          <ul className="space-y-1">
                            {(selectedAgent?.aiAnalysis?.strengths || selectedController?.aiAnalysis?.strengths || []).map((s, i) => (
                              <li key={i} className="text-sm text-gray-700">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-medium text-orange-700 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                            Axes d'amélioration
                          </h4>
                          <ul className="space-y-1">
                            {(selectedAgent?.aiAnalysis?.weaknesses || selectedController?.aiAnalysis?.weaknesses || []).map((w, i) => (
                              <li key={i} className="text-sm text-gray-700">• {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Recommandations */}
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <FontAwesomeIcon icon={faLightbulb} className="mr-2 text-yellow-500" />
                          Recommandations
                        </h4>
                        <ul className="space-y-1">
                          {(selectedAgent?.aiAnalysis?.recommendations || selectedController?.aiAnalysis?.recommendations || []).map((r, i) => (
                            <li key={i} className="text-sm text-gray-700">→ {r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Anomalies */}
                      {((selectedAgent?.aiAnalysis?.anomalies?.length ?? 0) > 0 || (selectedController?.aiAnalysis?.anomalies?.length ?? 0) > 0) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                          <h4 className="font-medium text-orange-800 mb-2 flex items-center">
                            <FontAwesomeIcon icon={faWarning} className="mr-2" />
                            Anomalies détectées
                          </h4>
                          <div className="space-y-2">
                            {((selectedAgent?.aiAnalysis?.anomalies ?? selectedController?.aiAnalysis?.anomalies) ?? []).map((anomaly, i) => (
                              <div key={i} className="bg-white rounded p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                                    anomaly.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {anomaly.type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(anomaly.detectedAt).toLocaleDateString('fr-FR')}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{anomaly.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Insights IA Globaux */}
              {aiInsights && (
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
                  <h3 className="text-xl font-bold mb-4 flex items-center">
                    <FontAwesomeIcon icon={faBrain} className="mr-2" />
                    Intelligence Artificielle - Insights Globaux
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-80">Performance d'équipe</p>
                      <p className="text-3xl font-bold">{aiInsights.teamPerformance}%</p>
                      <p className="text-sm mt-1">
                        Tendance : {aiInsights.teamTrend === 'up' ? '↗️ En hausse' : aiInsights.teamTrend === 'down' ? '↘️ En baisse' : '→ Stable'}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-80">Anomalies détectées</p>
                      <p className="text-3xl font-bold">{aiInsights.anomaliesSummary.total}</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-80">Membres à risque</p>
                      <p className="text-3xl font-bold">{aiInsights.atRiskMembers.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium mb-2">🏆 Top Performers</p>
                      {aiInsights.topPerformers.slice(0, 3).map((p, i) => (
                        <div key={i} className="bg-white/10 rounded p-2 mb-1">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-sm ml-2">({p.role === 'agent' ? 'Agent' : 'Contrôleur'})</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="font-medium mb-2">⚠️ À surveiller</p>
                      {aiInsights.atRiskMembers.slice(0, 3).map((m, i) => (
                        <div key={i} className="bg-white/10 rounded p-2 mb-1">
                          <span className="font-medium">{m.name}</span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${getRiskColor(m.riskLevel)}`}>
                            {m.riskLevel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {aiInsights.teamRecommendations.length > 0 && (
                    <div className="mt-4 bg-white/10 rounded-lg p-3">
                      <p className="font-medium mb-1">💡 Recommandations pour l'équipe</p>
                      <p className="text-sm">{aiInsights.teamRecommendations[0]}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
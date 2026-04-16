// app/dashboard/superviseur/evaluations/components/AIAnalysisPanel.tsx
'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { kpiService } from '@/src/services/api/kpi';
import {
  faBrain, faSpinner, faCheckCircle, faExclamationTriangle,
  faLightbulb, faChartLine, faUserCheck, faWarning,
  faArrowTrendUp, faArrowTrendDown, faMinus,
} from '@fortawesome/free-solid-svg-icons';

interface AIAnalysisPanelProps {
  type: 'agent' | 'controller';
  entityId: number;
  entityName: string;
  onAnalysisComplete?: (result: any) => void;
}

export default function AIAnalysisPanel({ type, entityId, entityName, onAnalysisComplete }: AIAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      let result;
      if (type === 'agent') {
        result = await kpiService.analyzeAgentWithAI(entityId);
      } else {
        result = await kpiService.analyzeControllerWithAI(entityId);
      }
      
      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'HIGH': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreGauge = (score: number) => {
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${
            color === 'green' ? 'bg-green-600' : color === 'yellow' ? 'bg-yellow-600' : 'bg-red-600'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <FontAwesomeIcon icon={faBrain} className="mr-2 text-indigo-600" />
          Analyse IA - {entityName}
        </h3>
        
        {!analysis && !isAnalyzing && (
          <button
            onClick={runAnalysis}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            <FontAwesomeIcon icon={faBrain} className="mr-2" />
            Lancer l'analyse IA
          </button>
        )}
        
        {analysis && (
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm"
          >
            <FontAwesomeIcon icon={faBrain} className="mr-1" />
            Actualiser
          </button>
        )}
      </div>

      {isAnalyzing && (
        <div className="flex items-center justify-center py-8">
          <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-indigo-600 mr-3" />
          <span className="text-gray-600">Analyse en cours...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
          {error}
        </div>
      )}

      {analysis && !isAnalyzing && (
        <div className="space-y-4">
          {/* Scores IA */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Score comportemental</p>
              <p className="text-2xl font-bold text-indigo-600">{analysis.behavioralScore}%</p>
              {getScoreGauge(analysis.behavioralScore)}
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Fiabilité</p>
              <p className="text-2xl font-bold text-blue-600">{analysis.reliabilityIndex}%</p>
              {getScoreGauge(analysis.reliabilityIndex)}
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Consistance</p>
              <p className="text-2xl font-bold text-purple-600">{analysis.consistencyScore}%</p>
              {getScoreGauge(analysis.consistencyScore)}
            </div>
          </div>

          {/* Prédictions */}
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FontAwesomeIcon icon={faChartLine} className="mr-2 text-indigo-600" />
              Prédictions
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Performance prévue</p>
                <p className="text-xl font-bold">{analysis.predictedPerformance}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Niveau de risque</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(analysis.riskLevel)}`}>
                  {analysis.riskLevel === 'LOW' ? 'Faible' : analysis.riskLevel === 'MEDIUM' ? 'Moyen' : 'Élevé'}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Risque de départ</p>
                <p className={`text-xl font-bold ${
                  analysis.attritionRisk > 50 ? 'text-red-600' : analysis.attritionRisk > 30 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {analysis.attritionRisk}%
                </p>
              </div>
            </div>
          </div>

          {/* Forces et faiblesses */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-green-700 mb-2 flex items-center">
                <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
                Points forts
              </h4>
              <ul className="space-y-1">
                {analysis.strengths.map((strength: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-orange-700 mb-2 flex items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                Axes d'amélioration
              </h4>
              <ul className="space-y-1">
                {analysis.weaknesses.map((weakness: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    {weakness}
                  </li>
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
              {analysis.recommendations.map((rec: string, i: number) => (
                <li key={i} className="text-sm text-gray-700 flex items-start">
                  <span className="text-indigo-600 mr-2">→</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* Anomalies détectées */}
          {analysis.anomalies && analysis.anomalies.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2 flex items-center">
                <FontAwesomeIcon icon={faWarning} className="mr-2" />
                Anomalies détectées
              </h4>
              <div className="space-y-2">
                {analysis.anomalies.map((anomaly: any, i: number) => (
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
  );
}
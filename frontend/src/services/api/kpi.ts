// src/services/api/kpi.ts
import { apiClient } from './client';

// ============================================================
// INTERFACES DE BASE
// ============================================================

export interface AgentKPI {
  agentId: number;
  agentName: string;
  period: { start: string; end: string };
  
  // Ponctualité
  punctualityRate: number;        // % de pointages à l'heure
  averageCheckInDelay: number;    // retard moyen en minutes
  
  // Présence
  presenceRate: number;           // % de jours présents / jours attendus
  totalPresences: number;
  totalAbsences: number;
  
  // Qualité
  photoQualityScore: number;      // score moyen des photos (0-100)
  gpsAccuracyScore: number;       // précision GPS moyenne
  validationRate: number;         // % de présences validées sans rejet
  
  // Incidents
  incidentsReported: number;      // nombre d'incidents signalés
  incidentsResolved: number;      // nombre d'incidents résolus
  
  // Score global
  overallScore: number;           // score pondéré (0-100)
  rank: number;                   // classement
  trend: 'up' | 'down' | 'stable'; // tendance vs période précédente
}

export interface ControllerKPI {
  controllerId: number;
  controllerName: string;
  period: { start: string; end: string };
  
  // Activité
  totalRounds: number;
  totalSitesVisited: number;
  averageSitesPerRound: number;
  
  // Qualité de validation
  presencesValidated: number;
  presencesRejected: number;
  validationAccuracy: number;     // % de validations sans litige
  
  // Réactivité
  averageValidationDelay: number; // délai moyen de validation (heures)
  
  // Litiges
  disputesReceived: number;
  disputesLost: number;           // litiges où le contrôleur avait tort
  
  // Score global
  overallScore: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
}

export interface KPISummary {
  topAgents: AgentKPI[];
  topControllers: ControllerKPI[];
  worstAgents: AgentKPI[];
  worstControllers: ControllerKPI[];
  globalStats: {
    averagePresenceRate: number;
    averagePunctualityRate: number;
    averageValidationAccuracy: number;
    totalIncidents: number;
    totalDisputes: number;
  };
}

// ============================================================
// INTERFACES IA
// ============================================================

export interface AIAnalysisResult {
  // Analyse comportementale
  behavioralScore: number;           // 0-100
  reliabilityIndex: number;          // 0-100
  consistencyScore: number;          // 0-100
  
  // Prédictions
  predictedPerformance: number;      // Score prédit pour le mois suivant
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  attritionRisk: number;             // Risque de départ (0-100)
  
  // Insights
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Anomalies détectées
  anomalies: {
    type: 'UNUSUAL_PATTERN' | 'SUSPICIOUS_ACTIVITY' | 'PERFORMANCE_DROP' | 'BEHAVIOR_CHANGE';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    detectedAt: string;
  }[];
}

export interface EnhancedAgentKPI extends AgentKPI {
  aiAnalysis?: AIAnalysisResult;
}

export interface EnhancedControllerKPI extends ControllerKPI {
  aiAnalysis?: AIAnalysisResult;
}

export interface AIGlobalInsights {
  teamPerformance: number;
  teamTrend: 'up' | 'down' | 'stable';
  topPerformers: {
    id: number;
    name: string;
    role: 'agent' | 'controller';
    score: number;
    strengths: string[];
  }[];
  atRiskMembers: {
    id: number;
    name: string;
    role: 'agent' | 'controller';
    riskLevel: string;
    riskScore: number;
    recommendations: string[];
  }[];
  anomaliesSummary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  teamRecommendations: string[];
  generatedAt: string;
}

export interface AIProvider {
  id: string;
  name: string;
  enabled: boolean;
  model?: string;
}

export interface AIAnalysisConfig {
  provider: string;
  enableBehavioralAnalysis: boolean;
  enablePredictions: boolean;
  enableAnomalyDetection: boolean;
  minimumConfidence: number;
  autoAnalyze: boolean;
}

// ============================================================
// INTERFACES POUR LES RETOURS DE MÉTHODES SPÉCIFIQUES
// ============================================================

export interface PeriodComparisonResult {
  teamPerformanceChange: number;
  individualChanges: {
    id: number;
    name: string;
    role: string;
    change: number;
  }[];
  insights: string[];
}

export interface FuturePerformancePrediction {
  predictions: {
    month: string;
    predictedScore: number;
    confidence: number;
  }[];
  factors: {
    name: string;
    impact: number;
    description: string;
  }[];
}

export interface ExecutiveSummary {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface AIProviderTestResult {
  success: boolean;
  message: string;
  latency?: number;
}

// ============================================================
// SERVICE KPI ÉTENDU
// ============================================================

export const kpiService = {
  // ============================================================
  // MÉTHODES DE BASE
  // ============================================================

  async getAgentKPI(agentId: number, period?: { start: string; end: string }): Promise<AgentKPI | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<AgentKPI>(`/kpi/agents/${agentId}${query}`);
    return response.data || null;
  },

  async getAllAgentsKPI(period?: { start: string; end: string }): Promise<AgentKPI[]> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<AgentKPI[]>(`/kpi/agents${query}`);
    return response.data || [];
  },

  async getControllerKPI(controllerId: number, period?: { start: string; end: string }): Promise<ControllerKPI | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<ControllerKPI>(`/kpi/controllers/${controllerId}${query}`);
    return response.data || null;
  },

  async getAllControllersKPI(period?: { start: string; end: string }): Promise<ControllerKPI[]> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<ControllerKPI[]>(`/kpi/controllers${query}`);
    return response.data || [];
  },

  async getSummary(period?: { start: string; end: string }): Promise<KPISummary | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<KPISummary>(`/kpi/summary${query}`);
    return response.data || null;
  },

  async downloadReport(
    type: 'agents' | 'controllers' | 'full', 
    format: 'pdf' | 'excel', 
    period?: { start: string; end: string }
  ): Promise<Blob> {
    const params = new URLSearchParams({ type, format });
    if (period) {
      params.append('start', period.start);
      params.append('end', period.end);
    }
    const response = await fetch(`${apiClient.getCurrentApiUrl()}/kpi/report?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
    });
    return response.blob();
  },

  // ============================================================
  // MÉTHODES IA - AGENTS
  // ============================================================

  async analyzeAgentWithAI(
    agentId: number, 
    period?: { start: string; end: string },
    options?: { forceRefresh?: boolean }
  ): Promise<AIAnalysisResult | null> {
    const params = new URLSearchParams();
    if (period) {
      params.append('start', period.start);
      params.append('end', period.end);
    }
    if (options?.forceRefresh) {
      params.append('force', 'true');
    }
    const query = params.toString();
    const response = await apiClient.post<AIAnalysisResult>(
      `/kpi/agents/${agentId}/analyze${query ? `?${query}` : ''}`
    );
    return response.data || null;
  },

  async getEnhancedAgentKPI(
    agentId: number, 
    period?: { start: string; end: string }
  ): Promise<EnhancedAgentKPI | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<EnhancedAgentKPI>(`/kpi/agents/${agentId}/enhanced${query}`);
    return response.data || null;
  },

  async getAllEnhancedAgentsKPI(period?: { start: string; end: string }): Promise<EnhancedAgentKPI[]> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<EnhancedAgentKPI[]>(`/kpi/agents/enhanced${query}`);
    return response.data || [];
  },

  // ============================================================
  // MÉTHODES IA - CONTRÔLEURS
  // ============================================================

  async analyzeControllerWithAI(
    controllerId: number, 
    period?: { start: string; end: string },
    options?: { forceRefresh?: boolean }
  ): Promise<AIAnalysisResult | null> {
    const params = new URLSearchParams();
    if (period) {
      params.append('start', period.start);
      params.append('end', period.end);
    }
    if (options?.forceRefresh) {
      params.append('force', 'true');
    }
    const query = params.toString();
    const response = await apiClient.post<AIAnalysisResult>(
      `/kpi/controllers/${controllerId}/analyze${query ? `?${query}` : ''}`
    );
    return response.data || null;
  },

  async getEnhancedControllerKPI(
    controllerId: number, 
    period?: { start: string; end: string }
  ): Promise<EnhancedControllerKPI | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<EnhancedControllerKPI>(`/kpi/controllers/${controllerId}/enhanced${query}`);
    return response.data || null;
  },

  async getAllEnhancedControllersKPI(period?: { start: string; end: string }): Promise<EnhancedControllerKPI[]> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<EnhancedControllerKPI[]>(`/kpi/controllers/enhanced${query}`);
    return response.data || [];
  },

  // ============================================================
  // MÉTHODES IA - GLOBALES
  // ============================================================

  async getAIGlobalInsights(period?: { start: string; end: string }): Promise<AIGlobalInsights | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.get<AIGlobalInsights>(`/kpi/ai-insights${query}`);
    return response.data || null;
  },

  async comparePeriodsWithAI(
    period1: { start: string; end: string },
    period2: { start: string; end: string }
  ): Promise<PeriodComparisonResult | null> {
    const params = new URLSearchParams({
      start1: period1.start, end1: period1.end,
      start2: period2.start, end2: period2.end,
    });
    const response = await apiClient.get<PeriodComparisonResult>(`/kpi/compare-ai?${params}`);
    return response.data || null;
  },

  async predictFuturePerformance(
    entityType: 'agent' | 'controller' | 'team',
    entityId?: number,
    forecastMonths: number = 1
  ): Promise<FuturePerformancePrediction | null> {
    const params = new URLSearchParams({
      type: entityType,
      ...(entityId && { id: entityId.toString() }),
      months: forecastMonths.toString(),
    });
    const response = await apiClient.get<FuturePerformancePrediction>(`/kpi/predict?${params}`);
    return response.data || null;
  },

  // ============================================================
  // MÉTHODES DE CONFIGURATION IA
  // ============================================================

  async getAIProviders(): Promise<AIProvider[]> {
    const response = await apiClient.get<AIProvider[]>('/kpi/ai/providers');
    return response.data || [];
  },

  async getAIConfig(): Promise<AIAnalysisConfig | null> {
    const response = await apiClient.get<AIAnalysisConfig>('/kpi/ai/config');
    return response.data || null;
  },

  async updateAIConfig(config: Partial<AIAnalysisConfig>): Promise<AIAnalysisConfig | null> {
    const response = await apiClient.put<AIAnalysisConfig>('/kpi/ai/config', config);
    return response.data || null;
  },

  async testAIProvider(provider: string, apiKey?: string): Promise<AIProviderTestResult> {
    const response = await apiClient.post<AIProviderTestResult>('/kpi/ai/test', {
      provider,
      apiKey,
    });
    return response.data || { success: false, message: 'Erreur de connexion' };
  },

  // ============================================================
  // MÉTHODES D'EXPORT IA
  // ============================================================

  async downloadAIReport(
    type: 'agent' | 'controller' | 'team',
    entityId?: number,
    format: 'pdf' | 'excel' = 'pdf',
    period?: { start: string; end: string }
  ): Promise<Blob> {
    const params = new URLSearchParams({ type, format });
    if (entityId) params.append('id', entityId.toString());
    if (period) {
      params.append('start', period.start);
      params.append('end', period.end);
    }
    const response = await fetch(`${apiClient.getCurrentApiUrl()}/kpi/ai-report?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
    });
    return response.blob();
  },

  async generateExecutiveSummary(period?: { start: string; end: string }): Promise<ExecutiveSummary | null> {
    const query = period ? `?start=${period.start}&end=${period.end}` : '';
    const response = await apiClient.post<ExecutiveSummary>(`/kpi/executive-summary${query}`);
    return response.data || null;
  },
};
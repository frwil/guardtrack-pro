import { apiClient } from './client';

export interface ReportPeriod {
  type: 'day' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
}

export interface ReportSummary {
  period: ReportPeriod;
  totalSites: number;
  totalAgents: number;
  totalPresences: number;
  totalAbsences: number;
  totalUnknown: number;
  presenceRate: number;
  generatedAt: string;
}

export interface AgentPresenceRow {
  agentId: number;
  agentName: string;
  siteId: number;
  siteName: string;
  days: Record<string, 1 | 0 | null>; // date ISO -> 1=présent, 0=absent, null=inconnu
  totalPresent: number;
  totalAbsent: number;
  totalUnknown: number;
}

export interface CrossTableReport {
  summary: ReportSummary;
  sites: Array<{
    id: number;
    name: string;
    address: string;
  }>;
  agents: Array<{
    id: number;
    name: string;
  }>;
  matrix: AgentPresenceRow[];
  dates: string[]; // Liste des dates de la période
}

export interface ReportFormat {
  format: 'json' | 'excel' | 'pdf';
  includeDetails: boolean;
}

export const reportsService = {
  /**
   * Récupère les sites visités par le contrôleur (via ses rondes)
   */
  async getMySites(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/reports/my-sites');
    return response.data || [];
  },

  /**
   * Récupère les agents assignés aux sites du contrôleur
   */
  async getMyAgents(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/reports/my-agents');
    return response.data || [];
  },

  /**
   * Génère un résumé statistique pour une période
   */
  async getSummary(period: ReportPeriod): Promise<ReportSummary> {
    const query = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate,
    }).toString();
    const response = await apiClient.get<ReportSummary>(`/reports/summary?${query}`);
    return response.data!;
  },

  /**
   * Génère le tableau croisé (sites/agents x jours)
   */
  async getCrossTable(period: ReportPeriod): Promise<CrossTableReport> {
    const query = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate,
    }).toString();
    const response = await apiClient.get<CrossTableReport>(`/reports/cross-table?${query}`);
    return response.data!;
  },

  /**
   * Télécharge le rapport au format demandé
   */
  async downloadReport(period: ReportPeriod, format: 'excel' | 'pdf'): Promise<Blob> {
    const query = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate,
      format,
    }).toString();
    
    const response = await fetch(`${apiClient.getCurrentApiUrl()}/reports/download?${query}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du téléchargement');
    }
    
    return response.blob();
  },

  /**
   * Récupère les statistiques quotidiennes pour un graphique
   */
  async getDailyStats(period: ReportPeriod): Promise<any[]> {
    const query = new URLSearchParams({
      startDate: period.startDate,
      endDate: period.endDate,
    }).toString();
    const response = await apiClient.get<any[]>(`/reports/daily-stats?${query}`);
    return response.data || [];
  },
};
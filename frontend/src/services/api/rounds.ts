import { apiClient } from './client';

export interface Round {
  id: number;
  name: string;
  agent: { id: number; fullName: string } | null;
  supervisor: { id: number; fullName: string } | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sitesCount: number;
  visitedSitesCount: number;
  validatedSitesCount?: number;
  progress?: number;
  sites?: RoundSite[];
}

export interface RoundSite {
  id: number;
  site: {
    id: number;
    name: string;
    address: string;
    latitude: string | null;
    longitude: string | null;
    qrCode: string | null;
    geofencingRadius: number;
  };
  visitOrder: number;
  visitedAt: string | null;
  gpsLatitude: string | null;
  gpsLongitude: string | null;
  photo: string | null;
  qrCodeScanned: boolean;
  pinEntered: boolean;
  agentPresenceStatus: 'PRESENT' | 'ABSENT' | null;
  absenceReason: string | null;
  comments: string | null;
  photoAnalysis: any | null;
  distanceFromSite: number | null;
  isValidated: boolean;
  validatedAt: string | null;
  hasPhoto: boolean;
  isComplete: boolean;
}

export interface ControllerVisitData {
  agentPresenceStatus: 'PRESENT' | 'ABSENT';
  gpsLatitude?: number;
  gpsLongitude?: number;
  photo?: string;
  qrCodeScanned?: boolean;
  pinEntered?: boolean;
  absenceReason?: string;
  comments?: string;
  photoAnalysis?: any;
  distanceFromSite?: number;
}

export interface CreateRoundData {
  name: string;
  agentId?: number;
  scheduledStart: string;
  scheduledEnd?: string;
  supervisorId?: number;
  sites: { id: number }[];
}

export const roundsService = {
  // ============================================================
  // ROUTES GÉNÉRALES
  // ============================================================

  async list(params?: { agentId?: number; status?: string; date?: string }): Promise<Round[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Round[]>(`/rounds${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getActive(): Promise<Round[]> {
    const response = await apiClient.get<Round[]>('/rounds/active');
    return response.data || [];
  },

  async getById(id: number): Promise<Round | null> {
    const response = await apiClient.get<Round>(`/rounds/${id}`);
    return response.data || null;
  },

  async create(data: CreateRoundData): Promise<{ id: number; name: string; agent?: { id: number; fullName: string }; sitesCount?: number } | null> {
    const response = await apiClient.post<{ id: number; name: string; agent?: { id: number; fullName: string }; sitesCount?: number }>('/rounds', data);
    return response.data || null;
  },

  async cancel(id: number): Promise<{ status: string } | null> {
    const response = await apiClient.patch<{ status: string }>(`/rounds/${id}/cancel`);
    return response.data || null;
  },

  // ============================================================
  // ROUTES AGENT
  // ============================================================

  async getMyRounds(): Promise<Round[]> {
    const response = await apiClient.get<Round[]>('/rounds/my');
    return response.data || [];
  },

  async getToday(): Promise<Round[]> {
    const response = await apiClient.get<Round[]>('/rounds/today');
    return response.data || [];
  },

  async start(id: number): Promise<{ status: string; actualStart: string } | null> {
    const response = await apiClient.patch<{ status: string; actualStart: string }>(`/rounds/${id}/start`);
    return response.data || null;
  },

  async visitSite(
    roundId: number, 
    siteId: number, 
    data: { 
      latitude?: number; 
      longitude?: number; 
      photo?: string; 
      qrCode?: string; 
      pin?: string; 
      requireQrScan?: boolean; 
      requirePin?: boolean; 
      skipOrder?: boolean 
    }
  ): Promise<any> {
    const response = await apiClient.post(`/rounds/${roundId}/sites/${siteId}/visit`, data);
    return response.data;
  },

  async complete(id: number): Promise<{ status: string; actualEnd: string } | null> {
    const response = await apiClient.patch<{ status: string; actualEnd: string }>(`/rounds/${id}/complete`);
    return response.data || null;
  },

  // ============================================================
  // ROUTES CONTRÔLEUR
  // ============================================================

  async getMyPlanned(): Promise<Round[]> {
    const response = await apiClient.get<Round[]>('/rounds/my-planned');
    return response.data || [];
  },

  async getPendingValidation(): Promise<Round[]> {
    const response = await apiClient.get<Round[]>('/rounds/pending-validation');
    return response.data || [];
  },

  async startAsController(id: number): Promise<{ status: string; actualStart: string } | null> {
    const response = await apiClient.patch<{ status: string; actualStart: string }>(`/rounds/${id}/start-controller`);
    return response.data || null;
  },

  // ✅ Nouvelle méthode : Clôturer une tournée
  async closeRound(id: number): Promise<{ status: string; actualEnd: string; autoClosed: boolean } | null> {
    const response = await apiClient.patch<{ status: string; actualEnd: string; autoClosed: boolean }>(`/rounds/${id}/close`);
    return response.data || null;
  },

  // ✅ Nouvelle méthode : Ajouter des sites à une tournée
  async addSites(roundId: number, siteIds: number[]): Promise<{ message: string; addedSites: any[]; totalSites: number } | null> {
    const response = await apiClient.post<{ message: string; addedSites: any[]; totalSites: number }>(
      `/rounds/${roundId}/add-sites`,
      { siteIds }
    );
    return response.data || null;
  },

  async controllerVisitSite(
    roundId: number, 
    siteId: number, 
    data: ControllerVisitData
  ): Promise<{ success: boolean; roundSite: RoundSite; allSitesVisited: boolean } | null> {
    // Nettoyer les données : ne garder que les champs définis
    const cleanData: Record<string, any> = {
      agentPresenceStatus: data.agentPresenceStatus,
    };
    
    if (data.gpsLatitude !== undefined) cleanData.gpsLatitude = data.gpsLatitude;
    if (data.gpsLongitude !== undefined) cleanData.gpsLongitude = data.gpsLongitude;
    if (data.photo !== undefined) cleanData.photo = data.photo;
    if (data.qrCodeScanned !== undefined) cleanData.qrCodeScanned = data.qrCodeScanned;
    if (data.pinEntered !== undefined) cleanData.pinEntered = data.pinEntered;
    if (data.absenceReason !== undefined) cleanData.absenceReason = data.absenceReason;
    if (data.comments !== undefined) cleanData.comments = data.comments;
    if (data.photoAnalysis !== undefined) cleanData.photoAnalysis = data.photoAnalysis;
    if (data.distanceFromSite !== undefined) cleanData.distanceFromSite = data.distanceFromSite;

    const response = await apiClient.post<{ success: boolean; roundSite: RoundSite; allSitesVisited: boolean }>(
      `/rounds/${roundId}/sites/${siteId}/controller-visit`, 
      cleanData
    );
    return response.data || null;
  },

  async validateSite(roundId: number, siteId: number): Promise<{ validated: boolean } | null> {
    const response = await apiClient.patch<{ validated: boolean }>(`/rounds/${roundId}/sites/${siteId}/validate`);
    return response.data || null;
  },

  async rejectSite(roundId: number, siteId: number, reason?: string): Promise<{ rejected: boolean } | null> {
    const response = await apiClient.patch<{ rejected: boolean }>(
      `/rounds/${roundId}/sites/${siteId}/reject`, 
      reason ? { reason } : {}
    );
    return response.data || null;
  },

  async validateAll(id: number): Promise<{ validated: boolean; validatedCount: number } | null> {
    const response = await apiClient.patch<{ validated: boolean; validatedCount: number }>(`/rounds/${id}/validate-all`);
    return response.data || null;
  },
};
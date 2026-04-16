import { apiClient } from './client';

export interface Presence {
  id: number;
  agent: { id: number; fullName: string };
  site: { 
    id: number; 
    name: string;
    address?: string; // ✅ Ajouté
  };
  checkIn: string;
  checkOut: string | null;
  status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'DISPUTED';
  hasPhoto: boolean;
  photo?: string; // ✅ Ajouté
  gpsLatitude?: string;
  gpsLongitude?: string;
  suspicionScore?: number;
  validator?: { id: number; fullName: string };
  validationDate?: string;
  rejectionReason?: string;
  // Champs pour les litiges
  controllerVerdict?: 'PRESENT' | 'ABSENT' | null;
  controller?: { id: number; fullName: string } | null;
  controllerComment?: string;
  controllerPhotoAnalysis?: any;
  controllerDistanceFromSite?: number;
}

export const presencesService = {
  async list(params?: { agentId?: number; siteId?: number; status?: string; date?: string; limit?: number }): Promise<Presence[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Presence[]>(`/presences${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getPending(): Promise<Presence[]> {
    const response = await apiClient.get<Presence[]>('/presences/pending');
    return response.data || [];
  },

  async getMyPresences(limit?: number): Promise<Presence[]> {
    const query = limit ? `?limit=${limit}` : '';
    const response = await apiClient.get<Presence[]>(`/presences/my${query}`);
    return response.data || [];
  },

  async getToday(): Promise<Presence[]> {
    const response = await apiClient.get<Presence[]>('/presences/today');
    return response.data || [];
  },

  async getById(id: number): Promise<Presence | null> {
    const response = await apiClient.get<Presence>(`/presences/${id}`);
    return response.data || null;
  },

  async checkIn(data: { siteId: number; latitude?: number; longitude?: number; photo?: string }): Promise<{ id: number; checkIn: string; suspicionScore: number } | null> {
    const response = await apiClient.post<{ id: number; checkIn: string; suspicionScore: number }>('/presences/check-in', data);
    return response.data || null;
  },

  async checkOut(id: number, data?: { latitude?: number; longitude?: number }): Promise<{ checkOut: string } | null> {
    const response = await apiClient.patch<{ checkOut: string }>(`/presences/${id}/check-out`, data);
    return response.data || null;
  },

  async validate(id: number): Promise<{ status: string } | null> {
    const response = await apiClient.patch<{ status: string }>(`/presences/${id}/validate`);
    return response.data || null;
  },

  async reject(id: number, reason?: string): Promise<{ status: string } | null> {
    const response = await apiClient.patch<{ status: string }>(`/presences/${id}/reject`, { reason });
    return response.data || null;
  },
};
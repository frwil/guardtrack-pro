import { apiClient } from './client';

export interface Incident {
  id: number;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  reporter: { id: number; fullName: string };
  site: { id: number; name: string };
  reportedAt: string;
  assignedTo: { id: number; fullName: string } | null;
  hasPhotos: boolean;
  description?: string;
  photos?: string[];
  witnesses?: string[];
  resolution?: string;
  resolvedAt?: string;
}

export const incidentsService = {
  async list(params?: { siteId?: number; status?: string; severity?: string; category?: string }): Promise<Incident[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Incident[]>(`/incidents${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getOpen(): Promise<Incident[]> {
    const response = await apiClient.get<Incident[]>('/incidents/open');
    return response.data || [];
  },

  async getMyIncidents(): Promise<Incident[]> {
    const response = await apiClient.get<Incident[]>('/incidents/my');
    return response.data || [];
  },

  async getAssigned(): Promise<Incident[]> {
    const response = await apiClient.get<Incident[]>('/incidents/assigned');
    return response.data || [];
  },

  async getById(id: number): Promise<Incident | null> {
    const response = await apiClient.get<Incident>(`/incidents/${id}`);
    return response.data || null;
  },

  async create(data: { title: string; description: string; category: string; severity?: string; siteId: number; photos?: string[]; witnesses?: string[] }): Promise<{ id: number; title: string; status: string } | null> {
    const response = await apiClient.post<{ id: number; title: string; status: string }>('/incidents', data);
    return response.data || null;
  },

  async update(id: number, data: Partial<Incident>): Promise<{ message: string } | null> {
    const response = await apiClient.put<{ message: string }>(`/incidents/${id}`, data);
    return response.data || null;
  },

  async assign(id: number, userId: number | null): Promise<{ assignedTo: any; status: string } | null> {
    const response = await apiClient.patch<{ assignedTo: any; status: string }>(`/incidents/${id}/assign`, { userId });
    return response.data || null;
  },

  async resolve(id: number, resolution?: string): Promise<{ status: string; resolvedAt: string } | null> {
    const response = await apiClient.patch<{ status: string; resolvedAt: string }>(`/incidents/${id}/resolve`, { resolution });
    return response.data || null;
  },

  async escalate(id: number): Promise<{ severity: string } | null> {
    const response = await apiClient.patch<{ severity: string }>(`/incidents/${id}/escalate`);
    return response.data || null;
  },

  async close(id: number): Promise<{ status: string } | null> {
    const response = await apiClient.patch<{ status: string }>(`/incidents/${id}/close`);
    return response.data || null;
  },

  async getCategories(): Promise<{ categories: string[]; severities: string[] } | null> {
    const response = await apiClient.get<{ categories: string[]; severities: string[] }>('/incidents/categories');
    return response.data || null;
  },
};
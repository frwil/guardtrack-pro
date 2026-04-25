import { apiClient } from "./client";

export interface Site {
  id: number;
  name: string;
  client: { id: number; name: string };
  parent?: { id: number; name: string } | null;
  type: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  qrCode: string | null;
  geofencingRadius: number;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedReason?: string;
  createdAt: string;
}

export interface CreateSiteData {
  name: string;
  clientId: number;
  type: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  geofencingRadius?: number;
  parentId?: number | null;
  isActive?: boolean;
}

export interface UpdateSiteData {
  name?: string;
  type?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofencingRadius?: number;
  parentId?: number | null;
  isActive?: boolean;
}

export interface ArchiveCheckResult {
  canArchive: boolean;
  reasons: string[];
  stats: {
    totalPresences: number;
    totalAssignments: number;
    totalRounds: number;
    totalIncidents: number;
    activeAssignments: number;
  };
}

export interface ArchiveHistory {
  archivedAt: string;
  archivedBy: {
    id: number;
    name: string;
  };
  reason: string;
  stats: ArchiveCheckResult['stats'];
}

export const sitesService = {
  async list(params?: {
    clientId?: number;
    type?: string;
    isActive?: boolean;
    isArchived?: boolean;
    limit?: number;
  }): Promise<Site[]> {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    const response = await apiClient.get<Site[]>(
      `/sites${query ? `?${query}` : ""}`,
    );
    return response.data || [];
  },

  async getById(id: number): Promise<Site | null> {
    const response = await apiClient.get<Site>(`/sites/${id}`);
    return response.data || null;
  },

  async getByQrCode(
    qrCode: string,
  ): Promise<(Site & { isAssigned: boolean }) | null> {
    const response = await apiClient.get<Site & { isAssigned: boolean }>(
      `/sites/qr/${qrCode}`,
    );
    return response.data || null;
  },

  async create(data: CreateSiteData): Promise<Site | null> {
    const response = await apiClient.post<Site>("/sites", data);
    return response.data || null;
  },

  async update(
    id: number,
    data: UpdateSiteData,
  ): Promise<{ message: string } | null> {
    const response = await apiClient.put<{ message: string }>(
      `/sites/${id}`,
      data,
    );
    return response.data || null;
  },

  async delete(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.delete<{ message: string }>(`/sites/${id}`);
    return response.data || null;
  },

  async regenerateQr(id: number): Promise<{ qrCode: string } | null> {
    const response = await apiClient.post<{ qrCode: string }>(
      `/sites/${id}/qr`,
    );
    return response.data || null;
  },

  async toggleActive(id: number): Promise<{ isActive: boolean } | null> {
    const response = await apiClient.patch<{ isActive: boolean }>(
      `/sites/${id}/toggle`,
    );
    return response.data || null;
  },

  async getAssignments(id: number): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/sites/${id}/assignments`);
    return response.data || [];
  },

  async getChildren(id: number): Promise<Site[]> {
    const response = await apiClient.get<Site[]>(`/sites/${id}/children`);
    return response.data || [];
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    archived: number;
    byType: Record<string, number>;
    byClient: Record<string, number>;
  } | null> {
    const response = await apiClient.get<{
      total: number;
      active: number;
      inactive: number;
      archived: number;
      byType: Record<string, number>;
      byClient: Record<string, number>;
    }>('/sites/stats');
    return response.data || null;
  },

  // ============================================================
  // MÉTHODES D'ARCHIVAGE
  // ============================================================

  async canArchive(id: number): Promise<ArchiveCheckResult> {
    const response = await apiClient.get<ArchiveCheckResult>(`/sites/${id}/can-archive`);
    return response.data || { 
      canArchive: false, 
      reasons: ['Erreur de vérification'], 
      stats: { 
        totalPresences: 0, 
        totalAssignments: 0, 
        totalRounds: 0, 
        totalIncidents: 0,
        activeAssignments: 0
      } 
    };
  },

  async archive(id: number, reason?: string): Promise<{ message: string; archivedAt: string } | null> {
    const response = await apiClient.post<{ message: string; archivedAt: string }>(
      `/sites/${id}/archive`,
      { reason }
    );
    return response.data || null;
  },

  async restore(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.post<{ message: string }>(`/sites/${id}/restore`);
    return response.data || null;
  },

  async listArchived(params?: { 
    clientId?: number; 
    type?: string;
  }): Promise<Site[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Site[]>(`/sites/archived${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async hardDelete(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.delete<{ message: string }>(`/sites/${id}/permanent`);
    return response.data || null;
  },

  async getArchiveHistory(id: number): Promise<ArchiveHistory | null> {
    const response = await apiClient.get<ArchiveHistory>(`/sites/${id}/archive-history`);
    return response.data || null;
  },
};
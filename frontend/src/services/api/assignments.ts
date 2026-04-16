import { apiClient } from './client';

export interface Assignment {
  id: number;
  agent: { 
    id: number; 
    fullName: string;
    email?: string;
    phone?: string;
  };
  site: {
    id: number;
    name: string;
    address: string;
    latitude: string | null;
    longitude: string | null;
    geofencingRadius: number;
    client?: { id: number; name: string };
  };
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REPLACED';
  startDate: string;
  endDate: string | null;
  replaces: { 
    id: number; 
    agent: { fullName: string } 
  } | null;
  createdAt: string;
  presencesCount?: number;
}

export interface AssignmentListItem {
  id: number;
  agent: { id: number; fullName: string };
  site: { id: number; name: string };
  status: string;
  startDate: string;
  endDate: string | null;
  replaces: { id: number; agent: { fullName: string } } | null;
}

export const assignmentsService = {
  async list(params?: { 
    agentId?: number; 
    siteId?: number; 
    status?: string;
    from?: string;
  }): Promise<AssignmentListItem[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<AssignmentListItem[]>(`/assignments${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getActive(): Promise<AssignmentListItem[]> {
    const response = await apiClient.get<AssignmentListItem[]>('/assignments/active');
    return response.data || [];
  },

  async getMyAssignments(): Promise<Assignment[]> {
    const response = await apiClient.get<Assignment[]>('/assignments/my');
    return response.data || [];
  },

  async getById(id: number): Promise<Assignment | null> {
    const response = await apiClient.get<Assignment>(`/assignments/${id}`);
    return response.data || null;
  },

  async create(data: { 
    agentId: number; 
    siteId: number; 
    startDate: string; 
    endDate?: string; 
    status?: string;
    replacesId?: number;
  }): Promise<{ id: number; message: string } | null> {
    const response = await apiClient.post<{ id: number; message: string }>('/assignments', data);
    return response.data || null;
  },

  async update(id: number, data: Partial<{ 
    status: string; 
    endDate: string;
    startDate: string;
  }>): Promise<{ message: string } | null> {
    const response = await apiClient.put<{ message: string }>(`/assignments/${id}`, data);
    return response.data || null;
  },

  async cancel(id: number): Promise<{ message: string; status: string } | null> {
    const response = await apiClient.patch<{ message: string; status: string }>(`/assignments/${id}/cancel`);
    return response.data || null;
  },

  async complete(id: number): Promise<{ message: string; status: string } | null> {
    const response = await apiClient.patch<{ message: string; status: string }>(`/assignments/${id}/complete`);
    return response.data || null;
  },

  async reactivate(id: number): Promise<{ message: string; status: string } | null> {
    const response = await apiClient.patch<{ message: string; status: string }>(`/assignments/${id}/reactivate`);
    return response.data || null;
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    completed: number;
    cancelled: number;
  } | null> {
    const response = await apiClient.get<{
      total: number;
      active: number;
      pending: number;
      completed: number;
      cancelled: number;
    }>('/assignments/stats');
    return response.data || null;
  },
};
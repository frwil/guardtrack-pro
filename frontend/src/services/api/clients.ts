import { apiClient } from './client';

export interface Client {
  id: number;
  name: string;
  siret: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  billingRate: string;
  isActive: boolean;
  createdAt: string;
  sitesCount?: number;
}

export const clientsService = {
  async list(params?: { isActive?: boolean }): Promise<Client[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Client[]>(`/clients${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getById(id: number): Promise<Client | null> {
    const response = await apiClient.get<Client>(`/clients/${id}`);
    return response.data || null;
  },

  async create(data: Partial<Client>): Promise<Client | null> {
    const response = await apiClient.post<Client>('/clients', data);
    return response.data || null;
  },

  async update(id: number, data: Partial<Client>): Promise<{ message: string } | null> {
    const response = await apiClient.put<{ message: string }>(`/clients/${id}`, data);
    return response.data || null;
  },

  async toggleActive(id: number): Promise<{ isActive: boolean } | null> {
    const response = await apiClient.patch<{ isActive: boolean }>(`/clients/${id}/toggle`);
    return response.data || null;
  },

  async getSites(id: number): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/clients/${id}/sites`);
    return response.data || [];
  },
};
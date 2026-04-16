import { apiClient } from "./client";
import { User } from "../../types";

export const usersService = {
  async list(params?: {
    role?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<User[]> {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    const response = await apiClient.get<User[]>(
      `/users${query ? `?${query}` : ""}`,
    );
    return response.data || [];
  },

  async getAgents(): Promise<User[]> {
    const response = await apiClient.get<User[]>("/users/agents");
    return response.data || [];
  },

  async getControleurs(): Promise<User[]> {
    const response = await apiClient.get<User[]>("/users/controleurs");
    return response.data || [];
  },

  async getSuperviseurs(): Promise<User[]> {
    const response = await apiClient.get<User[]>("/users/superviseurs");
    return response.data || [];
  },

  async getMe(): Promise<User | null> {
    const response = await apiClient.get<User>("/users/me");
    return response.data || null;
  },

  async getById(id: number): Promise<User | null> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data || null;
  },

  async create(
    data: Partial<User> & { password: string },
  ): Promise<User | null> {
    const response = await apiClient.post<User>("/users", data);
    return response.data || null;
  },

  async update(id: number, data: Partial<User>): Promise<User | null> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data || null;
  },

  async toggleActive(id: number): Promise<{ isActive: boolean } | null> {
    const response = await apiClient.patch<{ isActive: boolean }>(
      `/users/${id}/toggle`,
    );
    return response.data || null;
  },

  async delete(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.delete<{ message: string }>(
      `/users/${id}`,
    );
    return response.data || null;
  },

  async getAssignments(id: number): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/users/${id}/assignments`);
    return response.data || [];
  },

  async getPresences(id: number, limit?: number): Promise<any[]> {
    const query = limit ? `?limit=${limit}` : "";
    const response = await apiClient.get<any[]>(
      `/users/${id}/presences${query}`,
    );
    return response.data || [];
  },
};

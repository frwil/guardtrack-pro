// src/services/api/conflict.ts
import { apiClient } from './client';
import { SyncOperation } from '../storage/db';

export interface ConflictReport {
  id?: number;
  operationId: number;
  operation: SyncOperation;
  conflictType: 'TIME_DRIFT' | 'FUTURE_OPERATION' | 'PAST_OPERATION' | 'FRAUD_SUSPICION' | 'VALIDATION_FAILED';
  reason: string;
  clientData: any;
  serverState?: any;
  resolution?: 'AUTO_RESOLVED' | 'MANUAL_APPROVED' | 'MANUAL_REJECTED' | 'PENDING';
  resolvedBy?: { id: number; email: string };
  resolvedAt?: string;
  resolutionNote?: string;
  developerNotes?: string;
  createdAt: string;
  syncedToServer: boolean;
}

export interface ConflictStats {
  total: number;
  pending: number;
  resolved: number;
  byType: Record<string, number>;
  byResolution: Record<string, number>;
}

export const conflictService = {
  /**
   * Envoie un rapport de conflit au serveur
   */
  async report(conflict: Omit<ConflictReport, 'id' | 'createdAt' | 'syncedToServer'>): Promise<ConflictReport | null> {
    const response = await apiClient.post<ConflictReport>('/conflicts', conflict);
    return response.data || null;
  },

  /**
   * Envoie plusieurs rapports de conflit (batch)
   */
  async reportBatch(conflicts: Omit<ConflictReport, 'id' | 'createdAt' | 'syncedToServer'>[]): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post<{ success: number; failed: number }>('/conflicts/batch', { conflicts });
    return response.data || { success: 0, failed: conflicts.length };
  },

  /**
   * Récupère la liste des conflits
   */
  async list(filters?: {
    conflictType?: string;
    resolution?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: ConflictReport[]; total: number }> {
    const query = new URLSearchParams(filters as Record<string, string>).toString();
    const response = await apiClient.get<{ data: ConflictReport[]; total: number }>(`/conflicts${query ? `?${query}` : ''}`);
    return response.data || { data: [], total: 0 };
  },

  /**
   * Récupère un conflit spécifique
   */
  async getById(id: number): Promise<ConflictReport | null> {
    const response = await apiClient.get<ConflictReport>(`/conflicts/${id}`);
    return response.data || null;
  },

  /**
   * Met à jour la résolution d'un conflit
   */
  async updateResolution(id: number, resolution: string, note?: string, developerNotes?: string): Promise<ConflictReport | null> {
    const response = await apiClient.patch<ConflictReport>(`/conflicts/${id}/resolve`, {
      resolution,
      resolutionNote: note,
      developerNotes,
    });
    return response.data || null;
  },

  /**
   * Supprime un conflit (après résolution et analyse)
   */
  async delete(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.delete<{ message: string }>(`/conflicts/${id}`);
    return response.data || null;
  },

  /**
   * Statistiques des conflits
   */
  async getStats(): Promise<ConflictStats | null> {
    const response = await apiClient.get<ConflictStats>('/conflicts/stats');
    return response.data || null;
  },

  /**
   * Export des conflits
   */
  async export(format: 'json' | 'csv'): Promise<Blob> {
    const response = await fetch(`${apiClient.getCurrentApiUrl()}/conflicts/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
    });
    return response.blob();
  },
};
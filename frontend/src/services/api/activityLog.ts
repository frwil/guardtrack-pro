// src/services/api/activityLog.ts
import { apiClient } from './client';

export interface ActivityLogEntry {
  id?: number;
  userId: number;
  userEmail: string;
  userRole: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage?: string;
}

export type ActivityAction = 
  // Authentification
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PIN_VERIFICATION'
  // CRUD
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT'
  // Actions spécifiques
  | 'CHECK_IN' | 'CHECK_OUT' | 'VALIDATE_PRESENCE' | 'REJECT_PRESENCE'
  | 'START_ROUND' | 'COMPLETE_ROUND' | 'VISIT_SITE'
  | 'CREATE_INCIDENT' | 'RESOLVE_INCIDENT' | 'ESCALATE_INCIDENT'
  | 'ARCHIVE_SITE' | 'RESTORE_SITE'
  | 'SWITCH_AGENTS' | 'ASSIGN_AGENT'
  | 'GENERATE_REPORT' | 'DOWNLOAD_REPORT'
  | 'SYNC_OFFLINE_DATA' | 'RESOLVE_CONFLICT'
  | 'CHANGE_SETTINGS' | 'UPLOAD_LOGO';

export type ActivityEntity = 
  | 'USER' | 'CLIENT' | 'SITE' | 'ASSIGNMENT' 
  | 'PRESENCE' | 'ROUND' | 'INCIDENT' | 'REPORT'
  | 'SETTINGS' | 'SYNC_QUEUE' | 'CONFLICT' | 'AUDIT';

export interface ActivityLogFilters {
  userId?: number;
  userRole?: string;
  action?: ActivityAction;
  entity?: ActivityEntity;
  startDate?: string;
  endDate?: string;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLogStats {
  total: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
  byUser: Array<{ userId: number; userEmail: string; count: number }>;
  byStatus: Record<string, number>;
  byHour: number[];
  byDay: number[];
}

// Fonction utilitaire pour construire les query params
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

export const activityLogService = {
  /**
   * Enregistre une action utilisateur
   */
  async log(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<ActivityLogEntry | null> {
    const enrichedEntry = {
      ...entry,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('session_id') : undefined,
    };
    const response = await apiClient.post<ActivityLogEntry>('/activity-logs', enrichedEntry);
    return response.data || null;
  },

  /**
   * Enregistre une action en mode offline (stockée localement puis synchronisée)
   */
  async logOffline(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<void> {
    // Stocker dans IndexedDB pour synchronisation ultérieure
    if (typeof window !== 'undefined') {
      const { offlineDB } = await import('../storage/db');
      await offlineDB.addToSyncQueue({
        type: 'CREATE',
        entity: 'presence', // Utiliser une entité supportée par le type SyncOperation
        data: {
          _activityLog: true, // Marqueur pour identifier les logs d'activité
          ...entry,
        },
        clientTime: new Date().toISOString(),
        clientTimestamp: Date.now(),
        createdAt: new Date().toISOString(),
      });
    }
  },

  /**
   * Récupère les logs avec filtres
   */
  async list(filters?: ActivityLogFilters): Promise<{ data: ActivityLogEntry[]; total: number }> {
    const query = filters ? buildQueryString(filters) : '';
    const response = await apiClient.get<{ data: ActivityLogEntry[]; total: number }>(`/activity-logs${query ? `?${query}` : ''}`);
    return response.data || { data: [], total: 0 };
  },

  /**
   * Récupère les logs d'un utilisateur spécifique
   */
  async getByUser(userId: number, filters?: ActivityLogFilters): Promise<ActivityLogEntry[]> {
    const query = filters ? buildQueryString(filters) : '';
    const response = await apiClient.get<ActivityLogEntry[]>(`/activity-logs/user/${userId}${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  /**
   * Récupère les logs d'une entité spécifique
   */
  async getByEntity(entity: ActivityEntity, entityId: number): Promise<ActivityLogEntry[]> {
    const response = await apiClient.get<ActivityLogEntry[]>(`/activity-logs/entity/${entity}/${entityId}`);
    return response.data || [];
  },

  /**
   * Statistiques des logs
   */
  async getStats(filters?: { startDate?: string; endDate?: string }): Promise<ActivityLogStats | null> {
    const query = filters ? buildQueryString(filters) : '';
    const response = await apiClient.get<ActivityLogStats>(`/activity-logs/stats${query ? `?${query}` : ''}`);
    return response.data || null;
  },

  /**
   * Export des logs
   */
  async export(format: 'csv' | 'json' | 'pdf', filters?: ActivityLogFilters): Promise<Blob> {
    const params: Record<string, string> = { format };
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params[key] = String(value);
        }
      });
    }
    
    const query = new URLSearchParams(params).toString();
    
    const response = await fetch(`${apiClient.getCurrentApiUrl()}/activity-logs/export?${query}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('guardtrack_token')}` },
    });
    return response.blob();
  },

  /**
   * Génère un identifiant de session unique
   */
  generateSessionId(): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  },
};
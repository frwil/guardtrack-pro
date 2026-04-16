// src/hooks/useActivityLog.ts
import { useCallback } from 'react';
import { activityLogService, ActivityAction, ActivityEntity } from '../services/api/activityLog';
import { useAuthStore } from '../stores/authStore';

export function useActivityLog() {
  const { user } = useAuthStore();

  const log = useCallback(async (
    action: ActivityAction,
    entity: ActivityEntity,
    details: Record<string, any>,
    options?: { entityId?: number; status?: 'SUCCESS' | 'FAILED' | 'PENDING'; errorMessage?: string }
  ) => {
    if (!user) return;

    const entry = {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action,
      entity,
      entityId: options?.entityId,
      details,
      status: options?.status || 'SUCCESS',
      errorMessage: options?.errorMessage,
    };

    try {
      await activityLogService.log(entry);
    } catch (error) {
      // En mode offline, stocker localement
      await activityLogService.logOffline(entry);
    }
  }, [user]);

  const logSuccess = useCallback((
    action: ActivityAction,
    entity: ActivityEntity,
    details: Record<string, any>,
    entityId?: number
  ) => {
    return log(action, entity, details, { entityId, status: 'SUCCESS' });
  }, [log]);

  const logFailure = useCallback((
    action: ActivityAction,
    entity: ActivityEntity,
    details: Record<string, any>,
    error: Error,
    entityId?: number
  ) => {
    return log(action, entity, details, { 
      entityId, 
      status: 'FAILED', 
      errorMessage: error.message 
    });
  }, [log]);

  return { log, logSuccess, logFailure };
}
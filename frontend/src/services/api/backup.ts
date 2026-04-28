import { apiClient } from './client';
import { getToken } from '../storage/token';
import { apiConfig } from './config';

export interface BackupStats {
  users: number;
  clients: number;
  sites: number;
  assignments: number;
  rounds: number;
  incidents: number;
  presences: number;
  timesheets: number;
}

export const backupService = {
  async getStats(): Promise<BackupStats | null> {
    const res = await apiClient.get<BackupStats>('/admin/backup/stats');
    return res.data ?? null;
  },

  async download(): Promise<void> {
    const token = getToken() ?? '';
    const url = `${apiConfig.getApiUrl()}/admin/backup`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
    });

    if (!res.ok) throw new Error('Échec du téléchargement');

    const blob = await res.blob();
    const filename = res.headers.get('Content-Disposition')
      ?.match(/filename="(.+)"/)?.[1]
      ?? `guardtrack-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

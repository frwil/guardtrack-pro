import { apiClient } from './client';

export interface Notification {
  id: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'DANGER' | 'CRITICAL';
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export const notificationsService = {
  async list(params?: { unread?: boolean; limit?: number }): Promise<{ unreadCount: number; notifications: Notification[] }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<{ unreadCount: number; notifications: Notification[] }>(`/notifications${query ? `?${query}` : ''}`);
    return response.data || { unreadCount: 0, notifications: [] };
  },

  async getUnread(): Promise<{ count: number; notifications: Notification[] }> {
    const response = await apiClient.get<{ count: number; notifications: Notification[] }>('/notifications/unread');
    return response.data || { count: 0, notifications: [] };
  },

  async getCount(): Promise<{ unread: number; total: number }> {
    const response = await apiClient.get<{ unread: number; total: number }>('/notifications/count');
    return response.data || { unread: 0, total: 0 };
  },

  async markAsRead(id: number): Promise<{ isRead: boolean } | null> {
    const response = await apiClient.patch<{ isRead: boolean }>(`/notifications/${id}/read`);
    return response.data || null;
  },

  async markAllAsRead(): Promise<{ message: string } | null> {
    const response = await apiClient.patch<{ message: string }>('/notifications/read-all');
    return response.data || null;
  },

  async delete(id: number): Promise<{ message: string } | null> {
    const response = await apiClient.delete<{ message: string }>(`/notifications/${id}`);
    return response.data || null;
  },
};
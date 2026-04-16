import { apiClient } from './client';

export interface Timesheet {
  id: number;
  agent: { id: number; fullName: string };
  site: { id: number; name: string };
  date: string;
  hoursWorked: string;
  overtimeHours: string;
  nightHours: string;
  breakMinutes: number;
  status: string;
  notes?: string;
}

export const timesheetsService = {
  async getMyTimesheets(params?: { startDate?: string; endDate?: string }): Promise<Timesheet[]> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const response = await apiClient.get<Timesheet[]>(`/timesheets/my${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async getWeek(date?: string): Promise<{ week: { start: string; end: string }; timesheets: Timesheet[]; totalHours: number }> {
    const query = date ? `?date=${date}` : '';
    const response = await apiClient.get<{ week: { start: string; end: string }; timesheets: Timesheet[]; totalHours: number }>(`/timesheets/week${query}`);
    return response.data || { week: { start: '', end: '' }, timesheets: [], totalHours: 0 };
  },

  async getPending(): Promise<Timesheet[]> {
    const response = await apiClient.get<Timesheet[]>('/timesheets/pending');
    return response.data || [];
  },
};
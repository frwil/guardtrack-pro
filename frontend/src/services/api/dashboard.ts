import { apiClient } from './client';

export interface AgentDashboard {
  user: any;
  today: {
    date: string;
    presences: any[];
    rounds: any[];
  };
  assignments: any[];
  stats: {
    weekHours: number;
    activeAssignments: number;
    pendingValidations: number;
    recentIncidents: number;
  };
  recentIncidents: any[];
  notifications: { unread: number };
}

export interface ControleurDashboard {
  pending: {
    presences: number;
    timesheets: number;
    incidents: number;
  };
  active: {
    rounds: number;
    agents: number;
  };
  recent: {
    presences: any[];
    incidents: any[];
  };
}

export interface SuperviseurDashboard {
  totalAgents: number;
  activeAgents: number;
  totalSites: number;
  todayPresences: number;
  weekPresences: number;
  pendingValidations: number;
  openIncidents: number;
  disputes: number;
  todayRounds: number;
  recentPresences: any[];
  recentIncidents: any[];
}

export interface AdminDashboard {
  users: {
    total: number;
    byRole: Record<string, number>;
    active: number;
  };
  clients: {
    total: number;
  };
  sites: {
    total: number;
  };
  financials: {
    monthRevenue: number;
  };
  system: {
    incidents: {
      month: number;
      open: number;
    };
  };
}

export interface SuperAdminDashboard {
  users: {
    total: number;
    byRole: Record<string, number>;
    active: number;
  };
  clients: {
    total: number;
  };
  sites: {
    total: number;
  };
  financials: {
    monthRevenue: number;
  };
  disputes: number;
  system: {
    health: {
      database: 'connected' | 'disconnected';
      storage: 'ok' | 'warning' | 'critical';
      cache: 'ok' | 'warning';
      queue: number;
      uptime: string;
    };
    modules: string[];
  };
  recentActivity: any[];
}

export const dashboardService = {
  async getAgent(): Promise<AgentDashboard | null> {
    const response = await apiClient.get<AgentDashboard>('/dashboard/agent');
    return response.data || null;
  },

  async getControleur(): Promise<ControleurDashboard | null> {
    const response = await apiClient.get<ControleurDashboard>('/dashboard/controleur');
    return response.data || null;
  },

  async getSuperviseur(): Promise<SuperviseurDashboard | null> {
    const response = await apiClient.get<SuperviseurDashboard>('/dashboard/superviseur');
    return response.data || null;
  },

  async getAdmin(): Promise<AdminDashboard | null> {
    const response = await apiClient.get<AdminDashboard>('/dashboard/admin');
    return response.data || null;
  },

  // ✅ Ajout de la méthode getSuperAdmin
  async getSuperAdmin(): Promise<SuperAdminDashboard | null> {
    const response = await apiClient.get<SuperAdminDashboard>('/dashboard/superadmin');
    return response.data || null;
  },
};
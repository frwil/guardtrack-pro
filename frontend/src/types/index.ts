export type UserRole = 'GUEST' | 'AGENT' | 'CONTROLEUR' | 'SUPERVISEUR' | 'ADMIN' | 'SUPERADMIN';

export interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  role: UserRole;
  roleLevel: number;
  phone: string | null;
  isActive: boolean;
  hasPinCode: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  unreadNotifications: number;
  permissions: {
    canValidatePresence: boolean;
    canManageAssignments: boolean;
    canManageUsers: boolean;
    canViewFinancials: boolean;
    canManageSystem: boolean;
    canCreateIncident: boolean;
    canExportData: boolean;
  };
  hourlyRate?: number;
  hourlyRateFormatted?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PinCredentials {
  email: string;
  pin: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
}
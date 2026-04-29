import { apiClient } from './client';
import { setToken, removeToken, setRefreshToken, getToken } from '../storage/token';
import { LoginCredentials, PinCredentials, RegisterData, AuthResponse, User } from '../../types';

export const authService = {
  async login(credentials: LoginCredentials, rememberMe = true): Promise<AuthResponse | null> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);

    if (response.data?.token) {
      setToken(response.data.token, rememberMe);
      if (response.data.refreshToken) {
        setRefreshToken(response.data.refreshToken);
      }
      return response.data;
    }

    return null;
  },

  async verifyPin(credentials: PinCredentials, rememberMe = true): Promise<AuthResponse | null> {
    const response = await apiClient.post<AuthResponse>('/auth/verify-pin', credentials);

    if (response.data?.token) {
      setToken(response.data.token, rememberMe);
      if (response.data.refreshToken) {
        setRefreshToken(response.data.refreshToken);
      }
      return response.data;
    }

    return null;
  },

  async forgotPassword(email: string, frontendUrl: string): Promise<{ message: string } | null> {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email, frontendUrl });
    return response.data ?? null;
  },

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string } | null> {
    const response = await apiClient.get<{ valid: boolean; email?: string }>(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
    return response.data ?? null;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string } | null> {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', { token, password });
    return response.data ?? null;
  },

  async register(data: RegisterData): Promise<{ message: string; user: Partial<User> } | null> {
    const response = await apiClient.post<{ message: string; user: Partial<User> }>('/auth/register', data);
    return response.data || null;
  },

  async me(): Promise<User | null> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data || null;
  },

  async logout(): Promise<void> {
    removeToken();
  },

  isAuthenticated(): boolean {
    return !!getToken();
  }
};
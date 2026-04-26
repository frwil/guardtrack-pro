import { apiClient } from './client';
import { apiConfig } from './config';
import { getToken } from '../storage/token';

export interface AiProvider {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export interface AppSettings {
  company: {
    name: string;
    email: string;
    phone: string;
    logo?: string;
  };
  security: {
    requirePhoto: boolean;
    requirePin: boolean;
    requireGeolocation: boolean;
    geofencingRadius: number;
    maxSuspicionScore: number;
  };
  ai: {
    provider: 'zai' | 'openai' | 'google' | 'custom' | 'local';
    providers: AiProvider[];
    minimumConfidence: number;
    enableOfflineFallback: boolean;
  };
  sync: {
    interval: number;
    maxRetries: number;
    unstableThreshold: number;
  };
}

export const settingsService = {
  async getSettings(): Promise<AppSettings | null> {
    const response = await apiClient.get<AppSettings>('/settings');
    return response.data || null;
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings | null> {
    const response = await apiClient.put<AppSettings>('/settings', settings);
    return response.data || null;
  },

  async getAiProviders(): Promise<AiProvider[]> {
    const response = await apiClient.get<AiProvider[]>('/settings/ai/providers');
    return response.data || [];
  },

  async testAiProvider(provider: string, apiKey?: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/settings/ai/test', {
      provider,
      apiKey,
    });
    return response.data || { success: false, message: 'Erreur de connexion' };
  },

  async uploadLogo(file: File): Promise<{ url: string } | null> {
    const formData = new FormData();
    formData.append('logo', file);

    const token = getToken();
    const baseURL = apiConfig.getApiUrl();

    try {
      const response = await fetch(`${baseURL}/settings/logo`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
};
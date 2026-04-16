// frontend/src/services/api/config.ts
const API_URL_STORAGE_KEY = 'guardtrack_api_url';
const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const apiConfig = {
  getApiUrl(): string {
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem(API_URL_STORAGE_KEY);
      return savedUrl || DEFAULT_API_URL;
    }
    return DEFAULT_API_URL;
  },

  setApiUrl(url: string): void {
    if (typeof window !== 'undefined') {
      let cleanUrl = url.trim().replace(/\/$/, '');
      if (!cleanUrl.endsWith('/api')) {
        cleanUrl = cleanUrl + '/api';
      }
      localStorage.setItem(API_URL_STORAGE_KEY, cleanUrl);
    }
  },

  hasCustomApiUrl(): boolean {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_URL_STORAGE_KEY) !== null;
    }
    return false;
  },

  resetToDefault(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_URL_STORAGE_KEY);
    }
  },
  
  // Nouvelle méthode pour obtenir l'URL Mercure
  getMercureUrl(): string {
    return process.env.NEXT_PUBLIC_MERCURE_URL || 'http://localhost:3001/.well-known/mercure';
  }
};
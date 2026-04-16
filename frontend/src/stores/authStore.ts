import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPin: (email: string, pin: string) => Promise<boolean>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.login({ email, password });
          
          if (response?.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: 'Email ou mot de passe incorrect',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: 'Erreur de connexion',
            isLoading: false,
          });
          return false;
        }
      },

      loginWithPin: async (email: string, pin: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authService.verifyPin({ email, pin });
          
          if (response?.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: 'PIN incorrect',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: 'Erreur de connexion',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        authService.logout();
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      fetchUser: async () => {
        set({ isLoading: true });
        
        try {
          const user = await authService.me();
          
          if (user) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'guardtrack-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
import { create } from 'zustand';
import { presencesService, Presence } from '../services/api/presences';

interface PresenceState {
  todayPresences: Presence[];
  pendingPresences: Presence[];
  isLoading: boolean;
  error: string | null;
  
  fetchTodayPresences: () => Promise<void>;
  fetchPendingPresences: () => Promise<void>;
  checkIn: (siteId: number, latitude?: number, longitude?: number, photo?: string) => Promise<boolean>;
  checkOut: (presenceId: number) => Promise<boolean>;
  validatePresence: (presenceId: number) => Promise<boolean>;
  rejectPresence: (presenceId: number, reason?: string) => Promise<boolean>;
  clearError: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  todayPresences: [],
  pendingPresences: [],
  isLoading: false,
  error: null,

  fetchTodayPresences: async () => {
    set({ isLoading: true, error: null });
    try {
      const presences = await presencesService.getToday();
      set({ todayPresences: presences, isLoading: false });
    } catch (error) {
      set({ error: 'Erreur de chargement', isLoading: false });
    }
  },

  fetchPendingPresences: async () => {
    set({ isLoading: true, error: null });
    try {
      const presences = await presencesService.getPending();
      set({ pendingPresences: presences, isLoading: false });
    } catch (error) {
      set({ error: 'Erreur de chargement', isLoading: false });
    }
  },

  checkIn: async (siteId, latitude, longitude, photo) => {
    set({ isLoading: true, error: null });
    try {
      const result = await presencesService.checkIn({ siteId, latitude, longitude, photo });
      if (result) {
        await get().fetchTodayPresences();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du pointage', isLoading: false });
      return false;
    }
  },

  checkOut: async (presenceId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await presencesService.checkOut(presenceId);
      if (result) {
        await get().fetchTodayPresences();
        return true;
      }
      return false;
    } catch (error: any) {
      set({ error: error.message || 'Erreur lors du pointage de sortie', isLoading: false });
      return false;
    }
  },

  validatePresence: async (presenceId) => {
    try {
      const result = await presencesService.validate(presenceId);
      if (result) {
        await get().fetchPendingPresences();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  rejectPresence: async (presenceId, reason) => {
    try {
      const result = await presencesService.reject(presenceId, reason);
      if (result) {
        await get().fetchPendingPresences();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
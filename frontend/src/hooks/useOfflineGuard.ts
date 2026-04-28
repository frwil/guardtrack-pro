'use client';

/**
 * Renvoie un message d'erreur si hors ligne, null sinon.
 * Usage dans un formulaire :
 *   const offlineMsg = useOfflineGuard();
 *   if (offlineMsg) { setError(offlineMsg); return; }
 */
export function useOfflineGuard(): string | null {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return 'Vous êtes hors ligne. Reconnectez-vous pour effectuer cette action.';
  }
  return null;
}

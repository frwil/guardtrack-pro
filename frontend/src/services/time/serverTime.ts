import { apiClient } from '../api/client';

interface ServerTimeResponse {
  timestamp: number;      // Timestamp Unix en secondes
  iso: string;           // Date ISO 8601
  timezone: string;      // Fuseau horaire du serveur
}

class ServerTimeService {
  private offset: number = 0; // Différence entre heure locale et serveur (en ms)
  private lastSync: number = 0;
  private syncing: Promise<void> | null = null;

  /**
   * Synchronise l'heure avec le serveur
   */
  async syncWithServer(): Promise<void> {
    if (this.syncing) {
      return this.syncing;
    }

    this.syncing = this.doSync();
    return this.syncing;
  }

  private async doSync(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await apiClient.get<ServerTimeResponse>('/system/time');
      const endTime = Date.now();
      
      if (response.data) {
        // Calculer l'offset en tenant compte de la latence réseau
        const networkLatency = (endTime - startTime) / 2;
        const serverTime = response.data.timestamp * 1000;
        
        // L'heure serveur estimée au moment de la réception
        const estimatedServerTime = serverTime + networkLatency;
        
        // Offset = heure serveur - heure locale
        this.offset = estimatedServerTime - Date.now();
        this.lastSync = Date.now();
        
        console.log(`🕐 Heure serveur synchronisée (offset: ${this.offset}ms, latence: ${networkLatency}ms)`);
      }
    } catch (error) {
      console.error('Erreur synchronisation heure serveur:', error);
      // Garder l'ancien offset
    } finally {
      this.syncing = null;
    }
  }

  /**
   * Obtient l'heure serveur estimée actuelle
   */
  getServerTime(): Date {
    const localTime = Date.now();
    const serverTime = localTime + this.offset;
    return new Date(serverTime);
  }

  /**
   * Obtient un timestamp ISO pour une opération
   */
  getServerISOString(): string {
    return this.getServerTime().toISOString();
  }

  /**
   * Vérifie si l'heure est synchronisée récemment
   */
  isSynced(maxAgeMs: number = 3600000): boolean { // 1 heure par défaut
    return (Date.now() - this.lastSync) < maxAgeMs;
  }

  /**
   * Obtient le décalage actuel (pour debug)
   */
  getOffset(): number {
    return this.offset;
  }

  /**
   * Force la resynchronisation si nécessaire
   */
  async ensureSynced(): Promise<void> {
    if (!this.isSynced()) {
      await this.syncWithServer();
    }
  }
}

export const serverTime = new ServerTimeService();
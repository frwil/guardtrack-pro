type NetworkStatus = 'online' | 'offline' | 'unstable' | 'reconnecting';

interface NetworkState {
  status: NetworkStatus;
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
  reconnectionCount: number;
  averageReconnectionTime: number;
}

class NetworkMonitor {
  private status: NetworkStatus = 'online';
  private lastOnlineAt: string | null = null;
  private lastOfflineAt: string | null = null;
  private reconnectionHistory: number[] = [];
  private unstableThreshold = 3; // 3 reconnexions en 2 minutes = instable
  private unstableTimeWindow = 120000; // 2 minutes en ms
  private pauseSyncUntil: string | null = null;
  private listeners: ((status: NetworkStatus) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      this.status = navigator.onLine ? 'online' : 'offline';

      // Écouter les changements de type de connexion (API Network Information)
      const conn = (navigator as any).connection;
      if (conn) {
        conn.addEventListener('change', () => this.handleConnectionChange(conn));
      }
    }
  }

  private handleConnectionChange(conn: any): void {
    if (this.status === 'offline') return;
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      if (this.status !== 'unstable') {
        this.status = 'unstable';
        this.pauseSyncUntil = new Date(Date.now() + 300000).toISOString();
        console.warn('⚠️ Connexion lente détectée - Synchronisations en pause pour 5 minutes');
        this.notifyListeners();
      }
    }
  }

  private async probeConnectionSpeed(): Promise<boolean> {
    // Vérifier via l'API Network Information si disponible
    const conn = (navigator as any).connection;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
      return false; // connexion lente
    }

    // Sonde temporelle : télécharger un pixel pour mesurer le débit
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      // > 3 secondes pour un HEAD sur favicon = connexion très lente
      return elapsed < 3000;
    } catch {
      return false;
    }
  }

  private async handleOnline(): Promise<void> {
    const now = new Date();
    this.lastOnlineAt = now.toISOString();
    this.reconnectionHistory.push(now.getTime());

    // Nettoyer l'historique vieux de plus de 2 minutes
    const twoMinutesAgo = now.getTime() - this.unstableTimeWindow;
    this.reconnectionHistory = this.reconnectionHistory.filter(t => t > twoMinutesAgo);

    // Détecter l'instabilité par fréquence de reconnexion
    if (this.reconnectionHistory.length >= this.unstableThreshold) {
      this.status = 'unstable';
      this.pauseSyncUntil = new Date(now.getTime() + 300000).toISOString();
      console.warn('⚠️ Réseau instable détecté - Synchronisations en pause pour 5 minutes');
      this.notifyListeners();
      return;
    }

    // Vérifier le débit réel avant de déclarer la connexion stable
    const isFast = await this.probeConnectionSpeed();
    if (!isFast) {
      this.status = 'unstable';
      this.pauseSyncUntil = new Date(now.getTime() + 300000).toISOString();
      console.warn('⚠️ Débit insuffisant - Synchronisations en pause pour 5 minutes');
      this.notifyListeners();
      return;
    }

    this.status = 'online';
    this.pauseSyncUntil = null;
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.lastOfflineAt = new Date().toISOString();
    this.status = 'offline';
    this.notifyListeners();
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  isSyncAllowed(): boolean {
    if (!navigator.onLine) return false;
    if (this.status === 'unstable') return false;
    if (this.pauseSyncUntil) {
      const pauseUntil = new Date(this.pauseSyncUntil);
      if (new Date() < pauseUntil) return false;
      this.pauseSyncUntil = null;
      this.status = 'online';
    }
    return this.status === 'online';
  }

  getState(): NetworkState {
    return {
      status: this.status,
      lastOnlineAt: this.lastOnlineAt,
      lastOfflineAt: this.lastOfflineAt,
      reconnectionCount: this.reconnectionHistory.length,
      averageReconnectionTime: this.calculateAverageReconnectionTime(),
    };
  }

  private calculateAverageReconnectionTime(): number {
    if (this.reconnectionHistory.length < 2) return 0;
    let totalDiff = 0;
    for (let i = 1; i < this.reconnectionHistory.length; i++) {
      totalDiff += this.reconnectionHistory[i] - this.reconnectionHistory[i - 1];
    }
    return totalDiff / (this.reconnectionHistory.length - 1);
  }

  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.status));
  }
}

export const networkMonitor = new NetworkMonitor();

// Configuration IndexedDB
const DB_NAME = "guardtrack_offline";
const DB_VERSION = 4;

export interface StoredAssignment {
  id: number;
  site: {
    id: number;
    name: string;
    address: string;
    latitude: string | null;
    longitude: string | null;
    geofencingRadius: number;
  };
  startDate: string;
  endDate: string | null;
  _lastSync: string;
}

export interface StoredPresence {
  id?: number;
  siteId: number;
  checkIn: string;
  checkOut: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  photo: string | null;
  status: "PENDING" | "SYNCED";
  _lastSync: string | null;
  _syncAttempts: number;
}

export interface StoredIncident {
  id?: number;
  title: string;
  description: string;
  category: string;
  severity: string;
  siteId: number;
  reportedAt: string;
  status: "PENDING" | "SYNCED";
  photos?: string[];
  _lastSync: string | null;
  _syncAttempts: number;
}

export interface StoredRound {
  id?: string;
  name: string;
  agentId: number;
  scheduledStart: string;
  supervisorId?: number;
  sites: { id: number; order: number }[];
  status: "PENDING" | "SYNCED";
  _lastSync: string | null;
  _syncAttempts: number;
}

// ✅ Interface unifiée pour toutes les opérations de synchronisation
export interface SyncOperation {
  id?: number;
  type: "CREATE" | "UPDATE" | "DELETE" | "CREATE_ROUND" | "START_ROUND" | "VISIT_SITE" | "COMPLETE_ROUND";
  entity: "presence" | "incident" | "timesheet" | "round" | "round_site" | "assignment";
  data: any;
  
  // Horodatages
  clientTime: string;
  clientTimestamp: number;
  serverTimeEstimated?: string;
  serverTimeConfirmed?: string;
  timeOffset?: number;
  
  // Métadonnées
  createdAt: string;
  attempts: number;
  lastAttempt: string | null;
  syncedAt: string | null;
  
  // Validation
  validationStatus: "PENDING" | "VALIDATED" | "REJECTED" | "CONFLICT";
  validationNote?: string;
}

// Pour la rétrocompatibilité
export type OfflineOperation = SyncOperation;

class OfflineDB {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store pour les assignations
        if (!db.objectStoreNames.contains("assignments")) {
          const assignmentsStore = db.createObjectStore("assignments", { keyPath: "id" });
          assignmentsStore.createIndex("siteId", "site.id", { unique: false });
        }

        // Store pour les présences
        if (!db.objectStoreNames.contains("presences")) {
          const presencesStore = db.createObjectStore("presences", { keyPath: "id", autoIncrement: true });
          presencesStore.createIndex("status", "status", { unique: false });
          presencesStore.createIndex("siteId", "siteId", { unique: false });
        }

        // Store pour les incidents
        if (!db.objectStoreNames.contains("incidents")) {
          const incidentsStore = db.createObjectStore("incidents", { keyPath: "id", autoIncrement: true });
          incidentsStore.createIndex("status", "status", { unique: false });
          incidentsStore.createIndex("siteId", "siteId", { unique: false });
        }

        // Store pour les rondes
        if (!db.objectStoreNames.contains("rounds")) {
          const roundsStore = db.createObjectStore("rounds", { keyPath: "id" });
          roundsStore.createIndex("status", "status", { unique: false });
        }

        // Store pour la file d'attente de synchronisation
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
          syncStore.createIndex("entity", "entity", { unique: false });
          syncStore.createIndex("createdAt", "createdAt", { unique: false });
          syncStore.createIndex("validationStatus", "validationStatus", { unique: false });
        }

        // Store pour les métadonnées
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }

        // Store pour les identifiants offline (connexion sans réseau)
        if (!db.objectStoreNames.contains("credentials")) {
          db.createObjectStore("credentials", { keyPath: "email" });
        }
      };
    });
  }

  // ========== ASSIGNATIONS ==========
  async saveAssignments(assignments: StoredAssignment[]): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("assignments", "readwrite");
    const store = tx.objectStore("assignments");

    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    for (const assignment of assignments) {
      assignment._lastSync = new Date().toISOString();
      store.add(assignment);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAssignments(): Promise<StoredAssignment[]> {
    const db = await this.open();
    const tx = db.transaction("assignments", "readonly");
    const store = tx.objectStore("assignments");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAssignmentsBySite(siteId: number): Promise<StoredAssignment[]> {
    const db = await this.open();
    const tx = db.transaction("assignments", "readonly");
    const store = tx.objectStore("assignments");
    const index = store.index("siteId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(siteId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ========== PRÉSENCES ==========
  async savePresence(presence: StoredPresence): Promise<number> {
    const db = await this.open();
    const tx = db.transaction("presences", "readwrite");
    const store = tx.objectStore("presences");

    return new Promise((resolve, reject) => {
      const request = store.add(presence);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async getPresences(): Promise<StoredPresence[]> {
    const db = await this.open();
    const tx = db.transaction("presences", "readonly");
    const store = tx.objectStore("presences");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPendingPresences(): Promise<StoredPresence[]> {
    const db = await this.open();
    const tx = db.transaction("presences", "readonly");
    const store = tx.objectStore("presences");
    const index = store.index("status");

    return new Promise((resolve, reject) => {
      const request = index.getAll("PENDING");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updatePresence(id: number, updates: Partial<StoredPresence>): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("presences", "readwrite");
    const store = tx.objectStore("presences");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const presence = getRequest.result;
        if (!presence) {
          reject(new Error("Presence not found"));
          return;
        }
        Object.assign(presence, updates);
        const putRequest = store.put(presence);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  async deletePresence(id: number): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("presences", "readwrite");
    const store = tx.objectStore("presences");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ========== INCIDENTS ==========
  async saveIncident(incident: StoredIncident): Promise<number> {
    const db = await this.open();
    const tx = db.transaction("incidents", "readwrite");
    const store = tx.objectStore("incidents");

    return new Promise((resolve, reject) => {
      const request = store.add(incident);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async getIncidents(): Promise<StoredIncident[]> {
    const db = await this.open();
    const tx = db.transaction("incidents", "readonly");
    const store = tx.objectStore("incidents");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPendingIncidents(): Promise<StoredIncident[]> {
    const db = await this.open();
    const tx = db.transaction("incidents", "readonly");
    const store = tx.objectStore("incidents");
    const index = store.index("status");

    return new Promise((resolve, reject) => {
      const request = index.getAll("PENDING");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async updateIncident(id: number, updates: Partial<StoredIncident>): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("incidents", "readwrite");
    const store = tx.objectStore("incidents");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const incident = getRequest.result;
        if (!incident) {
          reject(new Error("Incident not found"));
          return;
        }
        Object.assign(incident, updates);
        const putRequest = store.put(incident);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  // ========== RONDES ==========
  async saveRounds(rounds: any[]): Promise<void> {
    const db = await this.open();
    
    // Créer le store s'il n'existe pas
    if (!db.objectStoreNames.contains("rounds")) {
      db.close();
      const newVersion = db.version + 1;
      this.db = null;
      await this.open();
    }
    
    const tx = db.transaction("rounds", "readwrite");
    const store = tx.objectStore("rounds");

    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onerror = () => reject(clearRequest.error);
      clearRequest.onsuccess = () => resolve();
    });

    for (const round of rounds) {
      store.add({ ...round, _lastSync: new Date().toISOString() });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRounds(): Promise<any[]> {
    const db = await this.open();
    
    if (!db.objectStoreNames.contains("rounds")) {
      return [];
    }
    
    const tx = db.transaction("rounds", "readonly");
    const store = tx.objectStore("rounds");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ========== SYNC QUEUE ==========
  async addToSyncQueue(operation: Omit<SyncOperation, "id" | "attempts" | "lastAttempt" | "validationStatus" | "syncedAt">): Promise<number> {
    const db = await this.open();
    const tx = db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    const syncOp: SyncOperation = {
      ...operation,
      attempts: 0,
      lastAttempt: null,
      syncedAt: null,
      validationStatus: "PENDING",
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(syncOp);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as number);
    });
  }

  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    const db = await this.open();
    const tx = db.transaction("syncQueue", "readonly");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async deleteSyncOperation(id: number): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async updateSyncAttempt(id: number, attempts: number, lastAttempt: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const op = getRequest.result;
        if (!op) {
          reject(new Error("Operation not found"));
          return;
        }
        op.attempts = attempts;
        op.lastAttempt = lastAttempt;
        const putRequest = store.put(op);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  async updateSyncOperation(id: number, updates: Partial<SyncOperation>): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("syncQueue", "readwrite");
    const store = tx.objectStore("syncQueue");

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const op = getRequest.result;
        if (!op) {
          reject(new Error("Operation not found"));
          return;
        }
        Object.assign(op, updates);
        const putRequest = store.put(op);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }

  // ========== MÉTADONNÉES ==========
  async setMeta(key: string, value: string): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("meta", "readwrite");
    const store = tx.objectStore("meta");

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMeta(key: string): Promise<string | null> {
    const db = await this.open();
    const tx = db.transaction("meta", "readonly");
    const store = tx.objectStore("meta");

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.value || null);
    });
  }

  // ========== IDENTIFIANTS OFFLINE ==========
  async saveOfflineCredentials(email: string, pinHash: string, user: object): Promise<void> {
    const db = await this.open();
    const tx = db.transaction("credentials", "readwrite");
    const store = tx.objectStore("credentials");
    return new Promise((resolve, reject) => {
      const request = store.put({ email, pinHash, user, savedAt: new Date().toISOString() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getOfflineCredentials(email: string): Promise<{ email: string; pinHash: string; user: object; savedAt: string } | null> {
    const db = await this.open();
    const tx = db.transaction("credentials", "readonly");
    const store = tx.objectStore("credentials");
    return new Promise((resolve, reject) => {
      const request = store.get(email);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.open();
    const stores = ["assignments", "presences", "incidents", "rounds", "syncQueue", "meta", "credentials"];

    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      }
    }
  }
}

export const offlineDB = new OfflineDB();

export async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
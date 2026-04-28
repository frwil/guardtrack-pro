import { offlineDB, StoredAssignment, OfflineOperation, SyncOperation } from '../storage/db';
import { networkMonitor } from "../network/monitor";
import { assignmentsService } from "../api/assignments";
import { presencesService } from "../api/presences";
import { roundsService } from "../api/rounds";
import { incidentsService } from "../api/incidents";
import { serverTime } from "../time/serverTime";
import { conflictService } from "../api/conflict";

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  errors: string[];
}

class SyncManager {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  // Seuils de validation temporelle
  private readonly MAX_TIME_DRIFT = 300000; // 5 minutes en ms
  private readonly MAX_FUTURE_DRIFT = 60000; // 1 minute dans le futur
  private readonly MAX_PAST_OPERATION = 86400000; // 24h max dans le passé

  // ============================================================
  // VALIDATION TEMPORELLE
  // ============================================================

  /**
   * Valide un horodatage par rapport au temps serveur
   */
  private validateTimestamp(
    clientTime: string,
    serverTimeEstimated?: string,
    timeOffset?: number,
  ): { valid: boolean; reason?: string; adjustedTime?: string } {
    // Si on a une heure serveur estimée (mode offline avec synchro préalable)
    if (serverTimeEstimated) {
      const estimated = new Date(serverTimeEstimated);
      const serverNow = serverTime.getServerTime();
      const drift = Math.abs(serverNow.getTime() - estimated.getTime());

      // Vérifier la dérive maximale
      if (drift > this.MAX_TIME_DRIFT) {
        return {
          valid: false,
          reason: `Dérive temporelle trop importante (${Math.round(drift / 1000)}s)`,
        };
      }

      // Vérifier que l'opération n'est pas dans le futur
      if (
        estimated > serverNow &&
        estimated.getTime() - serverNow.getTime() > this.MAX_FUTURE_DRIFT
      ) {
        return {
          valid: false,
          reason: "Opération dans le futur",
        };
      }

      // Vérifier que l'opération n'est pas trop ancienne
      if (serverNow.getTime() - estimated.getTime() > this.MAX_PAST_OPERATION) {
        return {
          valid: false,
          reason: "Opération trop ancienne",
        };
      }

      return { valid: true, adjustedTime: estimated.toISOString() };
    }

    // Pas d'heure serveur estimée : on utilise l'heure client
    const clientDate = new Date(clientTime);

    // Si le client est synchronisé maintenant, on peut comparer
    if (serverTime.isSynced()) {
      const serverNow = serverTime.getServerTime();
      const drift = Math.abs(serverNow.getTime() - clientDate.getTime());

      if (drift > this.MAX_TIME_DRIFT * 2) {
        return {
          valid: false,
          reason: `Heure client incohérente (drift: ${Math.round(drift / 1000)}s)`,
        };
      }
    }

    // On accepte mais avec un flag
    return {
      valid: true,
      adjustedTime: clientTime,
    };
  }

  /**
   * Détecte une tentative de fraude par manipulation de date
   */
  private async detectFraudAttempt(
    operation: OfflineOperation,
  ): Promise<boolean> {
    const recentOps = await this.getRecentOperations(operation.entity, 10);

    if (recentOps.length < 2) return false;

    // Vérifier si les timestamps sont cohérents (pas de retour dans le passé)
    for (let i = 1; i < recentOps.length; i++) {
      const prev = new Date(recentOps[i - 1].clientTime);
      const curr = new Date(recentOps[i].clientTime);

      // Si une opération est antérieure à la précédente, c'est suspect
      if (curr < prev) {
        console.warn(
          `⚠️ Anomalie temporelle détectée: ${curr.toISOString()} < ${prev.toISOString()}`,
        );
        return true;
      }
    }

    // Vérifier les sauts de timeOffset anormaux
    const timeOffsets = recentOps.map((op) => op.timeOffset || 0);
    const uniqueOffsets = [...new Set(timeOffsets)];

    // Si l'offset change brusquement de plus de 30 secondes, c'est suspect
    if (uniqueOffsets.length > 1) {
      const maxDiff = Math.max(...uniqueOffsets) - Math.min(...uniqueOffsets);
      if (maxDiff > 30000) {
        console.warn(`⚠️ Saut d'offset suspect: ${maxDiff}ms`);
        return true;
      }
    }

    return false;
  }

  private async getRecentOperations(
    entity: string,
    limit: number,
  ): Promise<OfflineOperation[]> {
    const operations = await offlineDB.getPendingSyncOperations();
    return operations
      .filter((op) => op.entity === entity)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  // ============================================================
  // SYNCHRONISATION DES DONNÉES
  // ============================================================

  /**
   * Récupère les assignations (stale-while-revalidate)
   */
  async fetchAssignments(): Promise<StoredAssignment[]> {
    const cachedAssignments = await offlineDB.getAssignments();

    if (networkMonitor.isSyncAllowed()) {
      this.fetchAndCacheAssignments().catch(console.error);
    }

    return cachedAssignments;
  }

  private async fetchAndCacheAssignments(): Promise<void> {
    try {
      const freshAssignments = await assignmentsService.getMyAssignments();

      const toStore: StoredAssignment[] = freshAssignments.map((a) => ({
        id: a.id,
        site: a.site,
        startDate: a.startDate,
        endDate: a.endDate,
        _lastSync: new Date().toISOString(),
      }));

      await offlineDB.saveAssignments(toStore);
      await offlineDB.setMeta("lastAssignmentsSync", new Date().toISOString());

      console.log(`✅ ${toStore.length} assignations synchronisées`);
    } catch (error) {
      console.error("Erreur de synchronisation des assignations:", error);
    }
  }

  /**
   * Synchronise les rondes planifiées
   */
  async fetchMyPlannedRounds(): Promise<any[]> {
    const cached = await offlineDB.getRounds();

    if (networkMonitor.isSyncAllowed()) {
      try {
        const fresh = await roundsService.getMyPlanned();
        await offlineDB.saveRounds(fresh);
        await offlineDB.setMeta("lastRoundsSync", new Date().toISOString());
        console.log(`✅ ${fresh.length} rondes synchronisées`);
        return fresh;
      } catch (error) {
        console.error("Erreur synchronisation rondes:", error);
      }
    }

    return cached;
  }

  // ============================================================
  // OPÉRATIONS OFFLINE
  // ============================================================

  /**
   * Créer une présence (offline-first)
   */
  async createPresence(data: {
    siteId: number;
    latitude?: number;
    longitude?: number;
    photo?: string;
  }): Promise<{ localId: number; synced: boolean }> {
    const operationTime = {
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced()
        ? serverTime.getServerISOString()
        : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
    };

    const localId = await offlineDB.savePresence({
      siteId: data.siteId,
      checkIn: operationTime.clientTime,
      checkOut: null,
      gpsLatitude: data.latitude || null,
      gpsLongitude: data.longitude || null,
      photo: data.photo || null,
      status: "PENDING",
      _lastSync: null,
      _syncAttempts: 0,
    });

    // ✅ Ne PAS passer attempts, lastAttempt, syncedAt, validationStatus
    await offlineDB.addToSyncQueue({
      type: "CREATE",
      entity: "presence",
      data: { localId, ...data },
      clientTime: operationTime.clientTime,
      clientTimestamp: operationTime.clientTimestamp,
      serverTimeEstimated: operationTime.serverTimeEstimated,
      timeOffset: operationTime.timeOffset,
      createdAt: new Date().toISOString(),
    });

    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }

    return { localId, synced: false };
  }

  /**
   * Créer une ronde (offline-first)
   */
  async createRound(data: {
    name: string;
    agentId: number;
    scheduledStart: string;
    supervisorId?: number;
    sites: { id: number; order: number }[];
  }): Promise<{ localId: string; synced: boolean }> {
    const operationTime = {
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced()
        ? serverTime.getServerISOString()
        : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
    };

    const localId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Ne PAS passer attempts, lastAttempt, syncedAt, validationStatus
    await offlineDB.addToSyncQueue({
      type: "CREATE_ROUND",
      entity: "round",
      data: { localId, ...data },
      clientTime: operationTime.clientTime,
      clientTimestamp: operationTime.clientTimestamp,
      serverTimeEstimated: operationTime.serverTimeEstimated,
      timeOffset: operationTime.timeOffset,
      createdAt: new Date().toISOString(),
    });

    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }

    return { localId, synced: false };
  }

  /**
   * Démarrer une ronde (offline-first)
   */
  async startRound(roundId: number): Promise<{ synced: boolean }> {
    const operationTime = {
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced()
        ? serverTime.getServerISOString()
        : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
    };

    // ✅ Ne PAS passer attempts, lastAttempt, syncedAt, validationStatus
    await offlineDB.addToSyncQueue({
      type: "START_ROUND",
      entity: "round",
      data: { roundId },
      clientTime: operationTime.clientTime,
      clientTimestamp: operationTime.clientTimestamp,
      serverTimeEstimated: operationTime.serverTimeEstimated,
      timeOffset: operationTime.timeOffset,
      createdAt: new Date().toISOString(),
    });

    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }

    return { synced: false };
  }

  /**
   * Visiter un site (offline-first)
   */
  async controllerVisitSite(
    roundId: number,
    siteId: number,
    data: any,
  ): Promise<{ synced: boolean }> {
    const operationTime = {
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced()
        ? serverTime.getServerISOString()
        : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
    };

    // ✅ Ne PAS passer attempts, lastAttempt, syncedAt, validationStatus
    await offlineDB.addToSyncQueue({
      type: "VISIT_SITE",
      entity: "round_site",
      data: { roundId, siteId, ...data },
      clientTime: operationTime.clientTime,
      clientTimestamp: operationTime.clientTimestamp,
      serverTimeEstimated: operationTime.serverTimeEstimated,
      timeOffset: operationTime.timeOffset,
      createdAt: new Date().toISOString(),
    });

    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }

    return { synced: false };
  }

  /**
   * Déclarer un incident (offline-first)
   */
  async createIncident(data: {
    title: string;
    description: string;
    category: string;
    severity: string;
    siteId: number;
    photos?: string[];
  }): Promise<{ localId: string; synced: boolean }> {
    const operationTime = {
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced()
        ? serverTime.getServerISOString()
        : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
    };

    const localId = `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Ne PAS passer attempts, lastAttempt, syncedAt, validationStatus
    await offlineDB.addToSyncQueue({
      type: "CREATE",
      entity: "incident",
      data: { localId, ...data },
      clientTime: operationTime.clientTime,
      clientTimestamp: operationTime.clientTimestamp,
      serverTimeEstimated: operationTime.serverTimeEstimated,
      timeOffset: operationTime.timeOffset,
      createdAt: new Date().toISOString(),
    });

    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }

    return { localId, synced: false };
  }

  // ============================================================
  // TRAITEMENT DE LA FILE D'ATTENTE
  // ============================================================

  /**
   * Traiter la file d'attente de synchronisation
   */
  async processSyncQueue(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        errors: ["Sync déjà en cours"],
      };
    }
    if (!networkMonitor.isSyncAllowed()) {
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        conflictCount: 0,
        errors: ["Réseau non disponible"],
      };
    }

    this.syncInProgress = true;

    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      errors: [],
    };

    try {
      await serverTime.ensureSynced();

      const operations = await offlineDB.getPendingSyncOperations();

      for (const op of operations) {
        if (!op.id) continue;

        try {
          // ✅ Valider l'horodatage (mais ne pas bloquer)
          const validation = this.validateTimestamp(
            op.clientTime,
            op.serverTimeEstimated,
            op.timeOffset,
          );

          // ✅ Détecter une fraude potentielle (mais ne pas bloquer)
          const isFraudulent = await this.detectFraudAttempt(op);

          // Déterminer le statut de validation
          let validationStatus: SyncOperation["validationStatus"] = "VALIDATED";
          let validationNote: string | undefined = undefined;

          if (!validation.valid) {
            validationStatus = "CONFLICT";
            validationNote = `Anomalie temporelle: ${validation.reason}`;
            result.conflictCount++;
          } else if (isFraudulent) {
            validationStatus = "CONFLICT";
            validationNote =
              "Suspicion de manipulation de date - Vérification manuelle requise";
            result.conflictCount++;
          }

          // ✅ Toujours exécuter l'opération (synchroniser les données)
          const success = await this.executeOperation(
            op,
            validation.adjustedTime,
          );

          if (success) {
            if (validationStatus === "CONFLICT") {
              // Escalader au back-office admin avant suppression locale
              try {
                await conflictService.reportBatch([{
                  operationId: op.id,
                  operation: op,
                  conflictType: isFraudulent ? 'FRAUD_SUSPICION' : 'TIME_DRIFT',
                  reason: validationNote || 'Conflit détecté',
                  clientData: op.data,
                  resolution: 'PENDING',
                }]);
              } catch (err) {
                console.error('Impossible d\'escalader le conflit au serveur:', err);
              }
              // Supprimer du device pour éviter les synchros en boucle
              await offlineDB.deleteSyncOperation(op.id);
              console.warn(`⚠️ Conflit escaladé à l'admin et supprimé localement: ${validationNote}`);
            } else {
              await offlineDB.deleteSyncOperation(op.id);
            }
            result.syncedCount++;
          } else {
            const newAttempts = (op.attempts || 0) + 1;
            await offlineDB.updateSyncOperation(op.id, {
              ...op,
              attempts: newAttempts,
              lastAttempt: new Date().toISOString(),
            });

            if (newAttempts >= 5) {
              await offlineDB.updateSyncOperation(op.id, {
                ...op,
                validationStatus: "REJECTED",
                validationNote: "Échec après 5 tentatives",
              });
              result.failedCount++;
            }
          }
        } catch (error) {
          console.error(`Erreur synchronisation opération ${op.id}:`, error);
          result.errors.push(`${op.entity} ${op.type}: ${error}`);
          result.failedCount++;
        }
      }
    } finally {
      this.syncInProgress = false;
    }

    console.log(
      `📊 Sync terminée: ${result.syncedCount} succès, ${result.failedCount} échecs, ${result.conflictCount} conflits signalés`,
    );
    return result;
  }

  /**
   * Récupère les opérations en conflit qui nécessitent une revue manuelle
   */
  async getConflictOperations(): Promise<OfflineOperation[]> {
    const operations = await offlineDB.getPendingSyncOperations();
    return operations.filter((op) => op.validationStatus === "CONFLICT");
  }

  /**
   * Récupère les opérations rejetées
   */
  async getRejectedOperations(): Promise<OfflineOperation[]> {
    const operations = await offlineDB.getPendingSyncOperations();
    return operations.filter((op) => op.validationStatus === "REJECTED");
  }

  /**
   * Approuve manuellement une opération en conflit
   */
  async approveOperation(id: number, note?: string): Promise<void> {
    await offlineDB.updateSyncOperation(id, {
      validationStatus: "VALIDATED",
      validationNote: note
        ? `Approuvé manuellement: ${note}`
        : "Approuvé manuellement",
    });
  }

  /**
   * Rejette manuellement une opération en conflit
   */
  async rejectOperation(id: number, reason: string): Promise<void> {
    await offlineDB.updateSyncOperation(id, {
      validationStatus: "REJECTED",
      validationNote: `Rejeté manuellement: ${reason}`,
    });
  }

  /**
   * Exécute une opération spécifique
   */
  private async executeOperation(
    op: OfflineOperation,
    adjustedTime?: string,
  ): Promise<boolean> {
    switch (op.entity) {
      case "presence":
        if (op.type === "CREATE") {
          const result = await presencesService.checkIn({
            siteId: op.data.siteId,
            latitude: op.data.latitude,
            longitude: op.data.longitude,
            photo: op.data.photo,
          });
          return !!result;
        }
        if (op.type === "CHECK_OUT") {
          const result = await presencesService.checkOut(op.data.presenceId);
          return !!result;
        }
        if (op.type === "VALIDATE") {
          const result = await presencesService.validate(op.data.presenceId);
          return !!result;
        }
        if (op.type === "REJECT") {
          const result = await presencesService.reject(op.data.presenceId, op.data.reason);
          return !!result;
        }
        break;

      case "round":
        if (op.type === "CREATE_ROUND") {
          const result = await roundsService.create({
            ...op.data,
            _operationTime: { adjustedTime },
          });
          return !!result;
        }
        if (op.type === "START_ROUND") {
          const result = await roundsService.startAsController(op.data.roundId);
          return !!result;
        }
        break;

      case "round_site":
        if (op.type === "VISIT_SITE") {
          const result = await roundsService.controllerVisitSite(
            op.data.roundId,
            op.data.siteId,
            { ...op.data, _operationTime: { adjustedTime } },
          );
          return !!result;
        }
        break;

      case "incident":
        if (op.type === "CREATE") {
          const result = await incidentsService.create({
            ...op.data,
            _operationTime: { adjustedTime },
          });
          return !!result;
        }
        break;
    }

    return false;
  }

  // ============================================================
  // GESTION DU CYCLE DE VIE
  // ============================================================

  startPeriodicSync(intervalMs: number = 60000): void {
    if (this.syncInterval) return;

    // Déclencher une synchro immédiate dès que le réseau redevient stable
    this.networkUnsubscribe = networkMonitor.subscribe((status) => {
      if (status === 'online') {
        console.log('🌐 Réseau stable - déclenchement de la synchronisation');
        this.processSyncQueue().catch(console.error);
      }
    });

    this.syncInterval = setInterval(() => {
      if (networkMonitor.isSyncAllowed()) {
        this.processSyncQueue().catch(console.error);
      }
    }, intervalMs);

    console.log(
      `🔄 Synchronisation périodique démarrée (intervalle: ${intervalMs}ms)`,
    );
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    console.log("⏹️ Synchronisation périodique arrêtée");
  }

  /**
   * Force une synchronisation immédiate
   */
  async forceSync(): Promise<SyncResult> {
    console.log("🔄 Synchronisation forcée...");
    return this.processSyncQueue();
  }

  /**
   * Obtient le statut de la synchronisation
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    validatedCount: number;
    rejectedCount: number;
    conflictCount: number;
    lastSync: string | null;
  }> {
    const operations = await offlineDB.getPendingSyncOperations();
    const lastSync = await offlineDB.getMeta("lastSync");

    return {
      pendingCount: operations.filter((op) => op.validationStatus === "PENDING")
        .length,
      validatedCount: operations.filter(
        (op) => op.validationStatus === "VALIDATED",
      ).length,
      rejectedCount: operations.filter(
        (op) => op.validationStatus === "REJECTED",
      ).length,
      conflictCount: operations.filter(
        (op) => op.validationStatus === "CONFLICT",
      ).length,
      lastSync,
    };
  }

  /** Helper : met une opération quelconque en file d'attente */
  async queue(entity: string, type: string, data: Record<string, unknown>): Promise<void> {
    await offlineDB.addToSyncQueue({
      type,
      entity,
      data,
      clientTime: new Date().toISOString(),
      clientTimestamp: Date.now(),
      serverTimeEstimated: serverTime.isSynced() ? serverTime.getServerISOString() : undefined,
      timeOffset: serverTime.isSynced() ? serverTime.getOffset() : undefined,
      createdAt: new Date().toISOString(),
    });
    if (networkMonitor.isSyncAllowed()) {
      this.processSyncQueue().catch(console.error);
    }
  }
}

export const syncManager = new SyncManager();

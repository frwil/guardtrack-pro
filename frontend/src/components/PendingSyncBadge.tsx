'use client';

import { useEffect, useState } from 'react';
import { syncManager } from '../services/sync/manager';
import { networkMonitor } from '../services/network/monitor';

export function PendingSyncBadge() {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => {
    try {
      const status = await syncManager.getSyncStatus();
      setPending(status.pendingCount);
    } catch {}
  };

  useEffect(() => {
    refresh();

    // Actualise toutes les 30 s
    const interval = setInterval(refresh, 30_000);

    // Actualise aussi au retour en ligne (sync vient de se terminer)
    const unsub = networkMonitor.subscribe((status) => {
      if (status === 'online') {
        setSyncing(true);
        setTimeout(() => { refresh(); setSyncing(false); }, 4000);
      }
    });

    return () => { clearInterval(interval); unsub(); };
  }, []);

  if (pending === 0 && !syncing) return null;

  return (
    <button
      onClick={refresh}
      title={`${pending} opération(s) en attente de synchronisation`}
      className="relative flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
    >
      {syncing ? (
        <>
          <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          Sync…
        </>
      ) : (
        <>
          ⏳ {pending} en attente
        </>
      )}
    </button>
  );
}

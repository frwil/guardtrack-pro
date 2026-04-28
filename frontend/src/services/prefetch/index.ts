import { apiClient } from '../api/client';

type Role = 'AGENT' | 'CONTROLEUR' | 'SUPERVISEUR' | 'ADMIN' | 'SUPERADMIN';

export type PrefetchStatus = 'idle' | 'syncing' | 'done' | 'error';

type StatusCallback = (status: PrefetchStatus) => void;

const subscribers = new Set<StatusCallback>();
let currentStatus: PrefetchStatus = 'idle';

function setStatus(s: PrefetchStatus) {
  currentStatus = s;
  subscribers.forEach((cb) => cb(s));
}

export const prefetchService = {
  subscribe(cb: StatusCallback): () => void {
    subscribers.add(cb);
    cb(currentStatus);
    return () => subscribers.delete(cb);
  },

  async prefetchForRole(role: Role): Promise<void> {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    const endpoints = getEndpoints(role);
    if (endpoints.length === 0) return;

    setStatus('syncing');

    // Batches de 4 pour ne pas saturer le serveur
    const BATCH = 4;
    let hasError = false;

    for (let i = 0; i < endpoints.length; i += BATCH) {
      const batch = endpoints.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((ep) => apiClient.get(ep))
      );
      if (results.some((r) => r.status === 'rejected')) hasError = true;
    }

    setStatus(hasError ? 'error' : 'done');

    // Retour à idle après 3 s pour ne pas garder l'indicateur
    setTimeout(() => setStatus('idle'), 3000);
  },
};

function getEndpoints(role: Role): string[] {
  const today = new Date().toISOString().split('T')[0];
  const d = new Date();
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

  const AGENT = [
    '/dashboard/agent',
    '/assignments/my',
    '/incidents/my',
    '/rounds/my',
    '/rounds/today',
    '/presences/my',
    `/timesheets/week?date=${today}`,
  ];

  const CONTROLEUR = [
    '/dashboard/controleur',
    '/presences/pending',
    '/presences/today',
    '/rounds',
    '/rounds/pending-validation',
    '/incidents',
    '/incidents/open',
    '/users/agents',
    '/reports/my-sites',
    '/reports/my-agents',
    `/reports/summary?startDate=${monthStart}&endDate=${today}`,
  ];

  const SUPERVISEUR = [
    '/dashboard/superviseur',
    '/sites',
    '/assignments',
    '/assignments/active',
    '/users/agents',
    '/users/controleurs',
    '/reports/my-sites',
    '/reports/my-agents',
    `/reports/summary?startDate=${monthStart}&endDate=${today}`,
  ];

  const ADMIN = [
    '/dashboard/admin',
    '/users',
    '/users/agents',
    '/users/controleurs',
    '/users/superviseurs',
    '/clients',
    '/sites',
    '/assignments',
    '/assignments/active',
    '/incidents',
    '/incidents/open',
    '/settings/public',
  ];

  const SUPERADMIN = [
    '/dashboard/superadmin',
    '/kpi/summary',
    '/audit',
    '/modules',
  ];

  switch (role) {
    case 'AGENT':       return AGENT;
    case 'CONTROLEUR':  return CONTROLEUR;
    case 'SUPERVISEUR': return SUPERVISEUR;
    case 'ADMIN':       return [...ADMIN, ...SUPERVISEUR];
    case 'SUPERADMIN':  return [...SUPERADMIN, ...ADMIN, ...SUPERVISEUR];
    default:            return [];
  }
}

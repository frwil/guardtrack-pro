'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../services/sw/register';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
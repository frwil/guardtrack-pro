'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '../services/sw/register';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Enregistrer le Service Worker côté client
    registerServiceWorker();
  }, []);

  useEffect(() => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
      console.log('SW désactivés');
    });
  }
}, []);

  // Ce composant ne rend rien visuellement
  return null;
}
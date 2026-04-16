export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('❌ Service Worker non supporté');
    return undefined;
  }

  try {
    // D'abord, désenregistrer tous les anciens Service Workers
    const oldRegistrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of oldRegistrations) {
      if (!reg.scope.includes(window.location.origin)) continue;
      await reg.unregister();
      console.log('🗑️ Ancien Service Worker désenregistré:', reg.scope);
    }

    // Enregistrer le nouveau Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    
    console.log('✅ Service Worker enregistré:', registration.scope);
    
    // Vérifier les mises à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('🔄 Nouveau Service Worker trouvé');
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('📢 Nouvelle version disponible - Rafraîchissez pour mettre à jour');
            // Optionnel : afficher une notification à l'utilisateur
          }
        });
      }
    });
    
    return registration;
  } catch (error) {
    console.error('❌ Erreur enregistrement Service Worker:', error);
    return undefined;
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
      console.log('✅ Service Worker désenregistré:', registration.scope);
    }
  } catch (error) {
    console.error('❌ Erreur désenregistrement:', error);
  }
}

export async function clearAllCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data?.success || false);
      };
      
      // Timeout après 3 secondes
      setTimeout(() => resolve(false), 3000);
      
      if (registration.active) {
        registration.active.postMessage(
          { type: 'CLEAR_CACHES' },
          [messageChannel.port2]
        );
      } else {
        resolve(false);
      }
    });
  } catch (error) {
    console.error('Erreur nettoyage caches:', error);
    return false;
  }
}
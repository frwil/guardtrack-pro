// Service Worker pour GuardTrack Pro
const CACHE_NAME = 'guardtrack-cache-v3';
const API_CACHE_NAME = 'guardtrack-api-cache-v3';

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activé');
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => {
              console.log('🗑️ Suppression du cache:', name);
              return caches.delete(name);
            })
        );
      }),
      self.clients.claim(),
    ])
  );
});

// Interception des requêtes fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // ✅ IGNORER les requêtes non-HTTP/HTTPS (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // ✅ IGNORER les requêtes API - ne pas mettre en cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // ✅ IGNORER les requêtes non-GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Stratégie Network First pour les assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Vérifier que la réponse est valide avant de la mettre en cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Mettre en cache la réponse
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch((err) => {
            console.warn('Erreur mise en cache:', err);
          });
        });
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, essayer le cache
        return caches.match(event.request);
      })
  );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      }).then(() => {
        console.log('✅ Tous les caches ont été supprimés');
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }
});
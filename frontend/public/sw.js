// Service Worker pour GuardTrack Pro
const CACHE_NAME = 'guardtrack-cache-v4';
const API_CACHE_NAME = 'guardtrack-api-cache-v4';

// Routes à pré-cacher comme app shell (accès offline garanti)
const APP_SHELL = [
  '/',
  '/login',
  '/dashboard/agent',
  '/dashboard/agent/rounds',
  '/dashboard/agent/incidents',
  '/dashboard/agent/schedule',
  '/dashboard/superviseur',
  '/dashboard/admin',
  '/dashboard/superadmin',
];

// Installation : pré-cache l'app shell
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            console.warn('Pré-cache échoué pour:', url);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activé');
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// Interception des requêtes fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  // API calls : network-first avec mise en cache des réponses GET
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() =>
          // Offline : retourner la réponse API mise en cache si disponible
          caches.match(event.request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: 'OFFLINE', offline: true }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              })
          )
        )
    );
    return;
  }

  // Navigation (pages HTML) : network-first, fallback cache, puis app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() =>
          // Offline : page exacte en cache, sinon root (app shell)
          caches.match(event.request).then(
            (cached) => cached || caches.match('/')
          )
        )
    );
    return;
  }

  // Assets statiques (_next/static, images, fonts) : cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone).catch(() => {});
              });
            }
            return response;
          })
      )
    );
    return;
  }

  // Tout le reste : network-first avec cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Messages du client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }
});

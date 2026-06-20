// Service Worker — Carbon & Cheddar PWA
const CACHE = 'cc-pwa-v4';

// En install: pre-cachear la shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.add('/'))
  );
  self.skipWaiting();
});

// En activate: eliminar cachés viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// En fetch: estrategia por tipo de recurso
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Solo GET, solo mismo origen (no interceptar Supabase)
  if (e.request.method !== 'GET') return;
  if (url.hostname !== location.hostname) return;

  if (e.request.mode === 'navigate') {
    // Navegación: red primero, caché como fallback offline
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/'))
    );
  } else if (url.pathname.startsWith('/assets/')) {
    // Assets hasheados de Vite: caché primero (no cambian)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  } else {
    // Otros recursos estáticos (iconos, manifest): red primero
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});

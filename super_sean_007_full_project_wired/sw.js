/* Super Sean 007 — service worker for installable, offline-capable play.
   Navigation: network-first with cached shell fallback.
   Static assets (hashed by the build): stale-while-revalidate runtime cache. */
const VERSION = 'ssg-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL).then(cache => cache.addAll(['/', '/index.html'])).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isStatic(url) {
  return /\.(?:js|css|png|jpg|jpeg|webp|gif|svg|wav|mp3|woff2?|ico|json)$/i.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache the API (saves, party, analytics) — always go to network.
  if (url.pathname.startsWith('/api/')) return;
  // Only handle same-origin; let cross-origin (ads, fonts) pass through.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(SHELL).then(cache => cache.put('/', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/').then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.open(RUNTIME).then(async cache => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

/* Super Sean 007 service worker. The build replaces __BUILD_VERSION__ with
   the Cloudflare/GitHub commit SHA so every production deployment gets a fresh
   cache namespace. */
const VERSION = 'ssg-__BUILD_VERSION__';
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
      keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isStatic(url) {
  return /\.(?:css|png|jpg|jpeg|webp|gif|svg|wav|mp3|ogg|woff2?|ico)$/i.test(url.pathname);
}

function isFreshnessCritical(url) {
  return /\.(?:js|json|webmanifest)$/i.test(url.pathname) || url.pathname === '/site.webmanifest';
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return cache.match(request);
  }
}

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/stats.html') return;
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && response.status !== 404) {
            caches.open(SHELL).then(cache => cache.put('/', response.clone())).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/').then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (isFreshnessCritical(url)) {
    event.respondWith(networkFirst(request, RUNTIME));
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

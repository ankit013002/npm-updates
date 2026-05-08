const CACHE = 'npm-tracker-v2';
const APP_SHELL = ['/favicon.ico'];
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const IS_LOCAL = LOCAL_HOSTS.has(self.location.hostname);

self.addEventListener('install', event => {
  event.waitUntil(
    IS_LOCAL
      ? Promise.resolve()
      : caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('npm-tracker') && (IS_LOCAL || key !== CACHE))
            .map(key => caches.delete(key))
        )
      )
      .then(() => (IS_LOCAL ? self.registration.unregister() : undefined))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin and non-GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (IS_LOCAL || url.pathname.startsWith('/_next/') || url.pathname === '/sw.js') {
    event.respondWith(fetch(request));
    return;
  }

  // API routes: network-first, no offline fallback (data must be fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations must use the newest HTML so the hydrated client bundle matches it.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      return cached ?? networkFetch;
    })
  );
});

// ListenHub PWA Service Worker with Safe Production-Only Caching
const APP_VERSION = 'listenhub-v2.0.0';
const CACHE_NAME = `listenhub-cache-${APP_VERSION}`;

const CORE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon.svg',
  '/covers/duman.jpg',
  '/covers/morveotesi.jpg',
  '/covers/arctic.jpg',
  '/covers/jakuzi.jpg',
  '/covers/teoman.jpg',
  '/covers/shepastaway.jpg'
];

// 1. Install Event: Cache static icons/covers and immediately skip waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW] Core assets pre-caching non-fatal warning:', err);
      });
    })
  );
});

// 2. Activate Event: Clean up ALL legacy caches (including stale Vite module caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return Promise.resolve(false);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Message Event: Allow client app to trigger immediate skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// 4. Fetch Event:
// - NEVER intercept Vite dev modules (/src/, /node_modules/, /@vite/, /@fs/, ?v=, ?t=), API routes, or cross-origin requests.
// - Navigation requests: Network-first.
// - Production static assets only: Stale-While-Revalidate.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // Never intercept cross-origin requests (APIs, YouTube, Google Fonts, tiles, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache Vite dev server modules, source TS/TSX files, HMR endpoints, or backend API routes
  const pathname = url.pathname;
  if (
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/api/') ||
    pathname === '/sw.js' ||
    url.searchParams.has('v') ||
    url.searchParams.has('t') ||
    pathname.endsWith('.ts') ||
    pathname.endsWith('.tsx')
  ) {
    return;
  }

  // HTML / Page Navigation: Network First with Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Only cache static production assets (images, icons, manifest, built /assets/ chunks)
  const isCacheableStatic =
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/covers/') ||
    pathname === '/manifest.json' ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(pathname);

  if (!isCacheableStatic) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

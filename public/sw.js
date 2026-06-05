// ============================================
// AsefAI — Service Worker
// Cache static assets untuk offline support
// ============================================

const CACHE_NAME = 'asefai-v2';

// File yang di-cache saat install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/app.js',
  '/auth.js',
  '/manifest.json',
  '/vendor/highlight.min.js',
  '/vendor/github-dark-dimmed.min.css',
  '/vendor/marked.min.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate — hapus cache lama ────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch — cache first untuk static, network first untuk API ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — selalu ke network, jangan cache
  if (url.pathname.startsWith('/api/')) {
    return; // biarkan browser handle normal
  }

  // Firebase & Google APIs — jangan cache
  if (url.hostname.includes('firebase') || url.hostname.includes('google') || url.hostname.includes('gstatic')) {
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Cache response baru kalau valid
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback untuk HTML pages
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

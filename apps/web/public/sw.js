// Tsua PWA Service Worker
// Handles offline caching and background sync

const CACHE_NAME = 'tsua-v1';
const STATIC_ASSETS = [
  '/',
  '/he',
  '/en',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install — pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently fail if some assets don't exist yet
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - API routes: network-first (always fresh), fallback to cache
// - Static assets: cache-first, update in background
// - Navigation: network-first, fallback to cached /he
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // API routes: network only (never cache)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // Static assets (fonts, icons, js chunks): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Navigation requests: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/he') || caches.match('/') || new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>תשואה — Offline</title>
          <style>body{font-family:sans-serif;background:#080d1a;color:#d4e4ff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}
          h1{color:#00e5b0;font-size:2rem;} p{color:#5a7090;margin-top:1rem;}</style></head>
          <body><div><div style="font-size:3rem">📡</div><h1>אין חיבור לאינטרנט</h1><p>Offline — check your connection and try again</p></div></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  const title = data.title || 'תשואה';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tsua-notification',
    data: { url: data.url || '/he' },
    dir: 'rtl',
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Browser rotated subscription — re-register silently
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    fetch('/api/push/resubscribe', { method: 'POST', credentials: 'include' }).catch(() => {})
  );
});

// Notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/he';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.navigate(url).then(() => client.focus());
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

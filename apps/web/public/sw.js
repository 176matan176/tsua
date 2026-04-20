// Tsua Service Worker — KILL SWITCH
//
// A previous version of this worker used a cache-first strategy for
// /_next/static/* which caused clients to keep serving stale (and in
// some deploys, broken) JavaScript chunks even after a fresh deploy.
//
// This version exists only to unregister itself and drop every cache
// it owns. Once this has been served to every active client we can
// ship a proper offline-aware worker again — but only with cache keys
// that include the deploy hash so stale bundles can never stick.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}

    try { await self.registration.unregister(); } catch {}

    try {
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) {
        try { client.navigate(client.url); } catch {}
      }
    } catch {}
  })());
});

self.addEventListener('fetch', () => {
  // intentional no-op — pass every request straight to network
});

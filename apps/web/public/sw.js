// Tsua Service Worker — proper offline + web push
//
// Cache strategy:
//   - HTML navigations: network-first (so deploys are picked up on next nav)
//   - /_next/static/*:  cache-first (bundles are content-hashed; safe forever)
//   - /icons, /fonts:   stale-while-revalidate
//   - /api/*:           never cache (always fresh)
//
// Cache keys are namespaced by VERSION below. Bump the version when the
// caching logic itself changes — content URLs that include hashes auto-
// invalidate without a version bump because each new file lands at a new path.
const VERSION    = 'tsua-v2-2026-04-26';
const SHELL      = `${VERSION}-shell`;
const STATIC     = `${VERSION}-static`;
const PRECACHE   = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// ─── lifecycle ─────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL);
      // addAll fails if any URL fails — use individual puts to be lenient
      await Promise.all(PRECACHE.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await cache.put(url, res);
        } catch { /* ignore individual failures */ }
      }));
    } catch { /* installation never aborts */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop any cache from a previous version
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)),
      );
    } catch { /* ignore */ }
    await self.clients.claim();
  })());
});

// ─── fetch ─────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API or Next.js dynamic data — always go to network
  if (url.pathname.startsWith('/api/'))         return;
  if (url.pathname.startsWith('/_next/data/'))  return;
  if (url.pathname.startsWith('/_next/image'))  return;

  // Hashed Next.js bundles → cache-first (immutable URLs)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }

  // Static assets we ship → SWR
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?|ttf)$/i.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req, STATIC));
    return;
  }

  // HTML navigations → network-first
  const isNav = req.mode === 'navigate' ||
                (req.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    event.respondWith(networkFirst(req, SHELL));
    return;
  }
});

// ─── strategies ────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkP = fetch(request)
    .then(res => {
      if (res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => cached);
  return cached || networkP;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone()).catch(() => {});
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Last-resort fallback to the home shell so users see *something*
    const shell = await cache.match('/');
    if (shell) return shell;
    return new Response(
      '<!doctype html><meta charset="utf-8"><title>תשואה</title>' +
      '<div style="font-family:system-ui;padding:2rem;text-align:center;color:#e8f0ff;background:#060b16;min-height:100vh">' +
      '<div style="font-size:3rem">📡</div>' +
      '<h1 style="font-weight:900">אופליין</h1>' +
      '<p style="color:#5a7090">לא הצלחנו לטעון. נסה לרענן כשהחיבור חוזר.</p>' +
      '</div>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }
}

// ─── web push ──────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch {
    try { payload = { title: 'תשואה', body: event.data?.text() || '' }; }
    catch { payload = {}; }
  }

  const title = payload.title || 'תשואה';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: { url: payload.url || '/', ...payload.data },
    tag:  payload.tag,                       // dedupe by tag
    renotify: !!payload.renotify,
    requireInteraction: !!payload.requireInteraction,
    dir: 'rtl',
    lang: 'he',
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Focus an existing same-origin tab if possible
    for (const client of all) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        try {
          await client.focus();
          if ('navigate' in client) await client.navigate(url);
          return;
        } catch { /* fall through to openWindow */ }
      }
    }
    // Otherwise open a fresh window
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});

// ─── messages from the page ────────────────────────────────────────────────
// Lets the app force-skip-waiting on update without a full page reload.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

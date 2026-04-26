'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js for PWA features:
 *
 *   - Offline shell + cached static assets (cache-first for hashed Next.js
 *     bundles, network-first for HTML navigations).
 *   - Web Push notifications (the SW listens for `push` events and forwards
 *     them to `Notification`).
 *
 * History note: an older build cached `/_next/static/*` aggressively without
 * versioned cache keys, which trapped clients on broken JS chunks across
 * deploys. We later shipped a "kill-switch" SW that unregistered itself.
 * The current SW uses `VERSION`-prefixed cache names so old caches are
 * dropped on each major change, and Next.js's content-hashed URLs make
 * per-deploy invalidation automatic for the bundle layer.
 *
 * On every page load we call `registration.update()` so a fresh deploy is
 * picked up promptly without requiring the user to fully restart the
 * browser.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // skip in dev

    let cancelled = false;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        if (cancelled) return;

        // If a worker is already waiting (deploy happened while this tab was
        // sitting in the background), nudge it to take over now.
        if (registration.waiting) {
          registration.waiting.postMessage('SKIP_WAITING');
        }

        // Watch for new versions installed on this load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new worker is waiting — let it take over silently
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        });

        // Force a check for a newer SW on each navigation
        try { await registration.update(); } catch { /* network blip — fine */ }
      } catch (err) {
        // Registration failures are non-fatal — the site still works,
        // it just won't get offline support or push on this device.
        console.warn('[ServiceWorker] register failed', err);
      }
    })();

    // Auto-reload once the new SW takes over — keeps the SPA's JS in sync
    // with whatever HTML/JS the new SW will now serve.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}

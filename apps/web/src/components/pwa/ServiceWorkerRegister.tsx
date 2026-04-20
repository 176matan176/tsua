'use client';

import { useEffect } from 'react';

/**
 * Temporarily a NO-OP registration component.
 *
 * An older version of our service worker used a cache-first strategy
 * for /_next/static/* which served stale (and sometimes broken)
 * bundles after a redeploy. We're shipping a kill-switch sw.js at
 * /sw.js that unregisters itself and wipes all caches — but we must
 * also stop re-registering it here, otherwise the browser would just
 * re-install the worker after it unregisters.
 *
 * To be safe, this component also proactively unregisters any worker
 * that's still hanging around from the previous install and drops any
 * CacheStorage entries it owns. Once production has been stable for
 * a few days we can re-introduce a fresh, well-scoped worker.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try { await reg.unregister(); } catch {}
        }
      } catch {}

      try {
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
    })();
  }, []);

  return null;
}

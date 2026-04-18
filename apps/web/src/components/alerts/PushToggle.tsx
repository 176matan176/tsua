'use client';

import { useEffect, useState } from 'react';
import { BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';

type Status = 'unsupported' | 'denied' | 'default' | 'subscribed' | 'loading';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'subscribed' : 'default');
      } catch {
        setStatus('default');
      }
    })();
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'default');
        return;
      }
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (!keyRes.ok) throw new Error('המפתח הציבורי לא זמין');
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON() as any;
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      if (!res.ok) throw new Error('שמירת המנוי נכשלה');
      setStatus('subscribed');
    } catch (e: any) {
      setError(e.message || 'שגיאה ברישום להתראות');
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('default');
    } catch (e: any) {
      setError(e.message || 'שגיאה בביטול');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return <div className="text-[11px] text-[var(--muted)]">טוען…</div>;
  }

  if (status === 'unsupported') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted)' }}
      >
        <BellSlashIcon className="w-4 h-4" />
        <span>הדפדפן לא תומך ב-Web Push</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px]"
        style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.25)', color: '#ffb0b0' }}
      >
        <BellSlashIcon className="w-4 h-4" />
        <span>התראות חסומות — אפשר מהדפדפן</span>
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold"
          style={{
            background: 'rgba(0,229,176,0.1)',
            border: '1px solid rgba(0,229,176,0.3)',
            color: '#00e5b0',
          }}
        >
          <BellAlertIcon className="w-4 h-4" />
          <span>התראות מופעלות בדפדפן</span>
        </div>
        <button
          onClick={unsubscribe}
          disabled={busy}
          className="text-[11px] px-2 py-1 rounded hover:underline"
          style={{ color: 'var(--muted)' }}
        >
          {busy ? '…' : 'ביטול'}
        </button>
      </div>
    );
  }

  // default
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={subscribe}
        disabled={busy}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-black transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #00e5b0, #00a884)',
          color: '#060b16',
          boxShadow: '0 2px 12px rgba(0,229,176,0.3)',
        }}
      >
        <BellAlertIcon className="w-4 h-4" />
        <span>{busy ? 'רושם…' : 'הפעל התראות בדפדפן'}</span>
      </button>
      {error && <span className="text-[11px]" style={{ color: '#ff8080' }}>{error}</span>}
    </div>
  );
}

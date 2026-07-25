'use client';

import { useEffect, useState } from 'react';
import { BellAlertIcon, BellSlashIcon, BellIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon as BellAlertIconSolid } from '@heroicons/react/24/solid';

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

  // בדיקת קצה-לקצה: שולח התראת דוגמה למכשירים של המשתמש דרך /api/push/test.
  // קיים כי ב-PWA מותקן (במיוחד iOS) אין שורת כתובת לגלוש אליה ידנית.
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function sendTest() {
    setTestState('sending');
    setTestMsg(null);
    try {
      const res = await fetch('/api/push/test');
      const json = await res.json();
      if (res.ok && json.ok) {
        setTestState('sent');
        setTestMsg(`נשלחה ל-${json.delivered} מתוך ${json.devices} מכשירים — בדוק את ההתראות 🎉`);
      } else {
        setTestState('failed');
        setTestMsg(json.hint || json.error || `שגיאה ${res.status}`);
      }
    } catch {
      setTestState('failed');
      setTestMsg('שגיאת רשת — נסה שוב');
    }
  }

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

  // ────────────────────────────────────────────────────────────
  // Compact single-line card — one clear action, mobile-friendly
  // ────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{
          background: 'var(--surface2, rgb(var(--rgb-card) / 0.5))',
          border: '1px solid var(--border, rgb(var(--rgb-border) / 0.6))',
        }}
      >
        <div className="w-8 h-8 rounded-lg animate-pulse shrink-0" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
        <div className="flex-1 h-3 rounded animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{
          background: 'var(--surface2, rgba(255,255,255,0.03))',
          border: '1px solid var(--border, rgb(var(--rgb-border) / 0.6))',
          color: 'var(--muted, var(--muted))',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgb(var(--rgb-border) / 0.5)' }}
        >
          <BellSlashIcon className="w-4 h-4" />
        </div>
        <span className="text-[12px] font-medium flex-1">הדפדפן לא תומך ב-Web Push</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{
          background: 'rgba(255,80,80,0.06)',
          border: '1px solid rgba(255,80,80,0.22)',
          color: 'var(--red)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)' }}
        >
          <BellSlashIcon className="w-4 h-4" />
        </div>
        <span className="text-[12px] font-semibold flex-1">התראות חסומות — יש לאפשר מהדפדפן</span>
      </div>
    );
  }

  if (status === 'subscribed') {
    return (
      <div className="space-y-2">
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--rgb-accent) / 0.10), rgb(var(--rgb-accent) / 0.04))',
          border: '1px solid rgb(var(--rgb-accent) / 0.28)',
          boxShadow: '0 0 0 1px rgb(var(--rgb-accent) / 0.04)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgb(var(--rgb-accent) / 0.15)',
            border: '1px solid rgb(var(--rgb-accent) / 0.3)',
            boxShadow: '0 0 10px rgb(var(--rgb-accent) / 0.2)',
          }}
        >
          <BellAlertIconSolid className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-black" style={{ color: 'var(--accent)' }}>
            התראות פעילות בדפדפן
          </div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--muted, var(--muted))' }}>
            נקבל התרעה ברגע שיעד מחיר נפרץ
          </div>
        </div>
        {/* iOS-style toggle switch */}
        <button
          onClick={unsubscribe}
          disabled={busy}
          className="relative w-10 h-[22px] rounded-full transition-all duration-200 disabled:opacity-50 shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
          }}
          aria-label="כבה התראות"
        >
          <div
            className="absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all duration-200"
            style={{
              right: 2,
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transform: busy ? 'scale(0.85)' : 'scale(1)',
            }}
          />
        </button>
      </div>

      {/* שליחת התראת בדיקה — מאמת את הצינור עד למכשיר עצמו */}
      <button
        onClick={sendTest}
        disabled={testState === 'sending'}
        className="w-full text-[12px] font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          background: 'rgb(var(--rgb-accent) / 0.08)',
          border: '1px dashed rgb(var(--rgb-accent) / 0.35)',
          color: 'var(--accent)',
        }}
      >
        {testState === 'sending' ? 'שולח…' : '🚀 שלח התראת בדיקה למכשיר הזה'}
      </button>
      {testMsg && (
        <div
          className="text-[11px] px-3 py-2 rounded-lg"
          style={
            testState === 'sent'
              ? {
                  background: 'rgb(var(--rgb-accent) / 0.08)',
                  border: '1px solid rgb(var(--rgb-accent) / 0.22)',
                  color: 'var(--accent)',
                }
              : {
                  background: 'rgb(var(--rgb-red) / 0.08)',
                  border: '1px solid rgb(var(--rgb-red) / 0.22)',
                  color: 'var(--red)',
                }
          }
        >
          {testState === 'sent' ? '✓ ' : '⚠ '}{testMsg}
        </div>
      )}
      </div>
    );
  }

  // default — not subscribed, can enable
  return (
    <>
      <button
        onClick={subscribe}
        disabled={busy}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--rgb-accent) / 0.08), rgb(var(--rgb-accent) / 0.03))',
          border: '1px solid rgb(var(--rgb-accent) / 0.22)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgb(var(--rgb-accent) / 0.12)',
            border: '1px solid rgb(var(--rgb-accent) / 0.28)',
          }}
        >
          <BellIcon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0 text-start">
          <div className="text-[12px] font-black" style={{ color: 'var(--text, var(--text))' }}>
            {busy ? 'רושם…' : 'הפעל התראות בדפדפן'}
          </div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--muted, var(--muted))' }}>
            עדכון מיידי כשיעד מחיר נפרץ
          </div>
        </div>
        {/* Off toggle */}
        <div
          className="relative w-10 h-[22px] rounded-full shrink-0"
          style={{
            background: 'rgb(var(--rgb-border) / 0.8)',
            border: '1px solid rgb(var(--rgb-border) / 0.9)',
          }}
        >
          <div
            className="absolute top-0.5 w-[18px] h-[18px] rounded-full"
            style={{
              left: 2,
              background: 'rgb(var(--rgb-muted) / 0.9)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </button>
      {error && (
        <div
          className="mt-2 text-[11px] px-3 py-2 rounded-lg"
          style={{
            background: 'rgb(var(--rgb-red) / 0.08)',
            border: '1px solid rgb(var(--rgb-red) / 0.22)',
            color: 'var(--red)',
          }}
        >
          ⚠ {error}
        </div>
      )}
    </>
  );
}

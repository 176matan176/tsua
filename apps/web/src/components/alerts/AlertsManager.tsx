'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { BellIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Alert {
  id: string;
  ticker: string;
  name_he: string;
  name_en: string;
  alert_type: 'price_above' | 'price_below' | 'volume_spike' | 'news';
  threshold?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

const ALERT_TYPES = [
  { value: 'price_above', labelHe: 'מחיר מעל', labelEn: 'Price Above', icon: '▲', color: '#00e5b0' },
  { value: 'price_below', labelHe: 'מחיר מתחת', labelEn: 'Price Below', icon: '▼', color: '#ff4d6a' },
  { value: 'volume_spike', labelHe: 'קפיצת מחזור', labelEn: 'Volume Spike', icon: '⚡', color: '#f5b942' },
  { value: 'news', labelHe: 'חדשות', labelEn: 'News Alert', icon: '📰', color: '#3b82f6' },
];

function CreateAlertModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [ticker, setTicker] = useState('');
  const [alertType, setAlertType] = useState<string>('price_above');
  const [threshold, setThreshold] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const needsThreshold = alertType === 'price_above' || alertType === 'price_below';

  async function submit() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          alertType,
          threshold: needsThreshold && threshold ? parseFloat(threshold) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-4 animate-slide-up"
        style={{ background: 'rgba(13,20,36,0.98)', border: '1px solid rgba(26,40,64,0.9)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-tsua-text">
            🔔 {'התראה חדשה'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-tsua-muted hover:text-tsua-text transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Ticker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-tsua-muted block">{'סימבול מניה'}</label>
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase().replace(/[^A-Z.]/g, ''))}
            placeholder="TEVA / NVDA / AAPL"
            dir="ltr"
            className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all"
            style={{ background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(26,40,64,0.8)', color: '#e8f0ff' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.07)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,40,64,0.8)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Alert type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-tsua-muted block">{'סוג התראה'}</label>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setAlertType(t.value)}
                className="py-2 px-3 rounded-xl text-xs font-bold transition-all text-start"
                style={alertType === t.value
                  ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}40` }
                  : { background: 'rgba(15,25,41,0.6)', color: '#5a7090', border: '1px solid rgba(26,40,64,0.6)' }
                }
              >
                {t.icon} {t.labelHe}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold */}
        {needsThreshold && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tsua-muted block">{'ערך סף ($)'}</label>
            <input
              type="number"
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
              placeholder="0.00"
              dir="ltr"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none transition-all"
              style={{ background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(26,40,64,0.8)', color: '#e8f0ff' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.07)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(26,40,64,0.8)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        )}

        {error && (
          <div className="text-sm rounded-xl px-4 py-2 animate-fade-in" style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.25)', color: '#ff4d6a' }}>
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-tsua-muted"
            style={{ background: 'rgba(15,25,41,0.5)', border: '1px solid rgba(26,40,64,0.7)' }}>
            {'ביטול'}
          </button>
          <button
            onClick={submit}
            disabled={!ticker.trim() || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}>
            {loading ? '...' : 'צור התראה'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertsManager() {
  const locale = useLocale();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchAlerts() {
    if (!user) { setLoading(false); return; }
    const res = await fetch('/api/alerts', { cache: 'no-store' });
    if (res.ok) setAlerts(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchAlerts(); }, [user]);

  async function deleteAlert(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
  }

  async function toggleAlert(id: string, current: boolean) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BellSolid className="w-12 h-12 mb-4 opacity-20 text-tsua-muted" />
        <h2 className="text-lg font-black text-tsua-text mb-2">{'התראות מחיר'}</h2>
        <p className="text-tsua-muted text-sm mb-6">{'התחבר כדי ליצור התראות'}</p>
        <Link href={`/${locale}/login`} className="px-6 py-2.5 rounded-xl text-tsua-bg font-black text-sm" style={{ background: 'linear-gradient(135deg,#00e5b0,#00c49a)' }}>
          {'כניסה'}
        </Link>
      </div>
    );
  }

  return (
    <>
      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchAlerts}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-tsua-text">
            🔔 {'התראות'}
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-tsua-bg transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 12px rgba(0,229,176,0.25)' }}
          >
            <PlusIcon className="w-4 h-4" />
            {'התראה חדשה'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.7)' }} />
            ))}
          </div>
        )}

        {/* Alerts list */}
        {!loading && alerts.map(alert => {
          const typeInfo = ALERT_TYPES.find(t => t.value === alert.alert_type);
          return (
            <div
              key={alert.id}
              className="rounded-2xl p-4 flex items-center justify-between gap-3 transition-all"
              style={{
                background: 'rgba(13,20,36,0.7)',
                border: alert.is_active ? '1px solid rgba(26,40,64,0.7)' : '1px solid rgba(26,40,64,0.4)',
                opacity: alert.is_active ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0"
                  style={{ background: `${typeInfo?.color}15`, border: `1px solid ${typeInfo?.color}25` }}
                >
                  {typeInfo?.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span dir="ltr" className="font-black text-tsua-text font-mono text-sm">${alert.ticker}</span>
                    <span className="text-xs font-semibold" style={{ color: typeInfo?.color ?? '#5a7090' }}>
                      {typeInfo?.labelHe}
                    </span>
                    {alert.threshold && (
                      <span dir="ltr" className="text-xs font-bold font-mono" style={{ color: '#e8f0ff' }}>
                        ${alert.threshold.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {alert.triggered_at && (
                    <div className="text-[11px] text-tsua-muted mt-0.5">
                      {'הופעל:'} {new Date(alert.triggered_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Status badge */}
                <button
                  onClick={() => toggleAlert(alert.id, alert.is_active)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                  style={alert.is_active
                    ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }
                    : { background: 'rgba(90,112,144,0.12)', color: '#5a7090', border: '1px solid rgba(90,112,144,0.2)' }
                  }
                >
                  {alert.is_active ? '● פעיל' : '○ הופעל'}
                </button>
                {/* Delete */}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-1.5 rounded-lg text-tsua-muted hover:text-tsua-red transition-colors hover:bg-red-500/10"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty */}
        {!loading && alerts.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
            style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
          >
            <BellIcon className="w-12 h-12 mb-3 text-tsua-muted opacity-30" />
            <p className="text-tsua-muted text-sm font-medium mb-4">
              {'אין התראות פעילות'}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm font-bold px-4 py-2 rounded-xl text-tsua-bg"
              style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
            >
              + {'צור התראה ראשונה'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

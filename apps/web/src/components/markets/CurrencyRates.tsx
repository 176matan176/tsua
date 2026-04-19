'use client';

import { useEffect, useState } from 'react';

interface Rate {
  code: string;
  label: string;
  flag: string;
  rate: number | null;
  change: number | null;
  changePercent: number | null;
}

const DEFAULTS: Rate[] = [
  { code: 'USD', label: 'דולר',  flag: '🇺🇸', rate: null, change: null, changePercent: null },
  { code: 'EUR', label: 'יורו',  flag: '🇪🇺', rate: null, change: null, changePercent: null },
  { code: 'GBP', label: 'פאונד', flag: '🇬🇧', rate: null, change: null, changePercent: null },
  { code: 'JPY', label: 'ין',    flag: '🇯🇵', rate: null, change: null, changePercent: null },
];

export function CurrencyRates() {
  const [rates, setRates] = useState<Rate[]>(DEFAULTS);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;

    async function fetchRates() {
      try {
        // Server-side endpoint pulls from Yahoo Finance (live intraday FX).
        const res = await fetch('/api/fx', { cache: 'no-store' });
        if (!res.ok) throw new Error('fx api failed');
        const data = await res.json();
        if (!alive) return;

        if (Array.isArray(data?.rates) && data.rates.length) {
          setRates(data.rates.map((r: Rate) => ({
            code: r.code,
            label: r.label,
            flag: r.flag,
            rate: r.rate,
            change: r.change,
            changePercent: r.changePercent,
          })));
          const ts = data.updatedAt ? new Date(data.updatedAt) : new Date();
          setUpdated(ts.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
          setError(false);
        } else {
          throw new Error('no data');
        }
      } catch {
        if (!alive) return;
        setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchRates();
    // Refresh every 60 seconds so the widget actually feels live.
    const timer = setInterval(fetchRates, 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">💱 שערי חליפין</h3>
        {updated && !error && (
          <span className="flex items-center gap-1.5 text-[10px] text-tsua-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e5b0' }} />
            עודכן {updated}
          </span>
        )}
        {error && (
          <span className="text-[10px]" style={{ color: '#ff4d6a' }}>שגיאת טעינה</span>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }}>
        {rates.map(r => {
          const isUp = (r.changePercent ?? 0) >= 0;
          return (
            <div key={r.code} className="flex items-center justify-between px-4 py-3 hover:bg-white/2 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-base">{r.flag}</span>
                <div>
                  <span className="text-sm font-bold text-tsua-text">{r.label}</span>
                  <span className="text-[10px] text-tsua-muted ms-1.5">{r.code}</span>
                </div>
              </div>
              <div className="text-end">
                {loading || r.rate === null ? (
                  <div className="w-16 h-4 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
                ) : (
                  <div>
                    <span className="text-sm font-black font-mono" style={{ color: '#c8d8f0' }} dir="ltr">
                      ₪{r.rate.toFixed(r.rate < 1 ? 4 : 3)}
                    </span>
                    {r.changePercent != null && (
                      <div className="text-[11px] font-semibold text-end" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
                        {isUp ? '▲' : '▼'} {Math.abs(r.changePercent).toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
        <p className="text-[10px] text-tsua-muted text-center">
          מחיר ₪ לכל מטבע · מתעדכן כל דקה
        </p>
      </div>
    </div>
  );
}

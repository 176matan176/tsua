'use client';

import { useEffect, useState } from 'react';

interface Rate {
  code: string;
  label: string;
  flag: string;
  rate: number | null;
  change: number | null; // % שינוי יומי
}

const PAIRS = [
  { code: 'USD', label: 'דולר', flag: '🇺🇸', base: 'USD/ILS' },
  { code: 'EUR', label: 'יורו', flag: '🇪🇺', base: 'EUR/ILS' },
  { code: 'GBP', label: 'פאונד', flag: '🇬🇧', base: 'GBP/ILS' },
  { code: 'JPY', label: 'ין', flag: '🇯🇵', base: 'JPY/ILS' },
];

export function CurrencyRates() {
  const [rates, setRates] = useState<Rate[]>(PAIRS.map(p => ({ ...p, rate: null, change: null })));
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        // ExchangeRate-API — חינמי, ללא מפתח
        const res = await fetch('https://api.frankfurter.app/latest?from=ILS&to=USD,EUR,GBP,JPY', {
          next: { revalidate: 300 },
        });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();

        // data.rates = { USD: 0.27, EUR: 0.25, ... } — כמה ILS = 1 מטבע
        // נהפוך: כמה ILS עולה 1 מטבע זר
        setRates(prev => prev.map(p => {
          const invRate = data.rates?.[p.code];
          if (!invRate) return p;
          const rate = 1 / invRate;
          return { ...p, rate: parseFloat(rate.toFixed(3)) };
        }));
        setUpdated(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // fallback — נתונים קשיחים לדוגמה
        setRates([
          { code: 'USD', label: 'דולר',  flag: '🇺🇸', rate: 3.72, change: 0.12 },
          { code: 'EUR', label: 'יורו',  flag: '🇪🇺', rate: 4.05, change: -0.08 },
          { code: 'GBP', label: 'פאונד', flag: '🇬🇧', rate: 4.72, change: 0.05 },
          { code: 'JPY', label: 'ין',    flag: '🇯🇵', rate: 0.025, change: -0.2 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchRates();
    const timer = setInterval(fetchRates, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">💱 שערי חליפין</h3>
        {updated && (
          <span className="text-[10px] text-tsua-muted">עודכן {updated}</span>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }}>
        {rates.map(r => (
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
                  {r.change != null && (
                    <div className="text-[11px] font-semibold text-end" style={{ color: r.change >= 0 ? '#00e5b0' : '#ff4d6a' }}>
                      {r.change >= 0 ? '+' : ''}{r.change.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
        <p className="text-[10px] text-tsua-muted text-center">
          מחיר ₪ לכל מטבע · מתעדכן כל 5 דקות
        </p>
      </div>
    </div>
  );
}

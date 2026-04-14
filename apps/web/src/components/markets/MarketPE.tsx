'use client';

import { useEffect, useState } from 'react';

interface PERow {
  symbol: string;
  nameHe: string;
  flag: string;
  pe: number | null;
  forward: boolean;
}

// These update via Finnhub metrics; fallback to well-known estimates
const INDEX_LIST: Omit<PERow, 'pe'>[] = [
  { symbol: 'SPY',  nameHe: 'S&P 500',    flag: '🇺🇸', forward: false },
  { symbol: 'QQQ',  nameHe: 'נאסד"ק 100', flag: '🇺🇸', forward: false },
  { symbol: 'DIA',  nameHe: 'דאו ג\'ונס',  flag: '🇺🇸', forward: false },
  { symbol: 'EIS',  nameHe: 'ת"א 35',     flag: '🇮🇱', forward: false },
];

const FALLBACK: Record<string, number> = {
  SPY: 21.8,
  QQQ: 31.5,
  DIA: 21.2,
  EIS: 14.3,
};

function PEBar({ pe, max = 50 }: { pe: number; max?: number }) {
  const pct = Math.min((pe / max) * 100, 100);
  const color = pe > 35 ? '#ff4d6a' : pe > 25 ? '#ffd166' : pe > 18 ? '#00e5b0' : '#c8d8f0';
  return (
    <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(26,40,64,0.5)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function MarketPE() {
  const [rows, setRows] = useState<PERow[]>(
    INDEX_LIST.map(r => ({ ...r, pe: FALLBACK[r.symbol] ?? null }))
  );
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const key = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';
        if (!key) throw new Error('no key');

        const results = await Promise.allSettled(
          INDEX_LIST.map(r =>
            fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${r.symbol}&metric=all&token=${key}`, {
              next: { revalidate: 3600 },
            }).then(res => res.json())
          )
        );

        setRows(prev => prev.map((row, i) => {
          const res = results[i];
          if (res.status === 'fulfilled') {
            const pe = res.value?.metric?.peAnnual ?? res.value?.metric?.peTTM ?? null;
            return { ...row, pe: pe ? parseFloat(pe.toFixed(1)) : (FALLBACK[row.symbol] ?? null) };
          }
          return row;
        }));
        setUpdated(new Date().toLocaleDateString('he-IL'));
      } catch {
        // keep fallback values
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">📐 מכפיל רווח מדדים</h3>
        {updated && <span className="text-[10px] text-tsua-muted">{updated}</span>}
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }} dir="rtl">
        {rows.map(r => {
          const color = r.pe
            ? r.pe > 35 ? '#ff4d6a' : r.pe > 25 ? '#ffd166' : r.pe > 18 ? '#00e5b0' : '#c8d8f0'
            : '#c8d8f0';
          return (
            <div key={r.symbol} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{r.flag}</span>
                  <span className="text-sm font-bold text-tsua-text">{r.nameHe}</span>
                </div>
                <div className="text-end">
                  {loading || r.pe === null ? (
                    <div className="w-12 h-4 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
                  ) : (
                    <span className="text-sm font-black font-mono" style={{ color }}>
                      {r.pe.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>
              {r.pe && !loading && <PEBar pe={r.pe} />}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          מכפיל רווח שנתי (P/E) · ירוק &lt;25 · צהוב 25-35 · אדום &gt;35
        </p>
      </div>
    </div>
  );
}

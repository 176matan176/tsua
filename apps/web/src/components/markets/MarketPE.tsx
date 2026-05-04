'use client';

import { useEffect, useState } from 'react';

interface PERow {
  symbol: string;
  nameHe: string;
  flag: string;
  pe: number | null;
  source: 'live' | 'estimate';
}

interface PEResponse {
  ratios: PERow[];
  updatedAt: number;
}

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes — P/E moves slowly
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // 6h — older than this, label the time as stale

// Skeleton rows are static — defined once at module scope so we don't reallocate
// the array on every render while the widget is loading.
const SKELETON_ROWS: PERow[] = [
  { symbol: 'SPY', nameHe: '...', flag: '⏳', pe: null, source: 'estimate' },
  { symbol: 'QQQ', nameHe: '...', flag: '⏳', pe: null, source: 'estimate' },
  { symbol: 'DIA', nameHe: '...', flag: '⏳', pe: null, source: 'estimate' },
  { symbol: 'EIS', nameHe: '...', flag: '⏳', pe: null, source: 'estimate' },
];

function PEBar({ pe, max = 50 }: { pe: number; max?: number }) {
  const pct = Math.min((pe / max) * 100, 100);
  const color = pe > 35 ? '#ff4d6a' : pe > 25 ? '#ffd166' : pe > 18 ? '#00e5b0' : '#c8d8f0';
  return (
    <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(26,40,64,0.5)' }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function MarketPE() {
  const [rows, setRows] = useState<PERow[]>([]);
  const [updated, setUpdated] = useState<number | null>(null);
  // Tracks whether the *latest* refresh attempt failed (independent of whether
  // we still have stale rows from a prior success). Without this, the user
  // sees "עודכן 14:32" with no hint that the 14:35 / 15:05 retries silently
  // failed and the data on screen is potentially hours behind reality.
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();

    async function load() {
      try {
        const res = await fetch('/api/markets/pe', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = (await res.json()) as PEResponse;
        if (ctrl.signal.aborted) return;
        setRows(json.ratios);
        setUpdated(json.updatedAt);
        setRefreshFailed(false);
      } catch (err) {
        // AbortError fires on unmount and isn't a real failure.
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Keep prior rows so the widget doesn't go blank, but flip the flag so
        // the header surfaces the failure honestly.
        setRefreshFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }

    load();
    const int = setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(int);
    };
  }, []);

  const isStale = updated !== null && Date.now() - updated > STALE_AFTER_MS;
  const showWarning = refreshFailed || isStale;
  const timeColor = showWarning ? '#ffd166' : undefined;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">📐 מכפיל רווח מדדים</h3>
        {updated && (
          <span
            className="text-[10px] tabular-nums flex items-center gap-1"
            style={{ color: timeColor }}
            title={
              refreshFailed
                ? `הרענון האחרון נכשל. הנתונים מתאריך ${new Date(updated).toLocaleString('he-IL')}`
                : isStale
                  ? `הנתונים ישנים (מ-${new Date(updated).toLocaleString('he-IL')})`
                  : new Date(updated).toLocaleString('he-IL')
            }
          >
            {showWarning && <span>⚠️</span>}
            <span className={showWarning ? '' : 'text-tsua-muted'}>עודכן {fmtTime(updated)}</span>
          </span>
        )}
        {!updated && refreshFailed && (
          <span className="text-[10px] text-tsua-muted">לא נטען</span>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }} dir="rtl">
        {(loading && rows.length === 0 ? SKELETON_ROWS : rows).map((r) => {
          const color = r.pe
            ? r.pe > 35 ? '#ff4d6a' : r.pe > 25 ? '#ffd166' : r.pe > 18 ? '#00e5b0' : '#c8d8f0'
            : '#c8d8f0';
          return (
            <div key={r.symbol} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{r.flag}</span>
                  <span className="text-sm font-bold text-tsua-text">{r.nameHe}</span>
                  {r.source === 'estimate' && r.pe !== null && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(200,216,240,0.12)', color: '#8a9bb3' }}
                      title="הנתון לא זמין דרך ה-API — מוצג ערך מקורב מעודכן רבעונית"
                    >
                      מקורב
                    </span>
                  )}
                </div>
                <div className="text-end">
                  {r.pe === null ? (
                    <div className="w-12 h-4 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
                  ) : (
                    <span className="text-sm font-black font-mono" style={{ color }}>
                      {r.pe.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>
              {r.pe !== null && <PEBar pe={r.pe} />}
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

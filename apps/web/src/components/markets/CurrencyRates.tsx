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

// After this much time without a successful refresh, mark the time as stale.
// 30 min handles weekends / midnight (Yahoo's FX feed pauses then) without
// crying wolf during normal trading hours.
const STALE_AFTER_MS = 30 * 60 * 1000;

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

export function CurrencyRates() {
  const [rates, setRates] = useState<Rate[]>(DEFAULTS);
  // Store a real Date (not a formatted string) so we can compute staleness.
  const [updated, setUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  // True when the *latest* attempt failed. Separate from "we have no data at
  // all" — the widget keeps rendering prior rows but warns honestly.
  const [refreshFailed, setRefreshFailed] = useState(false);
  // Which provider served this batch. The server can fall back to Frankfurter
  // (ECB end-of-day rates) when Yahoo is down — the user should know they're
  // looking at yesterday's close and not the live intraday rate.
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    async function fetchRates() {
      try {
        // Server-side endpoint pulls from Yahoo Finance (live intraday FX).
        const res = await fetch('/api/fx', { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error('fx api failed');
        const data = await res.json();
        if (ctrl.signal.aborted) return;

        if (Array.isArray(data?.rates) && data.rates.length) {
          setRates(data.rates.map((r: Rate) => ({
            code: r.code,
            label: r.label,
            flag: r.flag,
            rate: r.rate,
            change: r.change,
            changePercent: r.changePercent,
          })));
          setUpdated(data.updatedAt ? new Date(data.updatedAt) : new Date());
          setSource(typeof data.source === 'string' ? data.source : null);
          setRefreshFailed(false);
        } else {
          throw new Error('no data');
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setRefreshFailed(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }

    fetchRates();
    // Refresh every 60 seconds so the widget actually feels live.
    const timer = setInterval(fetchRates, 60 * 1000);
    // Tab returning to focus also triggers an immediate refresh — better
    // than waiting up to a full minute for the next tick after the user
    // came back from another tab.
    const onVis = () => { if (document.visibilityState === 'visible') fetchRates(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ctrl.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const isStale = updated !== null && Date.now() - updated.getTime() > STALE_AFTER_MS;
  const showWarning = refreshFailed || isStale;
  // Cold-fail = we never got any data at all (vs. "we have stale data plus a failed retry").
  const coldFail = refreshFailed && !updated;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">💱 שערי חליפין</h3>
        {updated && (
          <span
            className="flex items-center gap-1.5 text-[10px]"
            style={{ color: showWarning ? 'var(--gold)' : undefined }}
            title={
              refreshFailed
                ? `הרענון האחרון נכשל. מהזמן ${updated.toLocaleString('he-IL')}`
                : isStale
                  ? `הנתונים ישנים (מ-${updated.toLocaleString('he-IL')})`
                  : updated.toLocaleString('he-IL')
            }
          >
            {showWarning
              ? <span>⚠️</span>
              : <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse breathe-dot" style={{ background: 'var(--accent)' }} />
            }
            <span className={showWarning ? '' : 'text-tsua-muted'}>עודכן {fmtTime(updated)}</span>
          </span>
        )}
        {coldFail && (
          <span className="text-[10px]" style={{ color: 'var(--red)' }}>שגיאת טעינה</span>
        )}
      </div>

      <div className="divide-y" style={{ borderColor: 'rgb(var(--rgb-border) / 0.35)' }}>
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
                {/* Three explicit states:
                      - loading + no rate → skeleton (truthful first paint)
                      - cold-failed → "—" so the row doesn't spin forever
                      - has rate → render */}
                {r.rate === null && loading ? (
                  <div className="w-16 h-4 rounded animate-pulse breathe-shimmer" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
                ) : r.rate === null ? (
                  <span className="text-sm font-black font-mono text-tsua-muted" dir="ltr">—</span>
                ) : (
                  <div>
                    <span className="text-sm font-black font-mono" style={{ color: 'var(--text2)' }} dir="ltr">
                      ₪{r.rate.toFixed(r.rate < 1 ? 4 : 3)}
                    </span>
                    {r.changePercent != null && (
                      <div className="text-[11px] font-semibold text-end" style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
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

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        {/* When the server fell through to Frankfurter (ECB EOD rates), tell
            the user — otherwise they'll think the rates are live intraday
            when they're actually yesterday's 4pm Frankfurt close. */}
        {source && source !== 'yahoo' ? (
          <p className="text-[10px] text-center" style={{ color: 'var(--gold)' }}>
            ⚠️ שערים סופי יום (ECB) — Yahoo לא זמין
          </p>
        ) : (
          <p className="text-[10px] text-tsua-muted text-center">
            מחיר ₪ לכל מטבע · מתעדכן כל דקה
          </p>
        )}
      </div>
    </div>
  );
}

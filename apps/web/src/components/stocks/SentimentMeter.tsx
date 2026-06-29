'use client';

import { useState, useEffect } from 'react';

interface SentimentMeterProps {
  ticker: string;
}

interface SentimentData {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  change24h: number;
}

/** Runtime check — server may return an error envelope or wrong shape if the
 *  Supabase query failed. Without this, every numeric access falls to `0` and
 *  the UI quietly renders an empty meter as if there's just no community data. */
function isSentimentData(x: unknown): x is SentimentData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return typeof d.bullish === 'number' && typeof d.bearish === 'number'
      && typeof d.neutral === 'number' && typeof d.total === 'number';
}

export function SentimentMeter({ ticker }: SentimentMeterProps) {
  const [data, setData]         = useState<SentimentData | null>(null);
  const [loading, setLoading]   = useState(true);
  // Separate from "data is empty" — lets us tell the user the truth instead of
  // showing "אין מספיק נתונים" when the real cause is a DB error.
  const [errored, setErrored]   = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let inFlight: AbortController | null = null;
    setLoading(true);
    setAnimated(false);
    setErrored(false);

    // Community sentiment moves quickly as posts land. Poll every 2 min and
    // refresh immediately when the tab comes back into focus.
    const REFRESH_MS = 2 * 60 * 1000;

    async function load(isInitial: boolean) {
      inFlight?.abort();
      const ctrl = new AbortController();
      inFlight = ctrl;
      try {
        const r = await fetch(`/api/stocks/${ticker}/sentiment`, { signal: ctrl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const d: unknown = await r.json();
        if (ctrl.signal.aborted) return;
        if (isSentimentData(d)) {
          setData(d);
          setErrored(false);
          if (isInitial) setTimeout(() => setAnimated(true), 80);
        } else if (isInitial) {
          // Don't flip a healthy meter to error on a background-refresh blip.
          setErrored(true);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        if (isInitial) setErrored(true);
      } finally {
        if (!ctrl.signal.aborted && isInitial) setLoading(false);
      }
    }

    load(true);
    const interval = setInterval(() => load(false), REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      inFlight?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ticker]);

  // Skeleton
  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 space-y-4 animate-pulse"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="h-4 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-24 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Error state — distinct from the genuinely-empty path below. Same visual
  // weight (small card) so it doesn't dominate the page, but truthful copy.
  if (errored) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="text-2xl mb-2">📡</div>
        <div className="text-sm font-bold" style={{ color: 'var(--text2)' }}>
          לא ניתן לטעון סנטימנט כעת
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.total === 0) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="text-2xl mb-2">📊</div>
        <div className="text-sm font-bold" style={{ color: 'var(--text2)' }}>
          אין מספיק נתונים
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          היה הראשון לדון ב-${ticker}
        </div>
      </div>
    );
  }

  const sentimentLabel =
    data.bullish >= 65 ? 'אופטימי מאוד' :
    data.bullish >= 55 ? 'אופטימי'      :
    data.bullish >= 45 ? 'ניטרלי'       :
    data.bullish >= 35 ? 'פסימי'        :
    'פסימי מאוד';

  const sentimentColor =
    data.bullish >= 60 ? 'var(--accent)' :
    data.bullish >= 48 ? 'var(--gold)' :
    'var(--red)';

  const change24hPositive = data.change24h >= 0;

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          📊 סנטימנט קהילתי
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {data.total} פוסטים ב-24ש׳
          </span>
          {data.change24h !== 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={change24hPositive
                ? { background: 'rgb(var(--rgb-accent) / 0.12)', color: 'var(--accent)' }
                : { background: 'rgb(var(--rgb-red) / 0.12)', color: 'var(--red)' }
              }
            >
              {change24hPositive ? '▲' : '▼'} {Math.abs(data.change24h)}% מאתמול
            </span>
          )}
        </div>
      </div>

      {/* Main label */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black" style={{ color: sentimentColor }}>
          {sentimentLabel}
        </span>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: sentimentColor }}>
            {data.bullish}%
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>שוריים</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgb(var(--rgb-red) / 0.2)' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgb(var(--rgb-red) / 0.3)' }} />
          <div
            className="absolute top-0 start-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${data.bullish}%` : '0%',
              background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
              boxShadow: '0 0 8px rgb(var(--rgb-accent) / 0.4)',
            }}
          />
          <div
            className="absolute top-0 h-full"
            style={{
              right: `${data.bearish}%`,
              width: `${data.neutral}%`,
              background: 'rgb(var(--rgb-gold) / 0.25)',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: 'var(--accent)' }}>▲ שוריים {data.bullish}%</span>
          <span style={{ color: 'var(--gold)' }}>ניטרלי {data.neutral}%</span>
          <span style={{ color: 'var(--red)' }}>{data.bearish}% דוביים ▼</span>
        </div>
      </div>

      {/* Breakdown pills */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: '🐂 שוריים', value: data.bullish, color: 'var(--accent)', bg: 'rgb(var(--rgb-accent) / 0.08)',  border: 'rgb(var(--rgb-accent) / 0.2)'  },
          { label: '➡️ ניטרלי', value: data.neutral, color: 'var(--gold)', bg: 'rgb(var(--rgb-gold) / 0.08)', border: 'rgb(var(--rgb-gold) / 0.2)' },
          { label: '🐻 דוביים', value: data.bearish, color: 'var(--red)', bg: 'rgb(var(--rgb-red) / 0.08)', border: 'rgb(var(--rgb-red) / 0.2)' },
        ].map(item => (
          <div
            key={item.label}
            className="text-center rounded-xl py-2.5"
            style={{ background: item.bg, border: `1px solid ${item.border}` }}
          >
            <div className="text-lg font-black" style={{ color: item.color }}>{item.value}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
        מדד מבוסס פוסטים קהילתיים בלבד. אינו מהווה ייעוץ השקעות.
      </p>
    </div>
  );
}

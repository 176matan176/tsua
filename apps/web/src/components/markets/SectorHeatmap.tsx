'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

interface SectorQuote {
  key: string;
  nameHe: string;
  nameEn: string;
  emoji: string;
  etf: string;
  color: string;
  description: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  high: number | null;
  low: number | null;
}

interface SectorHeatmapProps {
  /** When 'compact', renders a 4-column grid for embedding in sidebars/pages.
   *  'full' renders a rich 3-column grid for the dedicated /sectors page. */
  variant?: 'compact' | 'full';
}

/**
 * Map a percent change to a background color using the classic
 * dark-red ↔ gray ↔ dark-green gradient. Intensity saturates at ±3%.
 */
function heatColor(pct: number | null): { bg: string; border: string; text: string } {
  // Theme-aware via CSS variables: in dark mode the --rgb-* triplets equal
  // the old literals exactly; in light mode the tokens resolve to the darker
  // readable palette (neon #00e5b0 text on cream was contrast ratio 1.3).
  if (pct == null) return { bg: 'rgb(var(--rgb-border) / 0.4)', border: 'rgb(var(--rgb-border) / 0.7)', text: 'rgb(var(--rgb-muted))' };
  const clamped = Math.max(-3, Math.min(3, pct));
  const intensity = Math.abs(clamped) / 3; // 0 → 1
  if (clamped >= 0) {
    // Green
    const alpha = 0.1 + intensity * 0.35;
    return {
      bg: `rgb(var(--rgb-accent) / ${alpha.toFixed(2)})`,
      border: `rgb(var(--rgb-accent) / ${(0.2 + intensity * 0.4).toFixed(2)})`,
      text: 'var(--accent)',
    };
  }
  // Red
  const alpha = 0.1 + intensity * 0.35;
  return {
    bg: `rgb(var(--rgb-red) / ${alpha.toFixed(2)})`,
    border: `rgb(var(--rgb-red) / ${(0.2 + intensity * 0.4).toFixed(2)})`,
    text: 'var(--red)',
  };
}

export function SectorHeatmap({ variant = 'full' }: SectorHeatmapProps) {
  const locale = useLocale();
  const [sectors, setSectors] = useState<SectorQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped on every successful load; lets the user see the freshness pulse
  // even though we don't show the timestamp explicitly in compact variant.
  const [errored, setErrored] = useState(false);
  // Force-rerun trigger for the retry button — increments to bust the
  // useEffect dependency and re-fire the loader without unmounting.
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();

    async function load() {
      try {
        // cache:'no-store' so the browser doesn't serve a stale response
        // ahead of our 60s interval (server side already does its own ISR).
        const r = await fetch('/api/sectors', { cache: 'no-store', signal: ctrl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const data = await r.json();
        if (ctrl.signal.aborted) return;
        if (Array.isArray(data.sectors) && data.sectors.length > 0) {
          setSectors(data.sectors);
          setErrored(false);
        } else {
          // API returned `{ sectors: [], error }` envelope — surface it.
          setErrored(true);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setErrored(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000); // refresh every minute
    // Tab return triggers an immediate refresh — sectors can move 1-2% in
    // the time the user spent on another tab.
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ctrl.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [retryKey]);

  const gridClass = variant === 'compact'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'
    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

  if (loading && !sectors) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl h-20 animate-pulse"
            style={{ background: 'rgba(26,40,64,0.4)' }}
          />
        ))}
      </div>
    );
  }

  // Honest error path: distinguish "API explicitly returned no data" from
  // "we never reached the network", and offer a retry. Without the button the
  // user is stuck waiting for the 60s interval to attempt again.
  if (!sectors || sectors.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center text-sm text-tsua-muted"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
      >
        <div className="text-2xl mb-1">📡</div>
        <div>{errored ? 'שגיאה בטעינת נתוני מגזרים' : 'אין נתוני מגזרים זמינים'}</div>
        <button
          onClick={() => { setLoading(true); setRetryKey(k => k + 1); }}
          className="mt-3 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-tsua-text hover:text-tsua-accent transition-colors"
          style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          🔄 נסה שוב
        </button>
      </div>
    );
  }

  // Sort by changePercent descending (winners on top)
  const sorted = [...sectors].sort((a, b) => {
    const av = a.changePercent ?? -Infinity;
    const bv = b.changePercent ?? -Infinity;
    return bv - av;
  });

  return (
    <div className={gridClass}>
      {sorted.map((s) => {
        const colors = heatColor(s.changePercent);
        const pctText = s.changePercent != null
          ? `${s.changePercent >= 0 ? '+' : ''}${s.changePercent.toFixed(2)}%`
          : '—';

        return (
          <Link
            key={s.key}
            href={`/${locale}/sectors/${s.key}`}
            className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.03] active:scale-95"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base shrink-0">{s.emoji}</span>
                  <span className="text-xs font-bold text-tsua-text truncate">
                    {s.nameHe}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-tsua-muted" dir="ltr">
                  {s.etf}
                </div>
              </div>
              <div
                className="text-xs font-black tabular-nums shrink-0"
                style={{ color: colors.text }}
                dir="ltr"
              >
                {pctText}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

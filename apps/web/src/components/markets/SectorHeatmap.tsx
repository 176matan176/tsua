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
  if (pct == null) return { bg: 'rgba(26,40,64,0.4)', border: 'rgba(26,40,64,0.7)', text: '#5a7090' };
  const clamped = Math.max(-3, Math.min(3, pct));
  const intensity = Math.abs(clamped) / 3; // 0 → 1
  if (clamped >= 0) {
    // Green
    const alpha = 0.1 + intensity * 0.35;
    return {
      bg: `rgba(0,229,176,${alpha.toFixed(2)})`,
      border: `rgba(0,229,176,${(0.2 + intensity * 0.4).toFixed(2)})`,
      text: '#00e5b0',
    };
  }
  // Red
  const alpha = 0.1 + intensity * 0.35;
  return {
    bg: `rgba(255,77,106,${alpha.toFixed(2)})`,
    border: `rgba(255,77,106,${(0.2 + intensity * 0.4).toFixed(2)})`,
    text: '#ff4d6a',
  };
}

export function SectorHeatmap({ variant = 'full' }: SectorHeatmapProps) {
  const locale = useLocale();
  const [sectors, setSectors] = useState<SectorQuote[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/sectors');
        const data = await r.json();
        if (!cancelled && Array.isArray(data.sectors)) {
          setSectors(data.sectors);
        }
      } catch {
        // ignore — keep loading skeleton visible
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000); // refresh every minute
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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

  if (!sectors || sectors.length === 0) {
    return (
      <div className="rounded-xl p-4 text-center text-sm text-tsua-muted"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
      >
        לא ניתן לטעון נתוני מגזרים כרגע.
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

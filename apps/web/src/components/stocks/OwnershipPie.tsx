'use client';

import { useEffect, useState } from 'react';

interface OwnershipData {
  insidersPct: number;
  institutionsPct: number;
  publicPct: number;
  institutionsFloatPct: number | null;
  institutionsCount: number | null;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; data: OwnershipData }
  | { status: 'unavailable' }   // Yahoo doesn't expose for ETFs / TASE
  | { status: 'error' };

interface PieProps { ticker: string }

/**
 * "מי מחזיק במניה" — three-slice pie + legend showing insiders /
 * institutions / public ownership for a single equity.
 *
 * Hidden gracefully when Yahoo returns no breakdown — this happens for
 * ETFs (SPY, QQQ, EIS) and most TASE-only listings, where the question
 * doesn't apply or the data simply isn't published in Yahoo's feed.
 *
 * Implementation note: we draw a pure-SVG pie rather than pulling in a
 * charting library. Three slices, fixed-size, no animation needed —
 * about 40 lines of math vs. ~30KB of dependency bloat.
 */
const SLICE_COLORS = {
  institutions: '#00e5b0',   // mint — the largest slice for most US equities
  public:       '#3b82f6',   // blue
  insiders:     '#ffd166',   // amber — usually a thin slice
} as const;

/** Polar → Cartesian for a unit circle centered at (cx, cy). */
function polar(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/**
 * Build an SVG path for a single pie slice.
 * Angles in radians, 0 at 3 o'clock, increasing clockwise.
 */
function slicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

export function OwnershipPie({ ticker }: PieProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let inFlight: AbortController | null = null;

    async function load() {
      inFlight?.abort();
      const ctrl = new AbortController();
      inFlight = ctrl;
      setState({ status: 'loading' });
      try {
        const res = await fetch(`/api/stocks/${ticker}/ownership`, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (res.status === 404) {
          // Yahoo doesn't have a breakdown for this symbol — common for ETFs.
          // Treat as "not applicable" rather than a real error.
          setState({ status: 'unavailable' });
          return;
        }
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (json?.ok && json.ownership) {
          setState({ status: 'ok', data: json.ownership });
        } else {
          setState({ status: 'unavailable' });
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setState({ status: 'error' });
      }
    }

    load();
    return () => inFlight?.abort();
  }, [ticker]);

  // ETFs/TASE — hide entirely so we don't waste sidebar real estate.
  if (state.status === 'unavailable') return null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
        <h3 className="text-sm font-black text-tsua-text">👥 מי מחזיק במניה</h3>
      </div>

      <div className="px-4 py-4" dir="rtl">
        {state.status === 'loading' && (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full animate-pulse shrink-0" style={{ background: 'var(--surface2)' }} />
            <div className="flex-1 space-y-2 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-3 rounded" style={{ background: 'var(--surface2)' }} />
              ))}
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="text-center py-4">
            <div className="text-xl mb-1">📊</div>
            <div className="text-xs text-tsua-muted">לא ניתן לטעון נתוני בעלות כעת</div>
          </div>
        )}

        {state.status === 'ok' && (() => {
          const { data } = state;

          // Build slices ordered largest-to-smallest so the eye lands on the
          // dominant owner first. Skip zero-percent slices entirely — drawing
          // a 0° arc creates degenerate paths.
          const slices = [
            { key: 'institutions', label: 'גופים מוסדיים', pct: data.institutionsPct, color: SLICE_COLORS.institutions },
            { key: 'public',       label: 'ציבור / קמעונאי', pct: data.publicPct,       color: SLICE_COLORS.public },
            { key: 'insiders',     label: 'בעלי עניין',     pct: data.insidersPct,     color: SLICE_COLORS.insiders },
          ].filter(s => s.pct > 0.1).sort((a, b) => b.pct - a.pct);

          const total = slices.reduce((sum, s) => sum + s.pct, 0);
          // Normalize so the visual angles sum to a full circle even if Yahoo's
          // numbers don't add up cleanly to 100. Doesn't change the labels.
          const SIZE = 100;
          const CX = SIZE / 2;
          const CY = SIZE / 2;
          const R = SIZE / 2 - 1; // small inset so stroke doesn't clip
          let angle = -Math.PI / 2; // start at 12 o'clock

          return (
            <div className="flex items-center gap-4">
              <svg
                width={108}
                height={108}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="shrink-0"
                role="img"
                aria-label={`התפלגות בעלות: ${slices.map(s => `${s.label} ${s.pct.toFixed(1)}%`).join(', ')}`}
              >
                {slices.map(s => {
                  const sweep = (s.pct / total) * Math.PI * 2;
                  const startAngle = angle;
                  const endAngle = angle + sweep;
                  angle = endAngle;

                  // Edge case: a single slice ≈ 100% would create a degenerate
                  // path (start == end). Draw a full circle instead.
                  if (slices.length === 1) {
                    return (
                      <circle
                        key={s.key}
                        cx={CX} cy={CY} r={R}
                        fill={s.color}
                        stroke="var(--card)" strokeWidth={1}
                      />
                    );
                  }

                  return (
                    <path
                      key={s.key}
                      d={slicePath(CX, CY, R, startAngle, endAngle)}
                      fill={s.color}
                      stroke="var(--card)"
                      strokeWidth={1}
                    />
                  );
                })}
              </svg>

              <div className="flex-1 space-y-2 min-w-0">
                {slices.map(s => (
                  <div key={s.key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: s.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-tsua-text truncate">{s.label}</span>
                    </div>
                    <span className="text-xs font-black font-mono tabular-nums" style={{ color: s.color }} dir="ltr">
                      {s.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Footer with institutional-holder count when we have it */}
        {state.status === 'ok' && state.data.institutionsCount !== null && (
          <div className="mt-3 pt-3 text-[10px] text-tsua-muted text-center" style={{ borderTop: '1px solid var(--border2)' }}>
            {state.data.institutionsCount.toLocaleString('he-IL')} מוסדות מחזיקים · נתונים מ-Yahoo Finance
          </div>
        )}
      </div>
    </div>
  );
}

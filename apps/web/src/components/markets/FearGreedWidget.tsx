'use client';

import { useEffect, useState } from 'react';

interface FGData {
  value: number;
  scoreExact: number;
  classification: string;
  previousClose: number | null;
  previousWeek: number | null;
  previousMonth: number | null;
  updatedAt: number;
}

const LABELS: Record<string, string> = {
  'Extreme Fear': 'פחד קיצוני',
  'Fear': 'פחד',
  'Neutral': 'ניטרלי',
  'Greed': 'חמדנות',
  'Extreme Greed': 'חמדנות קיצונית',
};

function getColor(v: number) {
  if (v <= 25) return '#ff4d6a';
  if (v <= 45) return '#ff8c42';
  if (v <= 55) return '#ffd166';
  if (v <= 75) return '#06d6a0';
  return '#00e5b0';
}

function getEmoji(v: number) {
  if (v <= 25) return '😱';
  if (v <= 45) return '😨';
  if (v <= 55) return '😐';
  if (v <= 75) return '😏';
  return '🤑';
}

type FetchState =
  | { status: 'loading' }
  | { status: 'ok'; data: FGData }
  | { status: 'error' };

// CNN publishes a new FNG value once per market day, so we don't need to
// hammer them. 30 min keeps the widget fresh across a long-lived browser
// session without thrashing — plus a visibility listener triggers an
// immediate refresh when the user returns to the tab.
const REFRESH_MS = 30 * 60 * 1000;

export function FearGreedWidget() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    let inFlight: AbortController | null = null;

    async function load() {
      inFlight?.abort();
      const ctrl = new AbortController();
      inFlight = ctrl;
      try {
        const r = await fetch('/api/feargreed', { signal: ctrl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const d = await r.json();
        if (ctrl.signal.aborted) return;
        if (d?.ok && Number.isFinite(d.value)) {
          setState({
            status: 'ok',
            data: {
              value: Number(d.value),
              scoreExact: Number.isFinite(Number(d.scoreExact)) ? Number(d.scoreExact) : Number(d.value),
              classification: String(d.classification ?? 'Neutral'),
              previousClose: Number.isFinite(Number(d.previousClose)) ? Number(d.previousClose) : null,
              previousWeek: Number.isFinite(Number(d.previousWeek)) ? Number(d.previousWeek) : null,
              previousMonth: Number.isFinite(Number(d.previousMonth)) ? Number(d.previousMonth) : null,
              updatedAt: Number.isFinite(Number(d.updatedAt)) ? Number(d.updatedAt) : Date.now(),
            },
          });
        } else {
          setState((prev) => prev.status === 'ok' ? prev : { status: 'error' });
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Keep prior 'ok' data on screen if any — a transient failure during
        // background polling shouldn't blank the widget. Only fall to 'error'
        // when we never had data.
        setState((prev) => prev.status === 'ok' ? prev : { status: 'error' });
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    // Tab-return refresh: someone leaves the tab open overnight, comes back
    // morning, and would otherwise see yesterday's "Greed" reading until the
    // next 30-min tick. visibilitychange fires before paint when the tab
    // becomes visible, so the refresh kicks off immediately.
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      inFlight?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">🧠 מדד פחד וחמדנות</h3>
      </div>

      <div className="px-4 py-4" dir="rtl">
        {state.status === 'loading' && (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 rounded w-24 mx-auto" style={{ background: 'rgba(26,40,64,0.6)' }} />
            <div className="h-3 rounded" style={{ background: 'rgba(26,40,64,0.4)' }} />
          </div>
        )}

        {state.status === 'error' && (
          <div className="py-3 text-center">
            <div className="text-2xl mb-1">📡</div>
            <div className="text-xs text-tsua-muted">לא ניתן לטעון את המדד כעת</div>
            <div className="text-[10px] text-tsua-muted mt-0.5">נסה לרענן בעוד מספר דקות</div>
          </div>
        )}

        {state.status === 'ok' && (() => {
          const { data } = state;
          const color = getColor(data.value);
          const label = LABELS[data.classification] ?? data.classification;
          const emoji = getEmoji(data.value);
          // Use the precise (un-rounded) score for dot positioning so the
          // marker doesn't snap to integer steps on the gradient bar.
          const dotPos = Math.max(0, Math.min(100, data.scoreExact));
          // Build the historical comparison row only from values we actually
          // have — CNN occasionally omits one of the windows.
          const trends: { label: string; v: number }[] = [];
          if (data.previousClose !== null) trends.push({ label: 'אתמול', v: data.previousClose });
          if (data.previousWeek !== null)  trends.push({ label: 'שבוע',  v: data.previousWeek });
          if (data.previousMonth !== null) trends.push({ label: 'חודש',  v: data.previousMonth });
          return (
            <>
              {/* Score */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-4xl font-black font-mono" style={{ color }}>{data.value}</div>
                  <div className="text-sm font-bold mt-0.5" style={{ color }}>{label}</div>
                </div>
                <div className="text-5xl">{emoji}</div>
              </div>

              {/* Gradient bar — RTL-native orientation:
                    RIGHT  = start of reading = פחד קיצוני (red)
                    LEFT   = end of reading   = חמדנות קיצונית (green) */}
              <div className="relative w-full h-2.5 rounded-full overflow-hidden mt-2"
                style={{ background: 'linear-gradient(to left, #ff4d6a, #ff8c42, #ffd166, #06d6a0, #00e5b0)' }}>
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white"
                  style={{
                    right: `${dotPos}%`,
                    background: color,
                    boxShadow: `0 0 6px ${color}`,
                    transform: 'translate(50%, -50%)',
                  }}
                />
              </div>

              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-tsua-muted">פחד קיצוני</span>
                <span className="text-[9px] text-tsua-muted">חמדנות קיצונית</span>
              </div>

              {trends.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
                  {trends.map((t) => {
                    const tColor = getColor(t.v);
                    return (
                      <div key={t.label} className="text-center">
                        <div className="text-[9px] text-tsua-muted mb-0.5">{t.label}</div>
                        <div className="text-sm font-black font-mono" style={{ color: tColor }}>{Math.round(t.v)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        <p className="text-[9px] text-tsua-muted text-center mt-3">
          מדד מניות · CNN Fear &amp; Greed
        </p>
      </div>
    </div>
  );
}

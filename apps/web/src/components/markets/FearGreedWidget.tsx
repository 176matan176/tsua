'use client';

import { useEffect, useState } from 'react';

interface FGData {
  value: number;
  classification: string;
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

export function FearGreedWidget() {
  const [state, setState] = useState<FetchState>({ status: 'loading' });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/markets/feargreed', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Number.isFinite(d.value)) {
          setState({
            status: 'ok',
            data: { value: Number(d.value), classification: String(d.classification ?? 'Neutral') },
          });
        } else {
          setState({ status: 'error' });
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setState({ status: 'error' });
      });
    return () => ctrl.abort();
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
                    right: `${data.value}%`,
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
            </>
          );
        })()}

        <p className="text-[9px] text-tsua-muted text-center mt-3">
          מדד קריפטו · Alternative.me
        </p>
      </div>
    </div>
  );
}

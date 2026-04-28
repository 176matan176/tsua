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

export function FearGreedWidget() {
  const [data, setData] = useState<FGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.alternative.me/fng/?limit=1')
      .then(r => r.json())
      .then(d => {
        const item = d.data?.[0];
        if (item) setData({ value: Number(item.value), classification: item.value_classification });
      })
      .catch(() => setData({ value: 52, classification: 'Neutral' }))
      .finally(() => setLoading(false));
  }, []);

  const color = data ? getColor(data.value) : '#c8d8f0';
  const label = data ? (LABELS[data.classification] ?? data.classification) : '';
  const emoji = data ? getEmoji(data.value) : '😐';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">🧠 מדד פחד וחמדנות</h3>
      </div>

      <div className="px-4 py-4" dir="rtl">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-8 rounded w-24 mx-auto" style={{ background: 'rgba(26,40,64,0.6)' }} />
            <div className="h-3 rounded" style={{ background: 'rgba(26,40,64,0.4)' }} />
          </div>
        ) : data ? (
          <>
            {/* Score */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-4xl font-black font-mono" style={{ color }}>{data.value}</div>
                <div className="text-sm font-bold mt-0.5" style={{ color }}>{label}</div>
              </div>
              <div className="text-5xl">{emoji}</div>
            </div>

            {/* Gradient bar — fear (coral) on the LEFT, greed (mint) on the RIGHT.
                Indicator is positioned via `left: value%` so a higher score
                visibly slides the dot rightward, into the green zone. */}
            <div className="relative w-full h-2.5 rounded-full overflow-hidden mt-2"
              style={{ background: 'linear-gradient(to right, #ff4d6a, #ff8c42, #ffd166, #06d6a0, #00e5b0)' }}>
              {/* Indicator */}
              <div
                className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white"
                style={{
                  left: `${data.value}%`,
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </div>

            {/* Labels — RTL container puts first child on the right.
                Right side aligns with greed end of the bar; left with fear. */}
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-tsua-muted">חמדנות קיצונית</span>
              <span className="text-[9px] text-tsua-muted">פחד קיצוני</span>
            </div>
          </>
        ) : null}

        <p className="text-[9px] text-tsua-muted text-center mt-3">
          מדד קריפטו · Alternative.me
        </p>
      </div>
    </div>
  );
}

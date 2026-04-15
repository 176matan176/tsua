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

export function SentimentMeter({ ticker }: SentimentMeterProps) {
  const [data, setData]         = useState<SentimentData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setLoading(true);
    setAnimated(false);
    fetch(`/api/stocks/${ticker}/sentiment`)
      .then(r => r.json())
      .then((d: SentimentData) => {
        setData(d);
        setTimeout(() => setAnimated(true), 80);
      })
      .catch(() =>
        setData({ bullish: 0, bearish: 0, neutral: 0, total: 0, change24h: 0 })
      )
      .finally(() => setLoading(false));
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
    data.bullish >= 60 ? '#00e5b0' :
    data.bullish >= 48 ? '#f5b942' :
    '#ff4d6a';

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
                ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0' }
                : { background: 'rgba(255,77,106,0.12)', color: '#ff4d6a' }
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
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,77,106,0.2)' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,77,106,0.3)' }} />
          <div
            className="absolute top-0 start-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${data.bullish}%` : '0%',
              background: 'linear-gradient(90deg, #00e5b0, #00c49a)',
              boxShadow: '0 0 8px rgba(0,229,176,0.4)',
            }}
          />
          <div
            className="absolute top-0 h-full"
            style={{
              right: `${data.bearish}%`,
              width: `${data.neutral}%`,
              background: 'rgba(245,185,66,0.25)',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: '#00e5b0' }}>▲ שוריים {data.bullish}%</span>
          <span style={{ color: '#f5b942' }}>ניטרלי {data.neutral}%</span>
          <span style={{ color: '#ff4d6a' }}>{data.bearish}% דוביים ▼</span>
        </div>
      </div>

      {/* Breakdown pills */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: '🐂 שוריים', value: data.bullish, color: '#00e5b0', bg: 'rgba(0,229,176,0.08)',  border: 'rgba(0,229,176,0.2)'  },
          { label: '➡️ ניטרלי', value: data.neutral, color: '#f5b942', bg: 'rgba(245,185,66,0.08)', border: 'rgba(245,185,66,0.2)' },
          { label: '🐻 דוביים', value: data.bearish, color: '#ff4d6a', bg: 'rgba(255,77,106,0.08)', border: 'rgba(255,77,106,0.2)' },
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

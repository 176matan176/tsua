'use client';

import { useState, useEffect } from 'react';

interface SentimentMeterProps {
  ticker: string;
}

interface SentimentData {
  bullish: number;
  bearish: number;
  neutral: number;
  totalPosts: number;
  change24h: number; // % change in bullish sentiment vs yesterday
}

// Mock sentiment data — will be replaced with real API
function getMockSentiment(ticker: string): SentimentData {
  const seed = ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bullish = 35 + (seed % 40);      // 35–75%
  const bearish = Math.floor((100 - bullish) * 0.8);
  const neutral = 100 - bullish - bearish;
  return {
    bullish,
    bearish,
    neutral,
    totalPosts: 48 + (seed % 200),
    change24h: ((seed % 20) - 10),        // –10% to +10%
  };
}

export function SentimentMeter({ ticker }: SentimentMeterProps) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Simulate API fetch
    const d = getMockSentiment(ticker);
    setData(d);
    // Trigger bar animation
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, [ticker]);

  if (!data) return null;

  const sentimentLabel =
    data.bullish >= 65 ? 'אופטימי מאוד' :
    data.bullish >= 55 ? 'אופטימי' :
    data.bullish >= 45 ? 'ניטרלי' :
    data.bullish >= 35 ? 'פסימי' :
    'פסימי מאוד';

  const sentimentColor =
    data.bullish >= 60 ? '#00e5b0' :
    data.bullish >= 48 ? '#f5b942' :
    '#ff4d6a';

  const change24hPositive = data.change24h >= 0;

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-tsua-text">
          {'📊 סנטימנט קהילתי'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-tsua-muted">
            {data.totalPosts} {'פוסטים ב-24ש׳'}
          </span>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={change24hPositive
              ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0' }
              : { background: 'rgba(255,77,106,0.12)', color: '#ff4d6a' }
            }
          >
            {change24hPositive ? '▲' : '▼'} {Math.abs(data.change24h)}% {'מאתמול'}
          </span>
        </div>
      </div>

      {/* Main sentiment label */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black" style={{ color: sentimentColor }}>
          {sentimentLabel}
        </span>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: sentimentColor }}>
            {data.bullish}%
          </div>
          <div className="text-xs text-tsua-muted">{'שוריים'}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,77,106,0.2)' }}>
          {/* Bearish base */}
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,77,106,0.3)' }} />
          {/* Bullish fill */}
          <div
            className="absolute top-0 start-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${data.bullish}%` : '0%',
              background: `linear-gradient(90deg, #00e5b0, #00c49a)`,
              boxShadow: '0 0 8px rgba(0,229,176,0.4)',
            }}
          />
          {/* Neutral section overlay */}
          <div
            className="absolute top-0 h-full"
            style={{
              right: `${data.bearish}%`,
              width: `${data.neutral}%`,
              background: 'rgba(245,185,66,0.25)',
            }}
          />
        </div>

        {/* Labels below bar */}
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: '#00e5b0' }}>
            ▲ {'שוריים'} {data.bullish}%
          </span>
          <span style={{ color: '#f5b942' }}>
            {'ניטרלי'} {data.neutral}%
          </span>
          <span style={{ color: '#ff4d6a' }}>
            {data.bearish}% {'דוביים'} ▼
          </span>
        </div>
      </div>

      {/* Breakdown pills */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: '🐂 שוריים', value: data.bullish, color: '#00e5b0', bg: 'rgba(0,229,176,0.08)', border: 'rgba(0,229,176,0.2)' },
          { label: '➡️ ניטרלי', value: data.neutral, color: '#f5b942', bg: 'rgba(245,185,66,0.08)', border: 'rgba(245,185,66,0.2)' },
          { label: '🐻 דוביים', value: data.bearish, color: '#ff4d6a', bg: 'rgba(255,77,106,0.08)', border: 'rgba(255,77,106,0.2)' },
        ].map((item) => (
          <div
            key={item.label}
            className="text-center rounded-xl py-2.5"
            style={{ background: item.bg, border: `1px solid ${item.border}` }}
          >
            <div className="text-lg font-black" style={{ color: item.color }}>{item.value}%</div>
            <div className="text-[10px] text-tsua-muted mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-tsua-muted text-center">
        {'מדד מבוסס פוסטים קהילתיים בלבד. אינו מהווה ייעוץ השקעות.'}
      </p>
    </div>
  );
}

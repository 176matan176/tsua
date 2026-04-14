'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';

const INDICES = [
  { symbol: 'SPY',      label: 'S&P 500',   flag: '🇺🇸' },
  { symbol: 'QQQ',      label: 'NASDAQ',    flag: '🇺🇸' },
  { symbol: 'DIA',      label: 'DOW',       flag: '🇺🇸' },
  { symbol: 'IWM',      label: 'RUSSELL',   flag: '🇺🇸' },
  { symbol: 'EIS',      label: 'ת"א 35',    flag: '🇮🇱' },
  { symbol: 'TA125.TA', label: 'ת"א 125',   flag: '🇮🇱' },
  { symbol: 'BTC-USD',  label: 'Bitcoin',   flag: '₿'   },
  { symbol: 'ETH-USD',  label: 'Ethereum',  flag: '⟠'   },
  { symbol: 'GLD',      label: 'זהב',       flag: '🥇'  },
  { symbol: 'USO',      label: 'נפט',       flag: '🛢️'  },
  { symbol: 'TLT',      label: 'אג"ח 20Y',  flag: '📊'  },
  { symbol: 'VIXY',     label: 'VIX',       flag: '😱'  },
];

// Memoized so it only re-renders when its own price changes
const TickerItem = memo(function TickerItem({ symbol, label, flag }: { symbol: string; label: string; flag: string }) {
  const locale = useLocale();
  const live = useLivePrice(symbol);

  if (!live) return (
    <div className="flex items-center gap-2 px-4 shrink-0" dir="ltr">
      <span className="text-xs shrink-0">{flag}</span>
      <span className="text-xs font-bold text-tsua-muted font-mono">{label}</span>
      <div className="w-14 h-3 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
    </div>
  );

  const isUp = live.changePercent >= 0;

  return (
    <Link
      href={`/${locale}/stocks/${symbol}`}
      dir="ltr"
      className="flex items-center gap-2 px-4 shrink-0 transition-all duration-200 hover:bg-white/5 rounded-lg group"
      style={
        live.flash === 'up'   ? { background: 'rgba(0,229,176,0.1)' } :
        live.flash === 'down' ? { background: 'rgba(255,77,106,0.1)' } : {}
      }
    >
      <span className="text-xs shrink-0">{flag}</span>
      <span className="text-xs font-bold text-tsua-muted font-mono group-hover:text-tsua-text transition-colors">{label}</span>
      <span
        className="text-xs font-black font-mono transition-colors duration-300 tabular-nums"
        style={{ color: live.flash === 'up' ? '#00e5b0' : live.flash === 'down' ? '#ff4d6a' : '#c8d8f0' }}
      >
        {live.price >= 1000 ? live.price.toLocaleString('en', { maximumFractionDigits: 0 }) : live.price.toFixed(2)}
      </span>
      <span
        className="text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {isUp ? '+' : ''}{live.changePercent.toFixed(2)}%
      </span>
    </Link>
  );
});

const Divider = () => (
  <span className="w-px h-4 shrink-0 mx-1" style={{ background: 'rgba(26,40,64,0.7)' }} />
);

export function LiveMarketBar() {
  // Triple the items so the seam is never visible even on ultra-wide screens
  const items = [...INDICES, ...INDICES, ...INDICES];

  return (
    <div
      className="overflow-hidden relative market-bar-wrap"
      style={{
        background: 'rgba(6,11,22,0.9)',
        borderBottom: '1px solid rgba(26,40,64,0.5)',
      }}
    >
      {/* Fade left */}
      <div
        className="absolute start-14 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, rgba(6,11,22,0.9), transparent)' }}
      />
      {/* Fade right */}
      <div
        className="absolute end-0 top-0 bottom-0 w-8 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, rgba(6,11,22,0.9), transparent)' }}
      />

      {/* Fixed "שוק" label */}
      <div
        className="absolute start-0 top-0 bottom-0 z-20 flex items-center px-3"
        style={{ background: 'rgba(6,11,22,0.95)', borderRight: '1px solid rgba(26,40,64,0.4)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 me-1.5"
          style={{ background: '#00e5b0', boxShadow: '0 0 6px rgba(0,229,176,0.8)' }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#00e5b0' }}>שוק</span>
      </div>

      {/* Scrolling strip — always LTR so translateX(-33.33%) works correctly */}
      <div className="market-scroll items-center py-2 ps-20" dir="ltr">
        {items.map((item, i) => (
          <span key={`${item.symbol}-${i}`} className="contents">
            <TickerItem symbol={item.symbol} label={item.label} flag={item.flag} />
            <Divider />
          </span>
        ))}
      </div>
    </div>
  );
}

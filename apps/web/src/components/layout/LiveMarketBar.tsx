'use client';

import { memo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';
import { MarketStatusDot } from '@/components/ui/MarketStatusDot';
import { marketForSymbol } from '@/lib/marketHours';

// Only market indices — US (S&P, NASDAQ, Dow, Russell) + Tel Aviv (TA 35, TA 125)
const INDICES = [
  { symbol: 'SPY',      label: 'S&P 500',   flag: '🇺🇸' },
  { symbol: 'QQQ',      label: 'NASDAQ',    flag: '🇺🇸' },
  { symbol: 'DIA',      label: 'DOW',       flag: '🇺🇸' },
  { symbol: 'IWM',      label: 'RUSSELL',   flag: '🇺🇸' },
  { symbol: 'EIS',      label: 'ת"א 35',    flag: '🇮🇱' },
  { symbol: 'TA125.TA', label: 'ת"א 125',   flag: '🇮🇱' },
];

// Memoized so it only re-renders when its own price changes
const TickerItem = memo(function TickerItem({ symbol, label, flag }: { symbol: string; label: string; flag: string }) {
  const locale = useLocale();
  const live = useLivePrice(symbol);

  if (!live) return (
    <div className="flex items-center gap-2 px-4 shrink-0" dir="ltr">
      <span className="text-xs shrink-0">{flag}</span>
      <span className="text-xs font-bold text-tsua-muted font-mono">{label}</span>
      <div className="w-14 h-3 rounded animate-pulse breathe-shimmer" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
    </div>
  );

  const isUp = live.changePercent >= 0;

  return (
    <Link
      href={`/${locale}/stocks/${symbol}`}
      dir="ltr"
      className="flex items-center gap-2 px-4 shrink-0 transition-all duration-200 hover:bg-white/5 rounded-lg group"
    >
      <span className="text-xs shrink-0">{flag}</span>
      {/* Open/closed dot follows where the symbol actually TRADES — e.g. EIS
          shows a 🇮🇱 flag but is NYSE-listed, so it gets the US session dot. */}
      <MarketStatusDot market={marketForSymbol(symbol)} />
      <span className="text-xs font-bold text-tsua-muted font-mono group-hover:text-tsua-text transition-colors">{label}</span>
      {/* Pulse scoped to the price + change chips (not the whole item) so each
          index ticks like a TradingView tape. */}
      <span
        className={`text-xs font-black font-mono transition-colors duration-300 tabular-nums px-1 rounded-md ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
        style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
      >
        {live.price >= 1000 ? live.price.toLocaleString('en', { maximumFractionDigits: 0 }) : live.price.toFixed(2)}
      </span>
      <span
        className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
        style={{
          background: isUp ? 'rgb(var(--rgb-accent) / 0.1)' : 'rgb(var(--rgb-red) / 0.1)',
          color: isUp ? 'var(--accent)' : 'var(--red)',
        }}
      >
        {isUp ? '+' : ''}{live.changePercent.toFixed(2)}%
      </span>
    </Link>
  );
});

const Divider = () => (
  <span className="w-px h-4 shrink-0 mx-1" style={{ background: 'rgb(var(--rgb-border) / 0.7)' }} />
);

export function LiveMarketBar() {
  // Seamless infinite marquee: build one GROUP that is wider than any
  // realistic viewport (4×6 indices ≈ 3,600px), then render it exactly
  // TWICE and animate translateX(-50%). When the animation wraps, copy 2
  // sits pixel-identical to where copy 1 started — no gap, no jump.
  // (The old ×3 + -33.33% version left a blank gap on screens wider than
  // ~1,800px because one group was narrower than the viewport.)
  const GROUP = [...INDICES, ...INDICES, ...INDICES, ...INDICES];
  const items = [...GROUP, ...GROUP];

  return (
    <div
      className="overflow-hidden relative market-bar-wrap"
      style={{
        background: 'rgb(var(--rgb-bg) / 0.9)',
        borderBottom: '1px solid rgb(var(--rgb-border) / 0.5)',
      }}
    >
      {/* Fade left */}
      <div
        className="absolute start-14 top-0 bottom-0 w-8 z-10 pointer-events-none market-fade-left"
      />
      {/* Fade right */}
      <div
        className="absolute end-0 top-0 bottom-0 w-8 z-10 pointer-events-none market-fade-right"
      />

      {/* Fixed "שוק" label */}
      <div
        className="absolute start-0 top-0 bottom-0 z-20 flex items-center px-3"
        style={{ background: 'rgb(var(--rgb-bg) / 0.95)', borderRight: '1px solid rgb(var(--rgb-border) / 0.4)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse breathe-dot shrink-0 me-1.5"
          style={{ background: 'var(--accent)', boxShadow: '0 0 6px rgb(var(--rgb-accent) / 0.8)' }}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>שוק</span>
      </div>

      {/* Scrolling strip — always LTR so translateX(-33.33%) works correctly.
          NOTE: NO padding allowed here — it breaks the seamless -33.333% loop.
          The "שוק" label on the left is absolutely-positioned (z-20) and masks any
          items that scroll underneath it. */}
      <div className="market-scroll items-center py-2" dir="ltr">
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

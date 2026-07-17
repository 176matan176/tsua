'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';
import { MarketStatusDot } from '@/components/ui/MarketStatusDot';

// After this much wall-time without a price showing up in the PriceContext,
// the row stops showing a skeleton and shows "—" + ⚠️ instead. Otherwise a
// row for a delisted ticker (or a socket that never connects) spins forever.
const NO_DATA_GRACE_MS = 12_000;

// Curated popular stocks (US + Israeli)
const HOT = [
  { symbol: 'NVDA',  nameHe: 'אנבידיה',   flag: '🇺🇸', tag: '🔥 AI' },
  { symbol: 'TSLA',  nameHe: 'טסלה',      flag: '🇺🇸', tag: '⚡ EV' },
  { symbol: 'AAPL',  nameHe: 'אפל',       flag: '🇺🇸', tag: '🍎' },
  { symbol: 'TEVA',  nameHe: 'טבע',       flag: '🇮🇱', tag: '💊 IL' },
  { symbol: 'META',  nameHe: 'מטא',       flag: '🇺🇸', tag: '📘 AI' },
  { symbol: 'AMZN',  nameHe: 'אמזון',     flag: '🇺🇸', tag: '📦' },
  { symbol: 'GOOGL', nameHe: 'גוגל',      flag: '🇺🇸', tag: '🔍 AI' },
  { symbol: 'NICE',  nameHe: 'נייס',      flag: '🇮🇱', tag: '📊 IL' },
];

/**
 * Invisible probe that subscribes to the first HOT symbol and fires the
 * callback once a price arrives. Cheaper than wiring a top-level
 * `useContext(PriceContext)` in the parent — we already pay for that
 * subscription via the `HotRow` for NVDA below.
 */
function LiveListener({ onFirstPrice }: { onFirstPrice: () => void }) {
  const live = useLivePrice(HOT[0].symbol);
  useEffect(() => {
    if (live) onFirstPrice();
  }, [live, onFirstPrice]);
  return null;
}

function HotRow({ symbol, nameHe, flag, tag }: typeof HOT[0]) {
  const locale = useLocale();
  const live = useLivePrice(symbol);
  // Flip to true after NO_DATA_GRACE_MS without a price arriving. Lets the row
  // bail out of perpetual skeleton state for symbols that never deliver.
  const [gracePassed, setGracePassed] = useState(false);
  useEffect(() => {
    if (live) return; // already have data; no timer needed
    const t = setTimeout(() => setGracePassed(true), NO_DATA_GRACE_MS);
    return () => clearTimeout(t);
  }, [live]);

  return (
    <Link
      href={`/${locale}/stocks/${symbol}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors group"
      style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.3)' }}
    >
      {/* Symbol badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0"
        style={{
          background: 'rgb(var(--rgb-accent) / 0.08)',
          border: '1px solid rgb(var(--rgb-accent) / 0.15)',
          color: 'var(--accent)',
        }}
      >
        {symbol.slice(0, 4)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{flag}</span>
          <span className="text-sm font-bold text-tsua-text group-hover:text-tsua-accent transition-colors truncate">
            {nameHe}
          </span>
        </div>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 inline-block"
          style={{ background: 'rgb(var(--rgb-accent) / 0.07)', color: 'rgb(var(--rgb-accent) / 0.7)' }}
        >
          {tag}
        </span>
      </div>

      {/* Price */}
      <div className="text-end shrink-0">
        {live ? (
          <>
            {/* Pulse is scoped to the price block itself (not the whole row) so
                the eye is pulled to the number that moved — TradingView-style. */}
            <div
              className={`text-sm font-black font-mono tabular-nums px-1.5 py-0.5 rounded-md inline-block ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
              style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
              dir="ltr"
            >
              ${live.price >= 1000
                ? live.price.toLocaleString('en', { maximumFractionDigits: 0 })
                : live.price.toFixed(2)}
            </div>
            {/* The change-% chip pulses in the same direction as the tick. */}
            <div
              className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
              dir="ltr"
              style={{ color: live.changePercent >= 0 ? 'var(--accent)' : 'var(--red)' }}
            >
              {live.changePercent >= 0 ? '+' : ''}{live.changePercent.toFixed(2)}%
            </div>
          </>
        ) : gracePassed ? (
          <div
            className="text-sm font-black font-mono text-tsua-muted flex items-center gap-1 justify-end"
            dir="ltr"
            title="לא התקבל מחיר — נסה לרענן את העמוד"
          >
            <span>⚠️</span>
            <span>—</span>
          </div>
        ) : (
          <div className="w-14 h-4 rounded animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
        )}
      </div>
    </Link>
  );
}

export function HotStocks() {
  // Show a live indicator in the header — gives the user a visual signal
  // that prices are actually flowing (vs. perpetually skeleton-y rows).
  // We seed `liveYet` once at least one of our 8 HOT symbols has emitted
  // a price; after that the green pulse stays on. If the socket dies, all
  // rows individually flip to ⚠️ after NO_DATA_GRACE_MS, which is the
  // honest per-row signal — header staying green a bit longer is fine.
  const [liveYet, setLiveYet] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden breathe-card" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text flex items-center gap-1.5">
          🔥 מניות רותחות
          {/* All names in this list are US-listed (incl. the Israeli ones) —
              one US session dot tells the whole story. */}
          <MarketStatusDot market="US" />
        </h3>
        {liveYet && (
          <span className="flex items-center gap-1.5 text-[10px] text-tsua-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
            LIVE
          </span>
        )}
      </div>
      <LiveListener onFirstPrice={() => setLiveYet(true)} />

      <div dir="rtl">
        {HOT.map(s => <HotRow key={s.symbol} {...s} />)}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          מחירים בזמן אמת · לחץ להצגת פרטים
        </p>
      </div>
    </div>
  );
}

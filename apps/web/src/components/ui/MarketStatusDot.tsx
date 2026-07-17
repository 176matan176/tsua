'use client';

import { useEffect, useState } from 'react';
import { isMarketOpen, type Market } from '@/lib/marketHours';

/**
 * Tiny open/closed exchange indicator: pulsing accent dot while the exchange
 * is in its regular session, static muted dot when closed. Re-evaluates every
 * minute so a tab left open flips at the bell without a reload.
 */
export function MarketStatusDot({ market, className = '' }: { market: Market; className?: string }) {
  const [open, setOpen] = useState(() => isMarketOpen(market));

  useEffect(() => {
    setOpen(isMarketOpen(market)); // re-sync on mount / market change
    const id = setInterval(() => setOpen(isMarketOpen(market)), 60_000);
    return () => clearInterval(id);
  }, [market]);

  const label = open ? 'שוק פתוח' : 'שוק סגור';
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${open ? 'animate-pulse breathe-dot' : ''} ${className}`}
      style={open ? { background: 'var(--accent)' } : { background: 'rgb(var(--rgb-border))' }}
    />
  );
}

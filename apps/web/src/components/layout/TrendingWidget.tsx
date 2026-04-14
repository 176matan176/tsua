'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useLivePrice } from '@/contexts/PriceContext';

const TRENDING_TICKERS = ['NVDA', 'TEVA', 'TSLA', 'AAPL', 'CHKP', 'NICE', 'AMZN', 'MSFT'];

function TrendingRow({ ticker }: { ticker: string }) {
  const locale = useLocale();
  const price = useLivePrice(ticker);

  if (!price) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
        <div className="text-xs font-bold font-mono text-tsua-muted w-12">{ticker}</div>
        <div className="flex-1" />
        <div className="h-3 w-14 rounded-full" style={{ background: 'rgba(26,40,64,0.6)' }} />
      </div>
    );
  }

  const up = price.changePercent >= 0;
  const color = up ? '#00e5b0' : '#ff4d6a';

  return (
    <Link
      href={`/${locale}/stocks/${ticker}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:bg-white/5 group"
    >
      {/* Flash effect */}
      <span
        className="text-xs font-black font-mono w-12 truncate transition-colors"
        style={{
          color: price.flash ? (price.flash === 'up' ? '#00e5b0' : '#ff4d6a') : '#d4e4ff',
          textShadow: price.flash ? `0 0 8px ${price.flash === 'up' ? 'rgba(0,229,176,0.6)' : 'rgba(255,77,106,0.6)'}` : 'none',
        }}
      >
        {ticker}
      </span>

      <div className="flex-1 min-w-0">
        {/* Mini bar */}
        <div className="h-0.5 rounded-full" style={{ background: `${color}30` }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.abs(price.changePercent) * 10)}%`,
              background: color,
              maxWidth: '100%',
            }}
          />
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-[11px] font-bold text-tsua-text">
          ${price.price < 10 ? price.price.toFixed(3) : price.price.toFixed(2)}
        </div>
        <div className="text-[10px] font-semibold" style={{ color }}>
          {up ? '+' : ''}{price.changePercent.toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

export function TrendingWidget() {
  return (
    <div
      className="rounded-2xl overflow-hidden mt-2"
      style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.6)' }}
    >
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
      >
        <span className="text-[11px] font-black tracking-widest uppercase text-tsua-muted">
          🔥 מניות פופולריות
        </span>
        <div className="flex-1" />
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e5b0' }} />
      </div>

      <div className="py-1">
        {TRENDING_TICKERS.map(ticker => (
          <TrendingRow key={ticker} ticker={ticker} />
        ))}
      </div>
    </div>
  );
}

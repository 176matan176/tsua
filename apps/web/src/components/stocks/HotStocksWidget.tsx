'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { FireIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon } from '@heroicons/react/20/solid';
import { buildSparklinePoints, type StockScore } from '@/lib/hotStocks';
import { useLivePrice } from '@/contexts/PriceContext';
import { MarketStatusDot } from '@/components/ui/MarketStatusDot';

interface HotResponse {
  market: string;
  updatedAt: string;
  stocks: StockScore[];
}

function Sparkline({ stock }: { stock: StockScore }) {
  const pts = buildSparklinePoints(stock.prevClose, stock.open, stock.low, stock.high, stock.price);
  if (pts.length < 2) return <div className="w-14 h-6" />;
  const W = 56, H = 24;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 0.01;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - ((p - min) / range) * (H - 4) - 2);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path d={d} fill="none" stroke={isUp ? 'var(--accent)' : 'var(--red)'} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function SentimentBar({ s }: { s: StockScore['sentiment'] }) {
  if (s.total === 0) return null;
  return (
    <div className="flex h-1 rounded-full overflow-hidden w-16" style={{ background: 'var(--border)' }}>
      <div style={{ width: `${s.bullish}%`, background: 'var(--accent)' }} />
      <div style={{ width: `${s.bearish}%`, background: 'var(--red)' }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-lg animate-pulse shrink-0" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2.5 w-14 rounded animate-pulse" style={{ background: 'var(--border2)' }} />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2.5 w-8 rounded animate-pulse ms-auto" style={{ background: 'var(--border2)' }} />
      </div>
    </div>
  );
}

function HotRow({ stock }: { stock: StockScore }) {
  const locale  = useLocale();
  const live    = useLivePrice(stock.ticker);
  const price          = live?.price ?? stock.price;
  const changePercent  = live?.changePercent ?? stock.changePercent;
  const flash          = live?.flash ?? null;
  const flashCls = flash === 'up'   ? 'breathe-flash-up breathe-pop'
                 : flash === 'down' ? 'breathe-flash-down breathe-pop'
                 : '';
  const isUp    = (changePercent ?? 0) >= 0;
  const pctStr  = changePercent != null
    ? `${isUp ? '+' : ''}${changePercent.toFixed(2)}%`
    : '—';
  const isHot = stock.hotScore >= 60;

  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-150 group"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Rank — quiet numeral, not a colored badge */}
      <span className="w-4 text-xs font-medium tabular-nums shrink-0 text-center" style={{ color: 'var(--muted)' }}>
        {stock.rank}
      </span>
      {/* Ticker chip — neutral monochrome; colour is reserved for the price */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <SentimentBar s={stock.sentiment} />
          {stock.mentions24h > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>
              {stock.mentions24h} · שיחות
            </span>
          )}
        </div>
      </div>
      <Sparkline stock={stock} />
      <div className="text-end shrink-0 min-w-[54px]">
        <div
          className={`text-[13px] font-semibold font-mono tabular-nums px-1.5 py-0.5 rounded-md inline-block ${flashCls}`}
          style={{ color: flash === 'up' ? 'var(--accent)' : flash === 'down' ? 'var(--red)' : 'var(--text)' }}
          dir="ltr"
        >
          {price != null ? price.toFixed(2) : '—'}
        </div>
        <div
          className={`text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${flashCls}`}
          style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }}
          dir="ltr"
        >
          {pctStr}
        </div>
      </div>
      {/* Hot score — icon + number; the "hot" tint appears only when it's earned */}
      <div
        className="flex items-center gap-0.5 text-[11px] font-semibold tabular-nums shrink-0 w-9 justify-end"
        style={{ color: isHot ? 'var(--hot)' : 'var(--muted)' }}
        title={`Hot score: ${stock.hotScore}`}
      >
        <FireIcon className="w-3.5 h-3.5" strokeWidth={isHot ? 2 : 1.5} aria-hidden="true" />
        {stock.hotScore}
      </div>
    </Link>
  );
}

export function HotStocksWidget() {
  const locale = useLocale();
  const [market, setMarket]   = useState<'il' | 'us'>('il');
  const [dataIL, setDataIL]   = useState<StockScore[] | null>(null);
  const [dataUS, setDataUS]   = useState<StockScore[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [resIL, resUS] = await Promise.all([
          fetch('/api/stocks/hot?market=il'),
          fetch('/api/stocks/hot?market=us'),
        ]);
        const [jsonIL, jsonUS]: [HotResponse, HotResponse] = await Promise.all([
          resIL.json(), resUS.json(),
        ]);
        if (!cancelled) {
          setDataIL(jsonIL.stocks.slice(0, 5));
          setDataUS(jsonUS.stocks.slice(0, 5));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const stocks = market === 'il' ? dataIL : dataUS;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border2)' }}
        dir="rtl"
      >
        <FireIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--hot)' }} strokeWidth={1.75} aria-hidden="true" />
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
          מניות חמות
          <MarketStatusDot market="US" />
        </h3>
        <div className="flex gap-1 me-auto" role="tablist" aria-label="בחירת שוק">
          {(['il', 'us'] as const).map(m => (
            <button
              key={m}
              role="tab"
              aria-selected={market === m}
              onClick={() => setMarket(m)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
              style={market === m
                ? { background: 'rgb(var(--rgb-accent) / 0.12)', color: 'var(--accent)' }
                : { background: 'transparent', color: 'var(--muted)' }
              }
            >
              {m === 'il' ? 'ת"א' : 'ארה"ב'}
            </button>
          ))}
        </div>
        <Link
          href={`/${locale}/hot`}
          className="text-[11px] font-medium flex items-center gap-0.5 transition-colors hover:text-tsua-text"
          style={{ color: 'var(--muted)' }}
        >
          הכל
          <ChevronLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="py-1">
        {loading || !stocks
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : stocks.map(stock => <HotRow key={stock.ticker} stock={stock} />)
        }
      </div>
    </div>
  );
}

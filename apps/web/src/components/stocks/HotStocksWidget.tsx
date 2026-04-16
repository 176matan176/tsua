'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { buildSparklinePoints, type StockScore } from '@/lib/hotStocks';

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
      <path d={d} fill="none" stroke={isUp ? '#00e5b0' : '#ff4d6a'} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function SentimentBar({ s }: { s: StockScore['sentiment'] }) {
  if (s.total === 0) return null;
  return (
    <div className="flex h-1 rounded-full overflow-hidden w-16" style={{ background: 'var(--border)' }}>
      <div style={{ width: `${s.bullish}%`, background: '#00e5b0' }} />
      <div style={{ width: `${s.bearish}%`, background: '#ff4d6a' }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-xl animate-pulse shrink-0" style={{ background: 'var(--border)' }} />
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
  const isUp    = (stock.changePercent ?? 0) >= 0;
  const pctStr  = stock.changePercent != null
    ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`
    : '—';

  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 active:scale-[0.98] group"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span
        className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
      >
        {stock.rank}
      </span>
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <SentimentBar s={stock.sentiment} />
          {stock.mentions24h > 0 && (
            <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>
              {stock.mentions24h} 💬
            </span>
          )}
        </div>
      </div>
      <Sparkline stock={stock} />
      <div className="text-end shrink-0 min-w-[52px]">
        <div className="text-xs font-black font-mono tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
        <div className="text-[10px] font-bold tabular-nums" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
          {pctStr}
        </div>
      </div>
      <div
        className="text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0"
        style={{
          background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--surface2)',
          color:      stock.hotScore >= 60 ? '#f58220'               : 'var(--muted)',
          border:    `1px solid ${stock.hotScore >= 60 ? 'rgba(245,130,32,0.25)' : 'var(--border)'}`,
        }}
      >
        🔥 {stock.hotScore}
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
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border2)' }}
        dir="rtl"
      >
        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>🔥 מניות חמות</span>
        <div className="flex gap-1 me-auto">
          {(['il', 'us'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
              style={market === m
                ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }
                : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {m === 'il' ? 'ת"א' : 'ארה"ב'}
            </button>
          ))}
        </div>
        <Link href={`/${locale}/hot`} className="text-[10px] font-semibold transition-colors" style={{ color: 'var(--muted)' }}>
          כל המניות ←
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

'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useLivePrice } from '@/contexts/PriceContext';

/**
 * Trending widget — real data from /api/trending (post mention counts).
 *
 * Falls back to a curated static list only if the API fails or the
 * community is too quiet to produce a ranking.
 */

interface TrendingItem {
  ticker: string;
  mentions: number;
  bullish: number;
  bearish: number;
  neutral: number;
}

const FALLBACK_TICKERS: TrendingItem[] = [
  'NVDA', 'TEVA', 'TSLA', 'AAPL', 'CHKP', 'NICE', 'AMZN', 'MSFT',
].map(t => ({ ticker: t, mentions: 0, bullish: 0, bearish: 0, neutral: 0 }));

function TrendingRow({ item }: { item: TrendingItem }) {
  const locale = useLocale();
  const price = useLivePrice(item.ticker);
  const totalVotes = item.bullish + item.bearish + item.neutral;
  const bullishPct = totalVotes > 0 ? (item.bullish / totalVotes) * 100 : 0;

  if (!price) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
        <div className="text-xs font-bold font-mono text-tsua-muted w-12">{item.ticker}</div>
        <div className="flex-1" />
        <div className="h-3 w-14 rounded-full" style={{ background: 'rgba(26,40,64,0.6)' }} />
      </div>
    );
  }

  const up = price.changePercent >= 0;
  const color = up ? '#00e5b0' : '#ff4d6a';

  return (
    <Link
      href={`/${locale}/stocks/${item.ticker}`}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:bg-white/5 group"
    >
      <span
        className="text-xs font-black font-mono w-12 truncate transition-colors"
        style={{
          color: price.flash ? (price.flash === 'up' ? '#00e5b0' : '#ff4d6a') : '#d4e4ff',
          textShadow: price.flash ? `0 0 8px ${price.flash === 'up' ? 'rgba(0,229,176,0.6)' : 'rgba(255,77,106,0.6)'}` : 'none',
        }}
      >
        {item.ticker}
      </span>

      <div className="flex-1 min-w-0">
        {/* Sentiment bar (bullish vs bearish from post votes) */}
        {totalVotes > 0 ? (
          <div className="h-0.5 rounded-full flex overflow-hidden" style={{ background: 'rgba(26,40,64,0.8)' }}>
            <div className="h-full" style={{ width: `${bullishPct}%`, background: '#00e5b0' }} />
            <div className="h-full flex-1" style={{ background: '#ff4d6a' }} />
          </div>
        ) : (
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
        )}
        {item.mentions > 0 && (
          <div className="text-[9px] text-tsua-muted mt-0.5">
            {item.mentions} אזכורים
          </div>
        )}
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
  const [items, setItems] = useState<TrendingItem[]>(FALLBACK_TICKERS);
  const [windowKey, setWindowKey] = useState<'24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/trending?window=${windowKey}&limit=8`, { cache: 'no-store' });
        if (!res.ok) throw new Error('trending failed');
        const data = await res.json();
        if (!alive) return;
        if (Array.isArray(data?.trending) && data.trending.length >= 3) {
          setItems(data.trending);
        } else {
          setItems(FALLBACK_TICKERS);
        }
      } catch {
        if (alive) setItems(FALLBACK_TICKERS);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    // refresh every 2 minutes
    const timer = setInterval(load, 2 * 60 * 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [windowKey]);

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
          🔥 מניות חמות
        </span>
        <div className="flex-1" />
        <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'rgba(26,40,64,0.5)' }}>
          {(['24h', '7d'] as const).map(w => (
            <button
              key={w}
              onClick={() => setWindowKey(w)}
              className="px-1.5 py-0.5 text-[9px] font-bold transition-colors"
              style={{
                background: windowKey === w ? 'rgba(0,229,176,0.18)' : 'transparent',
                color: windowKey === w ? '#00e5b0' : '#9ab1cc',
              }}
            >
              {w === '24h' ? '24ש\'' : '7ימ\''}
            </button>
          ))}
        </div>
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: loading ? '#ffd700' : '#00e5b0' }}
        />
      </div>

      <div className="py-1">
        {items.map(item => (
          <TrendingRow key={item.ticker} item={item} />
        ))}
      </div>
    </div>
  );
}

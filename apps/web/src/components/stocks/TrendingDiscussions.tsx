'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useLivePrice } from '@/contexts/PriceContext';

interface TrendingTicker {
  ticker: string;
  mentions: number;
  bullish: number;
  bearish: number;
  neutral: number;
}

type WindowOpt = '1h' | '24h' | '7d';

const WINDOW_LABEL: Record<WindowOpt, string> = {
  '1h': 'שעה',
  '24h': '24ש׳',
  '7d': '7ימ׳',
};

function DiscussionRow({ row, rank }: { row: TrendingTicker; rank: number }) {
  const locale = useLocale();
  const live = useLivePrice(row.ticker);
  const isUp = (live?.changePercent ?? 0) >= 0;

  const total = row.bullish + row.bearish + row.neutral || 1;
  const bullPct = (row.bullish / total) * 100;
  const bearPct = (row.bearish / total) * 100;
  const neutPct = 100 - bullPct - bearPct;

  return (
    <Link
      href={`/${locale}/stocks/${row.ticker}`}
      className="group block px-3 py-2.5 rounded-xl transition-all duration-200"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,40,64,0.4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div className="flex items-center gap-2.5 mb-1.5">
        {/* Rank */}
        <span
          className="text-[10px] font-black w-4 text-center font-mono"
          style={{ color: rank <= 3 ? '#00e5b0' : '#5a7090' }}
        >
          {rank}
        </span>

        {/* Ticker */}
        <span className="text-[13px] font-black font-mono" style={{ color: '#e8f0ff' }}>
          ${row.ticker}
        </span>

        {/* Live price (if available) */}
        {live && (
          <span
            className="text-[10px] font-bold font-mono ms-auto tabular-nums"
            style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
          >
            {isUp ? '+' : ''}{live.changePercent.toFixed(2)}%
          </span>
        )}

        {/* Mentions count */}
        <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#7a8ca5' }}>
          <ChatBubbleLeftRightIcon className="w-3 h-3" />
          {row.mentions}
        </span>
      </div>

      {/* Sentiment bar */}
      <div
        className="h-1 rounded-full overflow-hidden flex"
        style={{ background: 'rgba(26,40,64,0.6)' }}
      >
        {bullPct > 0 && (
          <span style={{ width: `${bullPct}%`, background: '#00e5b0' }} />
        )}
        {neutPct > 0 && (
          <span style={{ width: `${neutPct}%`, background: 'rgba(122,140,165,0.5)' }} />
        )}
        {bearPct > 0 && (
          <span style={{ width: `${bearPct}%`, background: '#ff4d6a' }} />
        )}
      </div>
    </Link>
  );
}

function SkeletonRow() {
  return (
    <div className="px-3 py-2.5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="h-3 w-3 rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
        <div className="h-3 w-16 rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
        <div className="h-3 w-10 rounded ms-auto" style={{ background: 'rgba(26,40,64,0.4)' }} />
      </div>
      <div className="h-1 rounded-full w-full" style={{ background: 'rgba(26,40,64,0.4)' }} />
    </div>
  );
}

export function TrendingDiscussions() {
  const [windowOpt, setWindowOpt] = useState<WindowOpt>('24h');
  const [data, setData] = useState<TrendingTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/trending?window=${windowOpt}&limit=6`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setData(json.trending ?? []);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [windowOpt]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(13,20,36,0.6)',
        border: '1px solid rgba(26,40,64,0.6)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <span className="text-[13px] font-black" style={{ color: '#e8f0ff' }}>
            מדוברים
          </span>
        </div>

        {/* Window selector */}
        <div className="flex gap-0.5">
          {(['1h', '24h', '7d'] as const).map(w => (
            <button
              key={w}
              onClick={() => setWindowOpt(w)}
              className="text-[10px] font-bold px-2 py-1 rounded-md transition-all"
              style={
                windowOpt === w
                  ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }
                  : { background: 'transparent', color: '#5a7090', border: '1px solid transparent' }
              }
            >
              {WINDOW_LABEL[w]}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="py-1">
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!loading && data.length === 0 && (
          <div className="text-center py-6 px-4">
            <div className="text-2xl mb-1.5">💭</div>
            <div className="text-[11px] text-tsua-muted">
              {windowOpt === '1h' ? 'אין דיונים בשעה האחרונה' :
               windowOpt === '24h' ? 'אין דיונים ב־24 שעות' :
               'אין דיונים השבוע'}
            </div>
          </div>
        )}

        {!loading && data.map((row, i) => (
          <DiscussionRow key={row.ticker} row={row} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

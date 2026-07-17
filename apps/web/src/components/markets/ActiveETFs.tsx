'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';
import { MarketStatusDot } from '@/components/ui/MarketStatusDot';

type Tag = 'track' | 'leverage' | 'inverse';

interface ETF {
  symbol: string;
  nameHe: string;
  tagHe: string;
  tag: Tag;
}

// Highly-traded ETFs used for hedging / leverage. All are standard US tickers,
// so they resolve live through the shared PriceContext (/api/stocks/batch).
const ETFS: ETF[] = [
  { symbol: 'QQQ',  nameHe: 'נאסד"ק 100',    tagHe: 'עוקב',    tag: 'track' },
  { symbol: 'TQQQ', nameHe: 'נאסד"ק ×3',     tagHe: 'מינוף ×3', tag: 'leverage' },
  { symbol: 'SQQQ', nameHe: 'נאסד"ק הפוך ×3', tagHe: 'שורט ×3',  tag: 'inverse' },
  { symbol: 'SPY',  nameHe: 'S&P 500',       tagHe: 'עוקב',    tag: 'track' },
  { symbol: 'SOXL', nameHe: 'שבבים ×3',      tagHe: 'מינוף ×3', tag: 'leverage' },
];

function tagStyle(tag: Tag): React.CSSProperties {
  if (tag === 'leverage') return { background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)' };
  if (tag === 'inverse')  return { background: 'rgb(var(--rgb-red) / 0.1)', color: 'var(--red)' };
  return { background: 'rgb(var(--rgb-border) / 0.5)', color: 'var(--muted)' };
}

function ETFRow({ etf, rank, isLast }: { etf: ETF; rank: number; isLast: boolean }) {
  const locale = useLocale();
  const live = useLivePrice(etf.symbol);
  const price = live?.price ?? null;
  const pct = live?.changePercent ?? null;
  const flash = live?.flash ?? null;
  const isUp = (pct ?? 0) >= 0;
  const rowBg = flash === 'up'
    ? 'rgb(var(--rgb-accent) / 0.10)'
    : flash === 'down' ? 'rgb(var(--rgb-red) / 0.10)' : 'transparent';

  return (
    <Link
      href={`/${locale}/stocks/${etf.symbol}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 group"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgb(var(--rgb-border) / 0.35)',
        background: rowBg,
        transition: 'background 1.5s ease-out',
      }}
    >
      <span className="text-xs text-tsua-muted w-4 shrink-0">{rank}</span>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] shrink-0"
        style={{ background: 'rgb(var(--rgb-accent) / 0.08)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}
        dir="ltr"
      >
        {etf.symbol.slice(0, 4)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-tsua-text group-hover:text-tsua-accent transition-colors" dir="ltr">
          ${etf.symbol}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={tagStyle(etf.tag)}>{etf.tagHe}</span>
          <span className="text-[10px] text-tsua-muted truncate">{etf.nameHe}</span>
        </div>
      </div>
      <div className="text-end shrink-0">
        {price === null ? (
          <div className="w-14 h-4 rounded animate-pulse ms-auto" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
        ) : (
          <>
            <div
              className="text-sm font-bold font-mono"
              dir="ltr"
              style={{
                color: flash === 'up' ? 'var(--accent)' : flash === 'down' ? 'var(--red)' : 'var(--text)',
                transition: 'color 0.3s ease-out',
              }}
            >
              ${price.toFixed(2)}
            </div>
            <div className="text-xs font-bold" dir="ltr" style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }}>
              {isUp ? '▲' : '▼'} {Math.abs(pct ?? 0).toFixed(2)}%
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export function ActiveETFs() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-bg2) / 0.8)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-black text-tsua-text flex items-center gap-1.5">
          תעודות סל בולטות
          <MarketStatusDot market="US" />
        </h3>
        <span className="text-[10px] text-tsua-muted ms-auto">גידור ומינוף</span>
      </div>
      <div>
        {ETFS.map((e, i) => (
          <ETFRow key={e.symbol} etf={e} rank={i + 1} isLast={i === ETFS.length - 1} />
        ))}
      </div>
    </div>
  );
}

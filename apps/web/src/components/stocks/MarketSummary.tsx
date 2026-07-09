'use client';

import { useLivePrice } from '@/contexts/PriceContext';

const INDICES = [
  { nameHe: 'S&P 500', nameEn: 'S&P 500', symbol: 'SPY',      flag: '🇺🇸', label: 'SPY' },
  { nameHe: 'נאסד"ק',  nameEn: 'NASDAQ',  symbol: 'QQQ',      flag: '🇺🇸', label: 'QQQ' },
  { nameHe: 'ת"א 35',  nameEn: 'TA 35',   symbol: 'EIS',      flag: '🇮🇱', label: 'TA35' },
  { nameHe: 'ת"א 125', nameEn: 'TA 125',  symbol: 'TA125.TA', flag: '🇮🇱', label: 'TA125' },
];

function IndexCard({ nameHe, nameEn, symbol, flag, label }: typeof INDICES[0]) {
  const live = useLivePrice(symbol);

  const isUp = (live?.changePercent ?? 0) >= 0;
  const pct = live?.changePercent ?? 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3.5 cursor-pointer transition-all duration-300 group breathe-card"
      style={{
        background: 'rgb(var(--rgb-bg2) / 0.7)',
        border: '1px solid rgb(var(--rgb-border) / 0.7)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = isUp ? 'rgb(var(--rgb-accent) / 0.25)' : 'rgb(var(--rgb-red) / 0.25)';
        (e.currentTarget as HTMLElement).style.boxShadow = isUp
          ? '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgb(var(--rgb-accent) / 0.08)'
          : '0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px rgb(var(--rgb-red) / 0.08)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--rgb-border) / 0.7)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: isUp
            ? 'radial-gradient(ellipse at 80% 0%, rgb(var(--rgb-accent) / 0.06), transparent 70%)'
            : 'radial-gradient(ellipse at 80% 0%, rgb(var(--rgb-red) / 0.06), transparent 70%)',
        }}
      />

      <div className="relative">
        {/* Name row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{flag}</span>
            <span className="text-[11px] font-semibold text-tsua-muted tracking-wide">
              {nameHe}
            </span>
          </div>
          {live ? (
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-lg tabular-nums"
              style={isUp
                ? { background: 'rgb(var(--rgb-accent) / 0.12)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.15)' }
                : { background: 'rgb(var(--rgb-red) / 0.12)', color: 'var(--red)', border: '1px solid rgb(var(--rgb-red) / 0.15)' }
              }
            >
              {isUp ? '+' : ''}{pct.toFixed(2)}%
            </span>
          ) : (
            <div className="w-12 h-5 rounded-lg animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
          )}
        </div>

        {/* Price */}
        {live ? (
          <div
            dir="ltr"
            className={`text-lg font-black font-mono tracking-tight tabular-nums transition-colors duration-300 px-1 ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
            style={{
              color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text)',
            }}
          >
            {live.price.toFixed(2)}
          </div>
        ) : (
          <div className="w-20 h-6 rounded-lg animate-pulse mt-1" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
        )}

        {/* Mini bar */}
        <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, 50 + (pct * 5))}%`,
              background: isUp
                ? 'linear-gradient(90deg, transparent, var(--accent))'
                : 'linear-gradient(90deg, transparent, var(--red))',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function MarketSummary() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {INDICES.map(idx => <IndexCard key={idx.symbol} {...idx} />)}
    </div>
  );
}

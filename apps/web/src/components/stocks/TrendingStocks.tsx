'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

const TRENDING = [
  { ticker: 'TEVA', nameHe: 'טבע',       nameEn: 'Teva',        exchange: 'NYSE'   },
  { ticker: 'NVDA', nameHe: 'אנבידיה',   nameEn: 'NVIDIA',      exchange: 'NASDAQ' },
  { ticker: 'NICE', nameHe: 'ניס',        nameEn: 'NICE',        exchange: 'NASDAQ' },
  { ticker: 'AAPL', nameHe: 'אפל',        nameEn: 'Apple',       exchange: 'NASDAQ' },
  { ticker: 'CHKP', nameHe: "צ'קפוינט",  nameEn: 'Check Point', exchange: 'NASDAQ' },
];

function TrendRow({ ticker, nameHe, nameEn, exchange }: typeof TRENDING[0]) {
  const locale = useLocale();
  const live = useLivePrice(ticker);
  const isUp = (live?.changePercent ?? 0) >= 0;

  return (
    <Link
      href={`/${locale}/stocks/${ticker}`}
      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,40,64,0.4)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Left: rank dot + name */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-all group-hover:scale-110"
          style={{
            background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
            border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
            color: isUp ? '#00e5b0' : '#ff4d6a',
          }}
        >
          {ticker.slice(0, 2)}
        </div>
        <div>
          <div className="text-sm font-bold text-tsua-text group-hover:text-tsua-green transition-colors leading-none mb-0.5">
            {nameHe}
          </div>
          <div dir="ltr" className="text-[10px] text-tsua-muted font-mono">{ticker} · {exchange}</div>
        </div>
      </div>

      {/* Right: price + change */}
      <div className="text-end shrink-0">
        {live ? (
          <>
            <div
              dir="ltr"
              className="text-sm font-black font-mono tabular-nums transition-colors duration-300"
              style={{ color: live.flash === 'up' ? '#00e5b0' : live.flash === 'down' ? '#ff4d6a' : '#c8d8f0' }}
            >
              {live.price.toFixed(2)}
            </div>
            <div
              dir="ltr"
              className="text-[11px] font-bold tabular-nums"
              style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
            >
              {isUp ? '+' : ''}{live.changePercent.toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <div className="w-14 h-4 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
            <div className="w-10 h-3 rounded animate-pulse ms-auto" style={{ background: 'rgba(26,40,64,0.5)' }} />
          </div>
        )}
      </div>
    </Link>
  );
}

export function TrendingStocks() {
  const locale = useLocale();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(13,20,36,0.7)',
        border: '1px solid rgba(26,40,64,0.7)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,185,66,0.12)', border: '1px solid rgba(245,185,66,0.2)' }}
        >
          <ArrowTrendingUpIcon className="w-4 h-4" style={{ color: '#f5b942' }} />
        </div>
        <span className="text-sm font-bold text-tsua-text">
          {'טרנדינג עכשיו'}
        </span>
        <span
          className="ms-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          {'חי'}
        </span>
      </div>

      {/* List */}
      <div className="p-2">
        {TRENDING.map(stock => <TrendRow key={stock.ticker} {...stock} />)}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-2.5 text-center"
        style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}
      >
        <Link
          href={`/${locale}/markets`}
          className="text-xs font-semibold transition-colors hover:text-tsua-green"
          style={{ color: '#5a7090' }}
        >
          {'כל המניות ←'}
        </Link>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useLivePrice } from '@/contexts/PriceContext';

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

function HotRow({ symbol, nameHe, flag, tag }: typeof HOT[0]) {
  const locale = useLocale();
  const live = useLivePrice(symbol);

  return (
    <Link
      href={`/${locale}/stocks/${symbol}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors group"
      style={{ borderBottom: '1px solid rgba(26,40,64,0.3)' }}
    >
      {/* Symbol badge */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0"
        style={{
          background: 'rgba(0,229,176,0.08)',
          border: '1px solid rgba(0,229,176,0.15)',
          color: '#00e5b0',
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
          style={{ background: 'rgba(0,229,176,0.07)', color: 'rgba(0,229,176,0.7)' }}
        >
          {tag}
        </span>
      </div>

      {/* Price */}
      <div className="text-end shrink-0">
        {!live ? (
          <div className="w-14 h-4 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.5)' }} />
        ) : (
          <>
            <div
              className="text-sm font-black font-mono tabular-nums"
              style={{ color: live.flash === 'up' ? '#00e5b0' : live.flash === 'down' ? '#ff4d6a' : '#c8d8f0' }}
              dir="ltr"
            >
              ${live.price >= 1000
                ? live.price.toLocaleString('en', { maximumFractionDigits: 0 })
                : live.price.toFixed(2)}
            </div>
            <div
              className="text-[11px] font-bold tabular-nums"
              dir="ltr"
              style={{ color: live.changePercent >= 0 ? '#00e5b0' : '#ff4d6a' }}
            >
              {live.changePercent >= 0 ? '+' : ''}{live.changePercent.toFixed(2)}%
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

export function HotStocks() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">🔥 מניות רותחות</h3>
      </div>

      <div dir="rtl">
        {HOT.map(s => <HotRow key={s.symbol} {...s} />)}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          מחירים בזמן אמת · לחץ להצגת פרטים
        </p>
      </div>
    </div>
  );
}

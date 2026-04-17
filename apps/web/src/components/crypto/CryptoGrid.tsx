'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface Coin {
  id: string;
  symbol: string;
  nameHe: string;
  nameEn: string;
  description: string;
  image: string | null;
  price: number | null;
  changePercent24h: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  volume24h: number | null;
}

function formatLarge(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function formatPrice(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

export function CryptoGrid() {
  const locale = useLocale();
  const [coins, setCoins] = useState<Coin[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/crypto');
        const d = await r.json();
        if (!cancelled && Array.isArray(d.coins)) {
          setCoins(d.coins);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && !coins) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse" style={{ background: i % 2 ? 'rgba(26,40,64,0.2)' : 'transparent' }} />
        ))}
      </div>
    );
  }

  if (!coins || coins.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm text-tsua-muted"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        לא ניתן לטעון נתוני קריפטו כרגע. CoinGecko עשוי להיות עמוס.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Table header */}
      <div
        className="hidden md:grid md:grid-cols-[40px_2fr_1fr_1fr_1.2fr_1.2fr] gap-3 px-4 py-3 text-[10px] font-black text-tsua-muted uppercase tracking-widest"
        style={{ borderBottom: '1px solid var(--border2)' }}
      >
        <div>#</div>
        <div>שם</div>
        <div dir="ltr" className="text-end">מחיר</div>
        <div dir="ltr" className="text-end">שינוי 24ש</div>
        <div dir="ltr" className="text-end">שווי שוק</div>
        <div dir="ltr" className="text-end">נפח 24ש</div>
      </div>

      {/* Coin rows */}
      {coins.map((coin, i) => {
        const isUp = (coin.changePercent24h ?? 0) >= 0;
        const changeColor = coin.changePercent24h == null
          ? '#5a7090'
          : isUp ? '#00e5b0' : '#ff4d6a';

        return (
          <Link
            key={coin.id}
            href={`/${locale}/crypto/${coin.id}`}
            className="grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_2fr_1fr_1fr_1.2fr_1.2fr] gap-3 px-4 py-3 transition-all hover:bg-white/3 items-center"
            style={{ borderBottom: i < coins.length - 1 ? '1px solid var(--border2)' : 'none' }}
          >
            {/* Rank */}
            <div className="text-xs font-mono text-tsua-muted">
              {coin.marketCapRank ?? i + 1}
            </div>

            {/* Name + symbol + description */}
            <div className="flex items-center gap-2.5 min-w-0">
              {coin.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coin.image} alt={coin.nameEn} className="w-8 h-8 rounded-full shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-tsua-text">{coin.nameHe}</span>
                  <span dir="ltr" className="text-[10px] font-mono font-bold text-tsua-muted px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(26,40,64,0.5)' }}
                  >
                    {coin.symbol}
                  </span>
                </div>
                <div className="text-[10px] text-tsua-muted truncate mt-0.5 hidden sm:block">
                  {coin.description}
                </div>
              </div>
            </div>

            {/* Price — mobile + desktop */}
            <div dir="ltr" className="text-sm font-black font-mono text-tsua-text text-end md:text-end tabular-nums">
              {formatPrice(coin.price)}
              {/* Mobile inline change */}
              <div dir="ltr" className="text-[11px] font-bold font-mono md:hidden mt-0.5" style={{ color: changeColor }}>
                {coin.changePercent24h != null
                  ? `${isUp ? '▲' : '▼'} ${Math.abs(coin.changePercent24h).toFixed(2)}%`
                  : '—'}
              </div>
            </div>

            {/* Desktop-only extra columns */}
            <div dir="ltr" className="hidden md:block text-sm font-bold font-mono text-end tabular-nums" style={{ color: changeColor }}>
              {coin.changePercent24h != null
                ? `${isUp ? '+' : ''}${coin.changePercent24h.toFixed(2)}%`
                : '—'}
            </div>
            <div dir="ltr" className="hidden md:block text-sm font-mono text-tsua-text text-end tabular-nums">
              {formatLarge(coin.marketCap)}
            </div>
            <div dir="ltr" className="hidden md:block text-sm font-mono text-tsua-muted text-end tabular-nums">
              {formatLarge(coin.volume24h)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

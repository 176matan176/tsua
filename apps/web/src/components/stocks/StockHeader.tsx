'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useLivePrice } from '@/contexts/PriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY, type DictEntry } from '@/lib/financialDictionary';

export interface StockData {
  ticker: string;
  name: string;
  currency: string;
  exchange: string;
  logo: string | null;
  open: number;
  high: number;
  low: number;
  prevClose: number | null;
  volume: number | null;
  marketCap: number | null;
  // fundamentals
  week52High: number | null;
  week52Low: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  pbRatio: number | null;
  roeTTM: number | null;
  revenueGrowthTTM: number | null;
  // company
  industry: string | null;
  sector: string | null;
  weburl: string | null;
  employees: number | null;
  ipo: string | null;
  country: string | null;
}

interface StockHeaderProps {
  ticker: string;
  onDataLoaded?: (data: StockData) => void;
}

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgba(26,40,64,0.6)' }}
    />
  );
}

export function StockHeader({ ticker, onDataLoaded }: StockHeaderProps) {
  const locale = useLocale();
  const { user } = useAuth();
  const livePrice = useLivePrice(ticker);
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/stocks/${ticker}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        onDataLoaded?.(d);
      })
      .catch(() => setData({
        ticker, name: ticker, currency: 'USD', exchange: '', logo: null,
        open: 0, high: 0, low: 0, prevClose: null, volume: null, marketCap: null,
        week52High: null, week52Low: null, peRatio: null, forwardPE: null, eps: null,
        beta: null, dividendYield: null, pbRatio: null, roeTTM: null, revenueGrowthTTM: null,
        industry: null, sector: null, weburl: null, employees: null, ipo: null, country: null,
      }))
      .finally(() => setLoading(false));
  }, [ticker]);

  // Check watchlist status
  useEffect(() => {
    if (!user) return;
    fetch(`/api/watchlist/${ticker}`)
      .then(r => r.json())
      .then(d => setInWatchlist(d.inWatchlist ?? false))
      .catch(() => {});
  }, [ticker, user]);

  async function toggleWatchlist() {
    if (!user) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await fetch(`/api/watchlist/${ticker}`, { method: 'DELETE' });
        setInWatchlist(false);
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker,
            name_en: data?.name,
            exchange: data?.exchange,
            logo: data?.logo,
          }),
        });
        setInWatchlist(true);
      }
    } catch {
      // ignore
    } finally {
      setWatchlistLoading(false);
    }
  }

  const price = livePrice?.price ?? 0;
  const change = livePrice?.change ?? 0;
  const changePercent = livePrice?.changePercent ?? 0;
  const flash = livePrice?.flash ?? null;
  const isPositive = changePercent >= 0;
  const currencySymbol = data?.currency === 'ILS' ? '₪' : '$';

  if (loading || !livePrice) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgba(13,20,36,0.9)', border: '1px solid rgba(26,40,64,0.8)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1">
            <SkeletonPulse className="h-6 w-48" />
            <div className="mt-3 flex items-end gap-3">
              <SkeletonPulse className="h-10 w-32" />
              <SkeletonPulse className="h-6 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonPulse className="h-9 w-24" />
            <SkeletonPulse className="h-9 w-24" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-tsua-border pt-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center space-y-1">
              <SkeletonPulse className="h-3 w-16 mx-auto" />
              <SkeletonPulse className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const flashStyle = flash === 'up'
    ? { background: 'rgba(0,229,176,0.06)', transition: 'background 0.3s' }
    : flash === 'down'
    ? { background: 'rgba(255,77,106,0.06)', transition: 'background 0.3s' }
    : { transition: 'background 0.5s' };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(13,20,36,0.9)',
        border: '1px solid rgba(26,40,64,0.8)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        ...flashStyle,
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            {data?.logo && (
              <img src={data.logo} alt={data.name} className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 shrink-0" />
            )}
            <h1 className="text-xl font-black text-tsua-text">{data?.name ?? ticker}</h1>
            <span dir="ltr" className="text-tsua-muted font-mono text-sm px-2 py-0.5 rounded-lg" style={{ background: 'rgba(26,40,64,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
              ${ticker}
            </span>
            {/* Exchange badge */}
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,229,176,0.08)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}>
              {data?.currency === 'ILS'
                ? 'בורסה תל אביב'
                : (data?.exchange || 'NYSE/NASDAQ')}
            </span>
            {/* Industry badge if available */}
            {data?.industry && (
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                {data.industry}
              </span>
            )}
            {/* LIVE badge */}
            {livePrice && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,176,0.08)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-tsua-green animate-pulse inline-block" />
                LIVE
              </span>
            )}
          </div>

          {/* Price row */}
          <div className="mt-4 flex items-end gap-3">
            <span
              dir="ltr"
              className="text-4xl font-black font-mono transition-colors duration-300"
              style={{ color: flash === 'up' ? '#00e5b0' : flash === 'down' ? '#ff4d6a' : '#e8f0ff' }}
            >
              {currencySymbol}{price.toFixed(2)}
            </span>
            <div className="flex flex-col pb-0.5">
              <span
                dir="ltr"
                className="text-lg font-bold"
                style={{ color: isPositive ? '#00e5b0' : '#ff4d6a' }}
              >
                {isPositive ? '+' : ''}{change.toFixed(2)}
              </span>
              <span
                dir="ltr"
                className="text-sm font-bold px-2 py-0.5 rounded-lg"
                style={{
                  background: isPositive ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
                  color: isPositive ? '#00e5b0' : '#ff4d6a',
                  border: `1px solid ${isPositive ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
                }}
              >
                {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          {user ? (
            <button
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={inWatchlist
                ? { background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)', color: '#00e5b0' }
                : { background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)', color: '#5a7090' }
              }
            >
              {inWatchlist
                ? <BookmarkSolid className="w-4 h-4" />
                : <BookmarkIcon className="w-4 h-4" />
              }
              {inWatchlist
                ? 'במעקב ✓'
                : 'הוסף למעקב'
              }
            </button>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)', color: '#5a7090' }}
            >
              <BookmarkIcon className="w-4 h-4" />
              {'הוסף למעקב'}
            </Link>
          )}
          <Link
            href={`/${locale}/alerts`}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.3)', color: '#00e5b0' }}
          >
            🔔 {'התראה'}
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4"
        style={{ borderTop: '1px solid rgba(26,40,64,0.5)' }}
      >
        {([
          { label: 'פתיחה',     value: data?.open    ? `${currencySymbol}${data.open.toFixed(2)}` : '—', term: DICTIONARY.open },
          { label: 'שיא יומי', value: data?.high    ? `${currencySymbol}${data.high.toFixed(2)}` : '—', term: DICTIONARY.high },
          { label: 'שפל יומי', value: data?.low     ? `${currencySymbol}${data.low.toFixed(2)}`  : '—', term: DICTIONARY.low },
          { label: 'שווי שוק', value: data?.marketCap
            ? data.marketCap >= 1e9
              ? `${currencySymbol}${(data.marketCap / 1e9).toFixed(1)}B`
              : `${currencySymbol}${(data.marketCap / 1e6).toFixed(0)}M`
            : '—',
            term: DICTIONARY.marketcap,
          },
        ] as { label: string; value: string; term: DictEntry }[]).map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-tsua-muted text-xs mb-0.5 inline-flex items-center justify-center">
              {stat.label}
              <InfoTooltip term={stat.term} />
            </div>
            <div dir="ltr" className="text-tsua-text font-bold text-sm">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

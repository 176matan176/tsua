'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { CurrencyRates } from './CurrencyRates';
import { FearGreedWidget } from './FearGreedWidget';
import { MarketPE } from './MarketPE';
import { HotStocks } from './HotStocks';

interface IndexData {
  symbol: string; nameHe: string; nameEn: string;
  flag: string; currency: string;
  price: number; change: number; changePercent: number;
}
interface StockRow {
  symbol: string; nameHe: string; nameEn: string; exchange: string;
  price: number; change: number; changePercent: number;
}
interface ForexRate {
  pair: string; base: string; quote: string;
  rate: number; change: number; changePercent: number;
}
interface MarketsData {
  indices: IndexData[];
  gainers: StockRow[];
  losers: StockRow[];
  forex: ForexRate[];
}

const SECTORS = [
  { name: 'טכנולוגיה', changePercent: +2.1,  emoji: '💻' },
  { name: 'ביטחון',    changePercent: +1.8,  emoji: '🛡️' },
  { name: 'נדל"ן',     changePercent: +0.4,  emoji: '🏢' },
  { name: 'אנרגיה',    changePercent: -0.2,  emoji: '⚡' },
  { name: 'בנקאות',    changePercent: -1.3,  emoji: '🏦' },
  { name: 'ביו-פארמה', changePercent: -2.8,  emoji: '💊' },
  { name: 'תקשורת',    changePercent: -1.1,  emoji: '📡' },
  { name: 'תעשייה',    changePercent: +0.7,  emoji: '🏭' },
];

function pct(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function IndexCard({ idx }: { idx: IndexData }) {
  const isUp = idx.changePercent >= 0;
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:scale-[1.02]"
      style={{
        background: 'rgba(13,20,36,0.8)',
        border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
        boxShadow: isUp ? '0 4px 20px rgba(0,229,176,0.05)' : '0 4px 20px rgba(255,77,106,0.05)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-tsua-muted flex items-center gap-1.5">
            <span>{idx.flag}</span>
            <span className="font-mono">{idx.symbol}</span>
          </div>
          <div className="font-bold text-tsua-text text-sm mt-0.5">
            {idx.nameHe}
          </div>
        </div>
        <span
          className="text-[10px] font-black px-2 py-1 rounded-lg"
          style={isUp
            ? { background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }
            : { background: 'rgba(255,77,106,0.1)', color: '#ff4d6a' }
          }
        >
          {isUp ? '▲' : '▼'} {Math.abs(idx.changePercent).toFixed(2)}%
        </span>
      </div>
      <div
        className="text-2xl font-black font-mono"
        style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
        dir="ltr"
      >
        {idx.currency === 'ILS' ? '₪' : '$'}{idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
        {isUp ? '+' : ''}{idx.change.toFixed(2)}
      </div>
    </div>
  );
}

function StockTable({ stocks, type }: { stocks: StockRow[]; type: 'gainers' | 'losers' }) {
  const isGainer = type === 'gainers';
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
      >
        <span className="text-lg">{isGainer ? '🚀' : '📉'}</span>
        <h3 className="text-sm font-black text-tsua-text">
          {isGainer ? 'מובילות עולות' : 'מובילות יורדות'}
        </h3>
      </div>
      <div>
        {stocks.map((s, i) => {
          const isUp = s.changePercent >= 0;
          return (
            <Link
              key={s.symbol}
              href={`/he/stocks/${s.symbol}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group"
              style={{ borderBottom: i < stocks.length - 1 ? '1px solid rgba(26,40,64,0.35)' : 'none' }}
            >
              <span className="text-xs text-tsua-muted w-4 shrink-0">{i + 1}</span>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                style={{ background: isUp ? 'rgba(0,229,176,0.08)' : 'rgba(255,77,106,0.08)', color: isUp ? '#00e5b0' : '#ff4d6a', border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}` }}
              >
                {s.symbol.slice(0, 3)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-tsua-text group-hover:text-tsua-accent transition-colors" dir="ltr">
                  ${s.symbol}
                </div>
                <div className="text-[10px] text-tsua-muted truncate">
                  {s.nameHe} · {s.exchange}
                </div>
              </div>
              <div className="text-end shrink-0">
                <div className="text-sm font-bold font-mono text-tsua-text" dir="ltr">
                  ${s.price.toFixed(2)}
                </div>
                <div
                  className="text-xs font-bold"
                  dir="ltr"
                  style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
                >
                  {isUp ? '▲' : '▼'} {Math.abs(s.changePercent).toFixed(2)}%
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SectorHeatmap() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-black text-tsua-text">
          🗺️ מפת סקטורים
        </h3>
      </div>
      <div className="grid grid-cols-4 gap-1.5 p-3">
        {SECTORS.map(s => {
          const isUp = s.changePercent >= 0;
          const intensity = Math.min(Math.abs(s.changePercent) / 3, 1);
          const bg = isUp
            ? `rgba(0,229,176,${0.06 + intensity * 0.18})`
            : `rgba(255,77,106,${0.06 + intensity * 0.18})`;
          const border = isUp
            ? `rgba(0,229,176,${0.1 + intensity * 0.25})`
            : `rgba(255,77,106,${0.1 + intensity * 0.25})`;
          return (
            <div
              key={s.name}
              className="rounded-xl p-2.5 text-center transition-all hover:scale-105 cursor-default"
              style={{ background: bg, border: `1px solid ${border}` }}
            >
              <div className="text-lg mb-0.5">{s.emoji}</div>
              <div className="text-[9px] font-bold text-tsua-text truncate">
                {s.name}
              </div>
              <div
                className="text-[10px] font-black mt-0.5"
                style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
              >
                {pct(s.changePercent)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForexCard({ rates }: { rates: ForexRate[] }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-black text-tsua-text">
          💱 שערי חליפין
        </h3>
      </div>
      <div>
        {rates.map((r, i) => {
          const isUp = (r.changePercent ?? 0) >= 0;
          return (
            <div
              key={r.pair}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < rates.length - 1 ? '1px solid rgba(26,40,64,0.35)' : 'none' }}
            >
              <div className="flex items-center gap-2">
                <span>{r.base}{r.quote}</span>
                <span className="text-sm font-bold text-tsua-text" dir="ltr">{r.pair}</span>
              </div>
              <div className="text-end">
                <div className="text-sm font-bold font-mono text-tsua-text" dir="ltr">
                  {r.rate > 100 ? r.rate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : r.rate.toFixed(4)}
                </div>
                {r.changePercent != null && (
                  <div className="text-xs font-semibold" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
                    {isUp ? '▲' : '▼'} {Math.abs(r.changePercent).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.6)' }}>
      <div className="space-y-2">
        <div className="h-3 w-20 rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
        <div className="h-7 w-28 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
        <div className="h-3 w-16 rounded" style={{ background: 'rgba(26,40,64,0.4)' }} />
      </div>
    </div>
  );
}

export function MarketsPage() {
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch('/api/markets', { cache: 'no-store' });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-tsua-text">
            📊 שווקים
          </h1>
          {lastUpdated && (
            <p className="text-xs text-tsua-muted mt-0.5">
              עודכן{' '}
              {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-tsua-muted hover:text-tsua-text transition-all disabled:opacity-50"
          style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </div>

      {/* Indices grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)
          : (data?.indices ?? []).map(idx => (
            <IndexCard key={idx.symbol} idx={idx} />
          ))
        }
      </div>

      {/* Gainers + Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <>
            <div className="rounded-2xl h-64 animate-pulse" style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.6)' }} />
            <div className="rounded-2xl h-64 animate-pulse" style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.6)' }} />
          </>
        ) : (
          <>
            <StockTable stocks={data?.gainers ?? []} type="gainers" />
            <StockTable stocks={data?.losers ?? []} type="losers" />
          </>
        )}
      </div>

      {/* Sector heatmap + Currency Rates */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4">
        <SectorHeatmap />
        <CurrencyRates />
      </div>

      {/* Fear & Greed + Market P/E + Hot Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FearGreedWidget />
        <MarketPE />
        <HotStocks />
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-tsua-muted text-center pb-2">
        הנתונים עשויים להיות מעוכבים עד 15 דקות. אינם מהווים ייעוץ השקעות.
      </p>
    </div>
  );
}

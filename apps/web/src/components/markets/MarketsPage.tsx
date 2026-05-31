'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { CurrencyRates } from './CurrencyRates';
import { FearGreedWidget } from './FearGreedWidget';
import { MarketPE } from './MarketPE';
import { HotStocks } from './HotStocks';
import { SectorHeatmap as LiveSectorHeatmap } from './SectorHeatmap';
import { MacroWidget } from './MacroWidget';
import { useLocale } from 'next-intl';

interface IndexData {
  symbol: string; nameHe: string; nameEn: string;
  flag: string; currency: string;
  // Nullable now — server emits null instead of 0 when a quote fails to load,
  // so we can render "—" instead of pretending "$0.00" is a real price.
  price: number | null;
  change: number | null;
  changePercent: number | null;
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

// After this many ms without a successful refresh, the timestamp gets an
// amber warning to signal staleness. 5 min matches our 60s refresh cadence
// + a generous grace period for transient failures.
const STALE_AFTER_MS = 5 * 60 * 1000;
// Auto-refresh interval. 60s == server-side ISR for /api/markets, so it's
// the maximum frequency at which we'd actually see new data.
const REFRESH_MS = 60 * 1000;

function pct(n: number) {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function IndexCard({ idx }: { idx: IndexData }) {
  // No-data path: show neutral card with "—" instead of pretending a 0-priced
  // index moved 0%. Keeps the grid layout stable while signalling honestly.
  const hasData = idx.price !== null && idx.changePercent !== null;
  if (!hasData) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(13,20,36,0.6)',
          border: '1px solid rgba(26,40,64,0.7)',
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-tsua-muted flex items-center gap-1.5">
              <span>{idx.flag}</span>
              <span className="font-mono">{idx.symbol}</span>
            </div>
            <div className="font-bold text-tsua-text text-sm mt-0.5">{idx.nameHe}</div>
          </div>
          <span className="text-[10px] font-black px-2 py-1 rounded-lg text-tsua-muted" style={{ background: 'rgba(26,40,64,0.5)' }}>
            ⚠️ N/A
          </span>
        </div>
        <div className="text-2xl font-black font-mono text-tsua-muted" dir="ltr">—</div>
        <div className="text-[10px] text-tsua-muted mt-1">נתון לא זמין</div>
      </div>
    );
  }

  const changePct = idx.changePercent!;
  const isUp = changePct >= 0;
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
          {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
        </span>
      </div>
      <div
        className="text-2xl font-black font-mono"
        style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
        dir="ltr"
      >
        {idx.currency === 'ILS' ? '₪' : '$'}{idx.price!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
        {isUp ? '+' : ''}{(idx.change ?? 0).toFixed(2)}
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

function SectorHeatmapCard({ locale }: { locale: string }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
      >
        <h3 className="text-sm font-black text-tsua-text">🗺️ מפת מגזרים</h3>
        <Link
          href={`/${locale}/sectors`}
          className="text-[10px] font-bold text-tsua-muted hover:text-tsua-accent transition-colors"
        >
          כל המגזרים ←
        </Link>
      </div>
      <div className="p-3">
        <LiveSectorHeatmap variant="compact" />
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

/** Shallow runtime check that the response is shaped the way we expect.
 *  Server bugs / proxy interference can return HTML or wrong-shape JSON; we
 *  want to fall to the error path rather than crash on `.map of undefined`. */
function isMarketsData(x: unknown): x is MarketsData {
  if (!x || typeof x !== 'object') return false;
  const d = x as Record<string, unknown>;
  return Array.isArray(d.indices) && Array.isArray(d.gainers)
      && Array.isArray(d.losers)  && Array.isArray(d.forex);
}

export function MarketsPage() {
  const locale = useLocale();
  const [data, setData] = useState<MarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  // True when the *latest* refresh attempt failed. Independent of whether we
  // still have prior data on screen — that's what `data` tracks. Without this
  // a silent 60s-cycle failure shows a stale "עודכן 14:32" forever.
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();

    async function fetchData(isRefresh = false) {
      if (isRefresh) setRefreshing(true);
      try {
        const res = await fetch('/api/markets', { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const d = await res.json();
        if (ctrl.signal.aborted) return;
        if (!isMarketsData(d)) throw new Error('bad shape');
        setData(d);
        setLastUpdated(new Date());
        setRefreshFailed(false);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Keep prior `data` so the widget doesn't blank out on a transient
        // failure — but flip the flag so the header tells the truth.
        setRefreshFailed(true);
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    fetchData();
    const interval = setInterval(() => fetchData(true), REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(interval);
    };
  }, []);

  // Manual refresh button bypasses the interval but reuses the same fetcher.
  // We can't reach the closed-over fetchData; trigger a one-off identical call.
  const manualRefresh = () => {
    setRefreshing(true);
    fetch('/api/markets', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then(d => {
        if (!isMarketsData(d)) throw new Error('bad shape');
        setData(d);
        setLastUpdated(new Date());
        setRefreshFailed(false);
      })
      .catch(() => setRefreshFailed(true))
      .finally(() => setRefreshing(false));
  };

  // Show staleness if either the last fetch failed OR the timestamp is older
  // than STALE_AFTER_MS (e.g., user backgrounded the tab and our interval was
  // throttled by the browser).
  const isStale = lastUpdated !== null && Date.now() - lastUpdated.getTime() > STALE_AFTER_MS;
  const showWarning = refreshFailed || isStale;

  return (
    <div className="space-y-5" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-tsua-text">
            📊 שווקים
          </h1>
          {lastUpdated && (
            <p
              className="text-xs mt-0.5 flex items-center gap-1"
              style={{ color: showWarning ? '#ffd166' : undefined }}
              title={
                refreshFailed
                  ? `הרענון האחרון נכשל. הנתונים מהזמן ${lastUpdated.toLocaleString('he-IL')}`
                  : isStale
                    ? `הנתונים ישנים (מ-${lastUpdated.toLocaleString('he-IL')})`
                    : lastUpdated.toLocaleString('he-IL')
              }
            >
              {showWarning && <span>⚠️</span>}
              <span className={showWarning ? '' : 'text-tsua-muted'}>
                עודכן {lastUpdated.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </p>
          )}
          {!lastUpdated && refreshFailed && !loading && (
            <p className="text-xs mt-0.5" style={{ color: '#ff4d6a' }}>
              ⚠️ לא ניתן לטעון נתונים
            </p>
          )}
        </div>
        <button
          onClick={manualRefresh}
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
        <SectorHeatmapCard locale={locale} />
        <CurrencyRates />
      </div>

      {/* Fear & Greed + Market P/E + Hot Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FearGreedWidget />
        <MarketPE />
        <HotStocks />
      </div>

      {/* Macro data */}
      <MacroWidget />

      {/* Disclaimer */}
      <p className="text-[10px] text-tsua-muted text-center pb-2">
        הנתונים עשויים להיות מעוכבים עד 15 דקות. אינם מהווים ייעוץ השקעות.
      </p>
    </div>
  );
}

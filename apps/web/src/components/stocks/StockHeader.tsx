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
import { getStockDescription, getStockLongDescription } from '@/lib/stockDescriptions';

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
  /** Server flips this true when the Finnhub profile/metrics call failed (or
   *  came back empty) — the quote is still fresh, but company name/logo/PE
   *  may be missing. Lets the UI show a subtle "company data unavailable"
   *  hint instead of pretending the company is anonymous. */
  partial?: boolean;
  /** Extended-hours / market-state fields from Yahoo. All null for symbols
   *  Yahoo doesn't expose (most TASE listings); the UI hides the row. */
  marketState?: string | null;
  preMarketPrice?: number | null;
  preMarketChange?: number | null;
  preMarketChangePct?: number | null;
  preMarketTime?: number | null;
  postMarketPrice?: number | null;
  postMarketChange?: number | null;
  postMarketChangePct?: number | null;
  postMarketTime?: number | null;
}

interface StockHeaderProps {
  ticker: string;
  onDataLoaded?: (data: StockData) => void;
}

function SkeletonPulse({ className }: { className: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgb(var(--rgb-border) / 0.6)' }}
    />
  );
}

// Tracks the REST-shaped quote so we can fall back to it if the WS price
// never arrives. Extends what StockData carries; we only need the basics.
interface RestQuote { price: number; change: number; changePercent: number }

export function StockHeader({ ticker, onDataLoaded }: StockHeaderProps) {
  const locale = useLocale();
  const { user } = useAuth();
  const livePrice = useLivePrice(ticker);
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  // Honest error flag — was previously a fabricated fake-data fallback that
  // claimed USD/empty-exchange for *any* failed ticker, including TASE ones.
  const [errored, setErrored] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  // REST-fetched quote used as a fallback when the WS socket isn't delivering.
  // We capture it from /api/stocks/<ticker> alongside the metadata.
  const [restQuote, setRestQuote] = useState<RestQuote | null>(null);
  // After 5s without livePrice, give up waiting and render with the REST quote.
  const [waitedForLive, setWaitedForLive] = useState(false);

  // Reset waiting-for-live on every ticker switch so the timer restarts.
  useEffect(() => {
    setWaitedForLive(false);
    setRestQuote(null);
    setErrored(false);
  }, [ticker]);

  // Main metadata fetch — AbortController prevents a slow response for the
  // *previous* ticker from overwriting the new ticker's data after navigation.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    fetch(`/api/stocks/${ticker}`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then((d: StockData & { price?: number; change?: number; changePercent?: number }) => {
        if (ctrl.signal.aborted) return;
        if (!d || typeof d !== 'object') throw new Error('bad shape');
        setData(d);
        onDataLoaded?.(d);
        // Capture the REST quote for fallback rendering when WS is silent.
        if (typeof d.price === 'number' && d.price > 0) {
          setRestQuote({
            price: d.price,
            change: typeof d.change === 'number' ? d.change : 0,
            changePercent: typeof d.changePercent === 'number' ? d.changePercent : 0,
          });
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Don't fabricate a fake-but-real-looking object — the old behavior
        // labelled TASE tickers as USD/NYSE which was actively misleading.
        setErrored(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [ticker, onDataLoaded]);

  // After REST_FALLBACK_MS without a WS price arriving, flip waitedForLive so
  // the render path uses the REST quote (still fresh, just not pushed).
  useEffect(() => {
    if (livePrice) return;
    const t = setTimeout(() => setWaitedForLive(true), 5000);
    return () => clearTimeout(t);
  }, [livePrice, ticker]);

  // Check watchlist status — own AbortController so it doesn't race on
  // ticker change either.
  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    fetch(`/api/watchlist/${ticker}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then(d => {
        if (ctrl.signal.aborted) return;
        setInWatchlist(d.inWatchlist ?? false);
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Stay defensive — false is the safe default for the toggle button.
        setInWatchlist(false);
      });
    return () => ctrl.abort();
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

  // Pick the freshest price source. WS livePrice is best (sub-second push);
  // REST quote is a fallback (still real, but generated server-side). If both
  // are missing we have nothing valid to display — that's the skeleton path.
  const priceSource: 'live' | 'rest' | null =
    livePrice && livePrice.price > 0 ? 'live'
    : restQuote && restQuote.price > 0 ? 'rest'
    : null;
  const price          = priceSource === 'live' ? livePrice!.price          : priceSource === 'rest' ? restQuote!.price          : null;
  const change         = priceSource === 'live' ? livePrice!.change         : priceSource === 'rest' ? restQuote!.change         : null;
  const changePercent  = priceSource === 'live' ? livePrice!.changePercent  : priceSource === 'rest' ? restQuote!.changePercent  : null;
  const flash          = priceSource === 'live' ? (livePrice!.flash ?? null) : null;
  const isPositive = (changePercent ?? 0) >= 0;
  const currencySymbol = data?.currency === 'ILS' ? '₪' : '$';
  // Prefer the 35-50-word company background; fall back to the one-line
  // description for long-tail tickers we haven't covered yet. Both better
  // than an English description from Yahoo.
  const description = getStockLongDescription(ticker) ?? getStockDescription(ticker);

  // Honest error card when the metadata fetch failed and we have nothing to
  // show — replaces the prior behavior of fabricating fake StockData.
  if (errored && !data) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgb(var(--rgb-bg2) / 0.9)', border: '1px solid rgb(var(--rgb-red) / 0.3)' }}
      >
        <div className="text-3xl mb-2">📡</div>
        <h2 className="text-base font-bold text-tsua-text">לא ניתן לטעון נתוני {ticker}</h2>
        <p className="text-xs text-tsua-muted mt-1">בדוק שהסימול תקין או נסה שוב בעוד מספר דקות</p>
      </div>
    );
  }

  // Show skeleton while metadata is still in-flight, OR while we're waiting
  // on the first WS price (max 5s before falling back to REST).
  const noPriceYet = price === null;
  const showSkeleton = loading || (noPriceYet && !waitedForLive);
  if (showSkeleton) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: 'rgb(var(--rgb-bg2) / 0.9)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}
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
    ? { background: 'rgb(var(--rgb-accent) / 0.06)', transition: 'background 0.3s' }
    : flash === 'down'
    ? { background: 'rgb(var(--rgb-red) / 0.06)', transition: 'background 0.3s' }
    : { transition: 'background 0.5s' };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgb(var(--rgb-bg2) / 0.9)',
        border: '1px solid rgb(var(--rgb-border) / 0.8)',
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
            <span dir="ltr" className="text-tsua-muted font-mono text-sm px-2 py-0.5 rounded-lg" style={{ background: 'rgb(var(--rgb-border) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
              ${ticker}
            </span>
            {/* Exchange badge */}
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgb(var(--rgb-accent) / 0.08)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}>
              {data?.currency === 'ILS'
                ? 'בורסה תל אביב'
                : (data?.exchange || 'NYSE/NASDAQ')}
            </span>
            {/* Industry badge if available */}
            {data?.industry && (
              <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgb(var(--rgb-blue) / 0.08)', color: 'var(--blue)', border: '1px solid rgb(var(--rgb-blue) / 0.2)' }}>
                {data.industry}
              </span>
            )}
            {/* Source badge — distinguishes a real WebSocket push from the
                REST fallback so the user knows whether the price is sub-second
                live or pinned to the last server-side fetch. */}
            {priceSource === 'live' && (
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgb(var(--rgb-accent) / 0.08)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-tsua-green animate-pulse inline-block" />
                LIVE
              </span>
            )}
            {priceSource === 'rest' && (
              <span
                className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgb(var(--rgb-gold) / 0.1)', color: 'var(--gold)', border: '1px solid rgb(var(--rgb-gold) / 0.25)' }}
                title="חיבור זמן־אמת לא פעיל — המחיר עודכן בעת טעינת הדף"
              >
                ⏱️ מחיר מעוכב
              </span>
            )}
          </div>

          {/* Hebrew company description — short one-liner OR full 35-50 word
              background depending on what we have for this ticker. Both render
              with the same RTL prose styling; the longer copy just wraps. */}
          {description && (
            <p
              className="mt-2 text-[13px] leading-relaxed max-w-3xl"
              style={{
                color: 'var(--muted, var(--text2))',
                fontWeight: 500,
              }}
            >
              {description}
            </p>
          )}

          {/* Partial-data hint — the quote is real but profile/metrics came
              back empty (Finnhub rate-limit or unsupported ticker). Tells the
              user some fields below may be blank, instead of letting them
              assume the company has no industry, no PE, no logo. */}
          {data?.partial && (
            <p
              className="mt-2 text-[11px] flex items-center gap-1"
              style={{ color: 'var(--gold)' }}
              title="קריאת פרופיל לחברה נכשלה — חלק מהשדות עשויים להיות חסרים"
            >
              <span>⚠️</span>
              נתוני חברה חלקיים — המחיר עדיין מעודכן
            </p>
          )}

          {/* Price row — when both WS and REST failed to deliver a price,
              show "—" with a quiet badge instead of the "$0.00" sentinel. */}
          <div className="mt-4 flex items-end gap-3">
            <span
              dir="ltr"
              className="text-4xl font-black font-mono transition-colors duration-300"
              style={{ color: flash === 'up' ? 'var(--accent)' : flash === 'down' ? 'var(--red)' : 'var(--text)' }}
            >
              {price !== null
                ? `${currencySymbol}${price.toFixed(2)}`
                : '—'}
            </span>
            {price !== null ? (
              <div className="flex flex-col pb-0.5">
                <span
                  dir="ltr"
                  className="text-lg font-bold"
                  style={{ color: isPositive ? 'var(--accent)' : 'var(--red)' }}
                >
                  {isPositive ? '+' : ''}{(change ?? 0).toFixed(2)}
                </span>
                <span
                  dir="ltr"
                  className="text-sm font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: isPositive ? 'rgb(var(--rgb-accent) / 0.1)' : 'rgb(var(--rgb-red) / 0.1)',
                    color: isPositive ? 'var(--accent)' : 'var(--red)',
                    border: `1px solid ${isPositive ? 'rgb(var(--rgb-accent) / 0.2)' : 'rgb(var(--rgb-red) / 0.2)'}`,
                  }}
                >
                  {isPositive ? '▲' : '▼'} {Math.abs(changePercent ?? 0).toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-xs text-tsua-muted self-end pb-1">מחיר לא זמין</span>
            )}
          </div>

          {/* Pre-market / after-hours row — Yahoo-style sub-line under the
              headline price. Only renders when Yahoo gave us extended data
              AND the market state matches:
                PRE / PREPRE  → show pre-market price
                POST / POSTPOST / CLOSED → show after-hours price (if any)
              REGULAR or no data → row hidden entirely. */}
          {(() => {
            const state = data?.marketState;
            if (!state || state === 'REGULAR') return null;

            const isPre = state === 'PRE' || state === 'PREPRE';
            const xPrice = isPre ? data?.preMarketPrice : data?.postMarketPrice;
            const xChange = isPre ? data?.preMarketChange : data?.postMarketChange;
            const xChangePct = isPre ? data?.preMarketChangePct : data?.postMarketChangePct;
            const xTime = isPre ? data?.preMarketTime : data?.postMarketTime;
            if (xPrice == null || xPrice <= 0) return null;

            const xUp = (xChangePct ?? 0) >= 0;
            const label = isPre ? 'מסחר מוקדם' : 'מסחר מאוחר';
            const labelColor = isPre ? 'var(--gold)' : 'var(--violet)';
            const timeStr = xTime
              ? new Date(xTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    background: `${labelColor}22`,
                    color: labelColor,
                    border: `1px solid ${labelColor}55`,
                  }}
                >
                  {label}
                </span>
                <span
                  dir="ltr"
                  className="text-lg font-black font-mono tabular-nums"
                  style={{ color: 'var(--text2)' }}
                >
                  {currencySymbol}{xPrice.toFixed(2)}
                </span>
                <span
                  dir="ltr"
                  className="text-sm font-bold tabular-nums"
                  style={{ color: xUp ? 'var(--accent)' : 'var(--red)' }}
                >
                  {xUp ? '+' : ''}{(xChange ?? 0).toFixed(2)} ({xUp ? '+' : ''}{(xChangePct ?? 0).toFixed(2)}%)
                </span>
                {timeStr && (
                  <span className="text-[11px] text-tsua-muted">· {timeStr}</span>
                )}
              </div>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          {user ? (
            <button
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
              aria-label={inWatchlist ? `הסר את ${ticker} ממעקב` : `הוסף את ${ticker} למעקב`}
              aria-pressed={inWatchlist}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
              style={inWatchlist
                ? { background: 'rgb(var(--rgb-accent) / 0.1)', border: '1px solid rgb(var(--rgb-accent) / 0.3)', color: 'var(--accent)' }
                : { background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.8)', color: 'var(--muted)' }
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
              style={{ background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.8)', color: 'var(--muted)' }}
            >
              <BookmarkIcon className="w-4 h-4" />
              {'הוסף למעקב'}
            </Link>
          )}
          <Link
            href={`/${locale}/alerts`}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgb(var(--rgb-accent) / 0.08)', border: '1px solid rgb(var(--rgb-accent) / 0.3)', color: 'var(--accent)' }}
          >
            🔔 {'התראה'}
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4"
        style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.5)' }}
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

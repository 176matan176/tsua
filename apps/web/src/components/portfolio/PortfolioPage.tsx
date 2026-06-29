'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useLivePrice } from '@/contexts/PriceContext';

interface Holding {
  id: string;
  ticker: string;
  name_he: string;
  name_en: string;
  shares: number;
  avg_price: number;
  exchange: string;
}

interface Transaction {
  id: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  total: number;
  executed_at: string;
}

const INITIAL_CASH = 100000;

// Leaderboard for portfolio performance
const PORTFOLIO_LEADERS = [
  { rank: 1, username: 'roi_tase', displayName: 'רועי לוי', returnPct: 42.3, portfolioValue: 142300 },
  { rank: 2, username: 'tech_avi', displayName: 'אבי כהן', returnPct: 31.8, portfolioValue: 131800 },
  { rank: 3, username: 'wallst_dan', displayName: 'Dan Shapiro', returnPct: 28.4, portfolioValue: 128400 },
  { rank: 4, username: 'me', displayName: 'אתה', returnPct: 18.7, portfolioValue: 118700, isMe: true },
  { rank: 5, username: 'value_invest', displayName: 'Sara Gold', returnPct: 12.1, portfolioValue: 112100 },
];

interface TradeModalProps {
  ticker: string;
  currentPrice: number;
  availableCash: number;
  availableShares?: number;
  mode: 'buy' | 'sell';
  onClose: () => void;
  onConfirm: (shares: number) => void;
}

function TradeModal({ ticker, currentPrice, availableCash, availableShares, mode, onClose, onConfirm }: TradeModalProps) {
  const [shares, setShares] = useState(1);
  const total = shares * currentPrice;
  const canAfford = mode === 'buy' ? total <= availableCash : shares <= (availableShares || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 animate-slide-up" style={{ background: 'rgb(var(--rgb-bg2) / 0.98)', border: '1px solid rgb(var(--rgb-border) / 0.9)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-tsua-text">
            {mode === 'buy' ? `קנה ${ticker}` : `מכור ${ticker}`}
          </h3>
          <button onClick={onClose} className="text-tsua-muted hover:text-tsua-text text-xl">✕</button>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }}>
          <div className="flex justify-between text-sm">
            <span className="text-tsua-muted">{'מחיר נוכחי'}</span>
            <span className="font-bold text-tsua-text" dir="ltr">${currentPrice.toFixed(2)}</span>
          </div>
          {mode === 'buy' && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-tsua-muted">{'מזומן זמין'}</span>
              <span className="font-bold text-tsua-green" dir="ltr">₪{availableCash.toLocaleString()}</span>
            </div>
          )}
          {mode === 'sell' && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-tsua-muted">{'מניות זמינות'}</span>
              <span className="font-bold text-tsua-text">{availableShares}</span>
            </div>
          )}
        </div>

        {/* Shares input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-tsua-muted">{'מספר מניות'}</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setShares(s => Math.max(1, s - 1))}
              className="w-9 h-9 rounded-xl font-bold text-tsua-text transition-colors"
              style={{ background: 'rgb(var(--rgb-border) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>−</button>
            <input
              type="number" min={1} value={shares}
              onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center rounded-xl py-2 text-sm font-bold text-tsua-text focus:outline-none"
              style={{ background: 'rgb(var(--rgb-bg) / 0.8)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}
            />
            <button onClick={() => setShares(s => s + 1)}
              className="w-9 h-9 rounded-xl font-bold text-tsua-green transition-colors"
              style={{ background: 'rgb(var(--rgb-accent) / 0.1)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}>+</button>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {[1, 5, 10, 25].map(n => (
            <button key={n} onClick={() => setShares(n)}
              className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all"
              style={shares === n
                ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.3)' }
                : { background: 'rgb(var(--rgb-card) / 0.5)', color: 'var(--muted)', border: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
              {n}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="rounded-xl p-3" style={{ background: mode === 'buy' ? 'rgb(var(--rgb-accent) / 0.05)' : 'rgb(var(--rgb-red) / 0.05)', border: `1px solid ${mode === 'buy' ? 'rgb(var(--rgb-accent) / 0.15)' : 'rgb(var(--rgb-red) / 0.15)'}` }}>
          <div className="flex justify-between">
            <span className="text-sm text-tsua-muted">{'סה"כ עסקה'}</span>
            <span className="text-lg font-black" style={{ color: mode === 'buy' ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
              ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          {!canAfford && (
            <div className="text-xs mt-1" style={{ color: 'var(--red)' }}>
              {mode === 'buy' ? '⚠️ אין מספיק מזומן' : '⚠️ אין מספיק מניות'}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-tsua-muted transition-colors"
            style={{ background: 'rgb(var(--rgb-card) / 0.5)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }}>
            {'ביטול'}
          </button>
          <button
            onClick={() => { if (canAfford) { onConfirm(shares); onClose(); } }}
            disabled={!canAfford}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-40"
            style={{ background: mode === 'buy' ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'linear-gradient(135deg, var(--red), #cc3355)' }}>
            {mode === 'buy' ? 'קנה' : 'מכור'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldingCard({ h, onTrade }: { h: Holding; onTrade: (ticker: string, mode: 'buy' | 'sell') => void }) {
  const live = useLivePrice(h.ticker);
  // Track whether we have a real live price vs falling back to cost basis.
  // Without this, a ticker with no live feed renders "P&L: 0.00 / 0.0%" which
  // looks like a flat-priced holding instead of "we don't have a price".
  const hasLive = live !== null && typeof live.price === 'number' && live.price > 0;
  const currentPrice = hasLive ? live!.price : h.avg_price;
  const value = h.shares * currentPrice;
  const cost = h.shares * h.avg_price;
  const pnl = value - cost;
  // Guard against bonus-shares / zero-cost lots that would compute Infinity.
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  const up = pnl >= 0;
  // Currency: TASE positions price in shekels — was showing "$" for those.
  const isILS = h.exchange === 'TASE' || h.exchange === 'Tel Aviv Stock Exchange';
  const cur = isILS ? '₪' : '$';

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: live?.flash === 'up' ? 'rgb(var(--rgb-accent) / 0.07)' : live?.flash === 'down' ? 'rgb(var(--rgb-red) / 0.07)' : 'rgb(var(--rgb-card) / 0.7)',
        border: '1px solid rgb(var(--rgb-border) / 0.8)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-tsua-bg" style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
            {h.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="font-bold text-tsua-text text-sm">{h.ticker}</div>
            <div className="text-xs text-tsua-muted">{h.name_he}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-tsua-text transition-colors duration-300" dir="ltr"
            style={{ color: live?.flash === 'up' ? 'var(--accent)' : live?.flash === 'down' ? 'var(--red)' : 'var(--text)' }}>
            {cur}{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs font-bold" style={{ color: up ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
            {up ? '+' : ''}{pnlPct.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-tsua-muted">
        <span>{h.shares} {'מניות'} @ {cur}{h.avg_price}</span>
        {/* When `hasLive` is false we're showing the cost-basis price — flag
            that explicitly instead of letting the user read "מחיר נוכחי" as
            a real live quote. */}
        <span>
          {'מחיר נוכחי:'}{' '}
          <span
            className="font-semibold transition-colors duration-300"
            style={{ color: live?.flash === 'up' ? 'var(--accent)' : live?.flash === 'down' ? 'var(--red)' : 'var(--text)' }}
          >
            {cur}{currentPrice.toFixed(2)}
          </span>
          {!hasLive && (
            <span className="ms-1" style={{ color: 'var(--gold)' }} title="לא התקבל מחיר חי — מוצג מחיר העלות">
              ⚠️
            </span>
          )}
        </span>
        <div className="flex gap-2">
          <button onClick={() => onTrade(h.ticker, 'buy')}
            className="text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}>
            {'קנה'}
          </button>
          <button onClick={() => onTrade(h.ticker, 'sell')}
            className="text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: 'rgb(var(--rgb-red) / 0.1)', color: 'var(--red)', border: '1px solid rgb(var(--rgb-red) / 0.2)' }}>
            {'מכור'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Up to 20 holdings supported with stable hook calls — add more slots if needed
const SLOTS = 20;

/**
 * Classify a holding as ILS-priced or USD-priced. Used to drive FX conversion
 * in the totals — TASE shares are quoted in shekels, everything else assumed USD.
 */
function isIlsHolding(h: { exchange: string }): boolean {
  return h.exchange === 'TASE' || h.exchange === 'Tel Aviv Stock Exchange';
}

/**
 * Pulls the current USD→ILS FX rate from /api/fx so we can normalize a mixed
 * portfolio (NVDA + TEVA on TASE) into a single shekel-denominated total.
 *
 * Without this, `totalValue` summed USD prices and ILS prices as if they were
 * the same number, then prefixed the result with "₪" — so a portfolio of
 * $1,000 NVDA + ₪3,700 TEVA showed up as ₪4,700 instead of the truthful
 * ~₪7,400 (at 3.70). One of the worst kinds of bug: silent, plausibly-correct,
 * and visible on the headline number of the screen.
 */
function useUsdIlsRate(): { rate: number | null; updatedAt: number | null; errored: boolean } {
  const [rate, setRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/fx', { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (ctrl.signal.aborted) return;
        const usd = Array.isArray(d?.rates)
          ? d.rates.find((x: { code?: string; rate?: number }) => x.code === 'USD')
          : null;
        if (usd && typeof usd.rate === 'number' && usd.rate > 0) {
          setRate(usd.rate);
          setUpdatedAt(typeof d.updatedAt === 'number' ? d.updatedAt : Date.now());
          setErrored(false);
        } else {
          setErrored(true);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setErrored(true);
      });
    return () => ctrl.abort();
  }, []);

  return { rate, updatedAt, errored };
}

function useLivePortfolioTotals(holdings: Holding[], cash: number, usdIlsRate: number | null) {
  // We need a fixed number of useLivePrice calls. Pre-allocate SLOTS slots.
  // Each slot maps to holdings[i] if it exists, otherwise a dummy ticker '' (useLivePrice handles empty string gracefully).
  const t = (i: number) => holdings[i]?.ticker ?? '';

  const p0  = useLivePrice(t(0));
  const p1  = useLivePrice(t(1));
  const p2  = useLivePrice(t(2));
  const p3  = useLivePrice(t(3));
  const p4  = useLivePrice(t(4));
  const p5  = useLivePrice(t(5));
  const p6  = useLivePrice(t(6));
  const p7  = useLivePrice(t(7));
  const p8  = useLivePrice(t(8));
  const p9  = useLivePrice(t(9));
  const p10 = useLivePrice(t(10));
  const p11 = useLivePrice(t(11));
  const p12 = useLivePrice(t(12));
  const p13 = useLivePrice(t(13));
  const p14 = useLivePrice(t(14));
  const p15 = useLivePrice(t(15));
  const p16 = useLivePrice(t(16));
  const p17 = useLivePrice(t(17));
  const p18 = useLivePrice(t(18));
  const p19 = useLivePrice(t(19));

  const livePrices = [p0,p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,p11,p12,p13,p14,p15,p16,p17,p18,p19];

  return useMemo(() => {
    // Bucket each position by quote currency. We can't sum NVDA $ + TEVA ₪
    // and call the result shekels — that gives the user a wrong totalValue
    // and, worse, an incorrect totalReturn% next to a leaderboard rank.
    let investedIls = 0;
    let investedUsd = 0;
    let todayChangeIls = 0;
    let todayChangeUsd = 0;
    let hasUsdHoldings = false;

    for (let i = 0; i < holdings.length && i < SLOTS; i++) {
      const h = holdings[i];
      const live = livePrices[i];
      const currentPrice = live?.price ?? h.avg_price;
      const positionValue = h.shares * currentPrice;
      const positionDelta = live ? h.shares * live.change : 0;
      if (isIlsHolding(h)) {
        investedIls += positionValue;
        todayChangeIls += positionDelta;
      } else {
        investedUsd += positionValue;
        todayChangeUsd += positionDelta;
        hasUsdHoldings = true;
      }
    }

    // Convert USD bucket → ILS only when we have a real FX rate. If FX never
    // loaded and the user has USD holdings, leave the conversion at 0 and
    // flip `fxMissing` so the UI can warn instead of pretending the USD side
    // is worthless. Cash is always ILS (virtual cash is denominated in ₪).
    const fxAvailable = usdIlsRate !== null && usdIlsRate > 0;
    const convertedUsd  = fxAvailable ? investedUsd * usdIlsRate! : 0;
    const convertedUsdC = fxAvailable ? todayChangeUsd * usdIlsRate! : 0;

    const investedValue = investedIls + convertedUsd;
    const totalValue    = investedValue + cash;
    const totalReturn   = totalValue - INITIAL_CASH;
    const totalReturnPct = (totalReturn / INITIAL_CASH) * 100;
    const isPositive = totalReturn >= 0;
    const todayChange = todayChangeIls + convertedUsdC;

    return {
      totalValue,
      investedValue,
      totalReturn,
      totalReturnPct,
      isPositive,
      todayChange,
      // Extra fields the header uses to show FX context honestly
      investedIls,
      investedUsd,
      hasUsdHoldings,
      fxMissing: hasUsdHoldings && !fxAvailable,
      fxRate: fxAvailable ? usdIlsRate! : null,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, cash, usdIlsRate, ...livePrices.map(p => p?.price), ...livePrices.map(p => p?.change)]);
}

// Get the live price for the trade modal ticker
function useTradeModalPrice(ticker: string | null) {
  return useLivePrice(ticker ?? '');
}

export function PortfolioPage() {
  const locale = useLocale();
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cash, setCash] = useState(INITIAL_CASH);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'holdings' | 'history' | 'leaderboard'>('holdings');
  const [tradeModal, setTradeModal] = useState<{ ticker: string; mode: 'buy' | 'sell' } | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  // Tracks "we tried to load and it failed" — was silently absent before, so
  // a 500 from /api/portfolio left the user staring at the loading skeleton
  // forever with no signal.
  const [loadError, setLoadError] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setHoldings(data.holdings ?? []);
      setTransactions(data.transactions ?? []);
      setCash(data.cash ?? INITIAL_CASH);
      setLoadError(false);
    } catch {
      // Keep prior data on screen if any (so a transient failure during a
      // refresh doesn't blank the page); just flip the flag.
      setLoadError(true);
    } finally {
      // Was inside the success branch — meant `loading` stayed true forever
      // on any failure (network error, 500, JSON parse). Now always clears.
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchPortfolio();
    else setLoading(false);
  }, [user, fetchPortfolio]);

  // Pull live USD→ILS so portfolio totals can be denominated honestly in shekels.
  const { rate: usdIlsRate, updatedAt: fxUpdatedAt } = useUsdIlsRate();

  // Real-time portfolio totals derived from live prices + FX-converted USD bucket.
  const {
    totalValue, investedValue, totalReturn, totalReturnPct, isPositive, todayChange,
    investedIls, investedUsd, hasUsdHoldings, fxMissing, fxRate,
  } = useLivePortfolioTotals(holdings, cash, usdIlsRate);

  const selectedHolding = tradeModal ? holdings.find(h => h.ticker === tradeModal.ticker) : null;

  // Live price for the trade modal (so user trades at current market price)
  const tradeModalLive = useTradeModalPrice(tradeModal?.ticker ?? null);
  const tradeModalPrice = tradeModalLive?.price ?? selectedHolding?.avg_price ?? 0;

  async function executeTrade(shares: number) {
    if (!tradeModal || !selectedHolding) return;
    setTradeLoading(true);
    setTradeError('');
    try {
      const price = tradeModalPrice;
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: tradeModal.ticker,
          nameHe: selectedHolding.name_he,
          nameEn: selectedHolding.name_en,
          exchange: selectedHolding.exchange,
          shares,
          price,
          type: tradeModal.mode,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Trade failed');
      }
      await fetchPortfolio();
      setTradeModal(null);
    } catch (e: any) {
      setTradeError(e.message);
    } finally {
      setTradeLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">💼</div>
        <h2 className="text-xl font-black text-tsua-text mb-2">{'תיק וירטואלי'}</h2>
        <p className="text-tsua-muted text-sm mb-6">{'התחבר כדי לנהל תיק השקעות וירטואלי'}</p>
        <a href={`/${locale}/login`} className="px-6 py-2.5 rounded-xl text-tsua-bg font-black text-sm" style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }}>
          {'כניסה'}
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgb(var(--rgb-bg2) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }} />
        ))}
      </div>
    );
  }

  // Surface load failures — was previously indistinguishable from a brand-new
  // empty portfolio. Provides a manual retry so the user isn't stuck waiting
  // for the next mount.
  if (loadError && holdings.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgb(var(--rgb-bg2) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }}>
        <div className="text-3xl mb-2">📡</div>
        <h2 className="text-base font-bold text-tsua-text">לא ניתן לטעון את התיק</h2>
        <p className="text-sm text-tsua-muted mt-1">נסה לרענן בעוד מספר רגעים</p>
        <button
          onClick={() => { setLoading(true); fetchPortfolio(); }}
          className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg text-tsua-text hover:text-tsua-accent transition-colors"
          style={{ background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }}
        >
          🔄 נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">

      {/* Trade modal */}
      {tradeModal && selectedHolding && (
        <TradeModal
          ticker={tradeModal.ticker}
          currentPrice={tradeModalPrice}
          availableCash={cash}
          availableShares={selectedHolding.shares}
          mode={tradeModal.mode}
          onClose={() => { setTradeModal(null); setTradeError(''); }}
          onConfirm={executeTrade}
        />
      )}

      {/* Header — the "+ קנה" button used to hardcode 'NVDA' as the trade
          ticker, but the modal only opens when there's a matching holding.
          If the user didn't already own NVDA the button silently did nothing.
          Now: pick the first existing holding if any (still rare/wrong but
          at least functional), otherwise link to /markets so they can pick
          a stock to buy via the per-stock buy button there. */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-tsua-text">
          💼 {'תיק וירטואלי'}
        </h1>
        {holdings.length > 0 ? (
          <button
            onClick={() => setTradeModal({ ticker: holdings[0].ticker, mode: 'buy' })}
            className="text-sm font-bold px-4 py-2 rounded-xl text-tsua-bg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
            title={`הוסף לפוזיציה הקיימת ב-${holdings[0].ticker}`}
          >
            + {'קנה עוד'}
          </button>
        ) : (
          <a
            href={`/${locale}/markets`}
            className="text-sm font-bold px-4 py-2 rounded-xl text-tsua-bg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
          >
            + {'מצא מניה לקניה'}
          </a>
        )}
      </div>

      {/* Main value card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'rgb(var(--rgb-card) / 0.8)', border: isPositive ? '1px solid rgb(var(--rgb-accent) / 0.2)' : '1px solid rgb(var(--rgb-red) / 0.2)' }}
      >
        <div className="absolute inset-0" style={{ background: isPositive ? 'radial-gradient(ellipse at top right, rgb(var(--rgb-accent) / 0.05), transparent 60%)' : 'radial-gradient(ellipse at top right, rgb(var(--rgb-red) / 0.05), transparent 60%)' }} />
        <div className="relative">
          <div className="text-xs text-tsua-muted mb-1 flex items-center gap-1.5">
            {'שווי תיק כולל'}
            {/* Conversion-honesty badge — when the user has USD holdings AND
                we successfully fetched FX, tell them the headline is converted.
                When FX failed, warn instead of silently zeroing the USD side. */}
            {hasUsdHoldings && fxRate !== null && (
              <span
                className="text-[10px] text-tsua-muted"
                title={
                  fxUpdatedAt
                    ? `הומר ב-1 USD = ₪${fxRate.toFixed(3)} (${new Date(fxUpdatedAt).toLocaleString('he-IL')})`
                    : `הומר ב-1 USD = ₪${fxRate.toFixed(3)}`
                }
              >
                · 1$ = ₪{fxRate.toFixed(2)}
              </span>
            )}
            {fxMissing && (
              <span
                className="text-[10px]"
                style={{ color: 'var(--gold)' }}
                title="לא הצלחנו למשוך שער USD/ILS — הסיכום מציג רק את חלק השקלי"
              >
                ⚠️ שער USD לא זמין
              </span>
            )}
          </div>
          <div className="text-3xl font-black text-tsua-text" dir="ltr">
            ₪{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          {/* Bucket breakdown — only shown when there's actually a mix. Makes
              the conversion math transparent: ₪ side + $ side (× rate). */}
          {hasUsdHoldings && (
            <div className="text-[11px] text-tsua-muted mt-0.5" dir="ltr">
              ₪{(investedIls + cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {' '}+ ${investedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              {fxRate !== null && investedUsd > 0 && (
                <span> (≈ ₪{(investedUsd * fxRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
              )}
            </div>
          )}
          {/* Total P&L vs ₪100,000 starting capital */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold" style={{ color: isPositive ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
              {isPositive ? '+' : ''}₪{totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={isPositive ? { background: 'rgb(var(--rgb-accent) / 0.12)', color: 'var(--accent)' } : { background: 'rgb(var(--rgb-red) / 0.12)', color: 'var(--red)' }}>
              {isPositive ? '+' : ''}{totalReturnPct.toFixed(2)}%
            </span>
            <span className="text-xs text-tsua-muted">{'מתוך ₪100,000'}</span>
          </div>
          {/* Today's change */}
          {holdings.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-tsua-muted">{'היום:'}</span>
              <span className="text-xs font-bold" style={{ color: todayChange >= 0 ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
                {todayChange >= 0 ? '+' : ''}₪{todayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        {/* Sub stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
          {[
            { label: 'מזומן', value: `₪${Math.max(0, cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--accent)' },
            { label: 'מושקע', value: `₪${investedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'var(--blue)' },
            { label: 'מניות', value: holdings.length.toString(), color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-tsua-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
        {([['holdings', '📊 אחזקות'], ['history', '📋 היסטוריה'], ['leaderboard', '🏆 דירוג']] as ['holdings'|'history'|'leaderboard', string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
            style={tab === t ? { background: 'linear-gradient(135deg, var(--accent), var(--accent2))', color: '#080d1a' } : { color: 'var(--muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Holdings */}
      {tab === 'holdings' && (
        <div className="space-y-2">
          {holdings.map(h => (
            <HoldingCard
              key={h.ticker}
              h={h}
              onTrade={(ticker, mode) => setTradeModal({ ticker, mode })}
            />
          ))}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={tx.type === 'buy' ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)' } : { background: 'rgb(var(--rgb-red) / 0.15)', color: 'var(--red)' }}>
                {tx.type === 'buy' ? '▲' : '▼'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-tsua-text">
                  {tx.type === 'buy' ? 'קנה' : 'מכור'} <span style={{ color: 'var(--accent)' }}>${tx.ticker}</span>
                </div>
                <div className="text-xs text-tsua-muted">{tx.executed_at?.slice(0,10)} · {tx.shares} {'מניות'}</div>
              </div>
              <div className="text-right text-sm font-bold text-tsua-text" dir="ltr">
                ${(tx.shares * tx.price).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div className="space-y-2">
          <div className="text-xs text-tsua-muted text-center mb-3">
            {'השוואת תשואות תיקים וירטואליים'}
          </div>
          {PORTFOLIO_LEADERS.map(leader => (
            <div key={leader.rank}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{ background: (leader as any).isMe ? 'rgb(var(--rgb-accent) / 0.06)' : 'rgb(var(--rgb-card) / 0.7)', border: (leader as any).isMe ? '1px solid rgb(var(--rgb-accent) / 0.2)' : '1px solid rgb(var(--rgb-border) / 0.8)' }}>
              <div className="w-7 text-center text-sm font-bold shrink-0">
                {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : `#${leader.rank}`}
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-tsua-bg text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
                {leader.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-tsua-text">{leader.displayName}</div>
                <div className="text-xs text-tsua-muted">₪{leader.portfolioValue.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black" style={{ color: 'var(--accent)' }}>+{leader.returnPct}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

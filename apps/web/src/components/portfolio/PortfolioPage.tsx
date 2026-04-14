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
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 animate-slide-up" style={{ background: 'rgba(13,20,36,0.98)', border: '1px solid rgba(26,40,64,0.9)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-tsua-text">
            {mode === 'buy' ? `קנה ${ticker}` : `מכור ${ticker}`}
          </h3>
          <button onClick={onClose} className="text-tsua-muted hover:text-tsua-text text-xl">✕</button>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.7)' }}>
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
              style={{ background: 'rgba(26,40,64,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>−</button>
            <input
              type="number" min={1} value={shares}
              onChange={e => setShares(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center rounded-xl py-2 text-sm font-bold text-tsua-text focus:outline-none"
              style={{ background: 'rgba(8,13,26,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
            />
            <button onClick={() => setShares(s => s + 1)}
              className="w-9 h-9 rounded-xl font-bold text-tsua-green transition-colors"
              style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)' }}>+</button>
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2">
          {[1, 5, 10, 25].map(n => (
            <button key={n} onClick={() => setShares(n)}
              className="flex-1 text-xs font-bold py-1.5 rounded-lg transition-all"
              style={shares === n
                ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }
                : { background: 'rgba(15,25,41,0.5)', color: '#5a7090', border: '1px solid rgba(26,40,64,0.6)' }}>
              {n}
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="rounded-xl p-3" style={{ background: mode === 'buy' ? 'rgba(0,229,176,0.05)' : 'rgba(255,77,106,0.05)', border: `1px solid ${mode === 'buy' ? 'rgba(0,229,176,0.15)' : 'rgba(255,77,106,0.15)'}` }}>
          <div className="flex justify-between">
            <span className="text-sm text-tsua-muted">{'סה"כ עסקה'}</span>
            <span className="text-lg font-black" style={{ color: mode === 'buy' ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
              ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          {!canAfford && (
            <div className="text-xs mt-1" style={{ color: '#ff4d6a' }}>
              {mode === 'buy' ? '⚠️ אין מספיק מזומן' : '⚠️ אין מספיק מניות'}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-tsua-muted transition-colors"
            style={{ background: 'rgba(15,25,41,0.5)', border: '1px solid rgba(26,40,64,0.7)' }}>
            {'ביטול'}
          </button>
          <button
            onClick={() => { if (canAfford) { onConfirm(shares); onClose(); } }}
            disabled={!canAfford}
            className="flex-1 py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-40"
            style={{ background: mode === 'buy' ? 'linear-gradient(135deg, #00e5b0, #00c49a)' : 'linear-gradient(135deg, #ff4d6a, #cc3355)' }}>
            {mode === 'buy' ? 'קנה' : 'מכור'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldingCard({ h, onTrade }: { h: Holding; onTrade: (ticker: string, mode: 'buy' | 'sell') => void }) {
  const live = useLivePrice(h.ticker);
  const currentPrice = live?.price ?? h.avg_price;
  const value = h.shares * currentPrice;
  const cost = h.shares * h.avg_price;
  const pnl = value - cost;
  const pnlPct = (pnl / cost) * 100;
  const up = pnl >= 0;

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: live?.flash === 'up' ? 'rgba(0,229,176,0.07)' : live?.flash === 'down' ? 'rgba(255,77,106,0.07)' : 'rgba(15,25,41,0.7)',
        border: '1px solid rgba(26,40,64,0.8)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-tsua-bg" style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}>
            {h.ticker.slice(0, 2)}
          </div>
          <div>
            <div className="font-bold text-tsua-text text-sm">{h.ticker}</div>
            <div className="text-xs text-tsua-muted">{h.name_he}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-black text-tsua-text transition-colors duration-300" dir="ltr"
            style={{ color: live?.flash === 'up' ? '#00e5b0' : live?.flash === 'down' ? '#ff4d6a' : '#e8f0ff' }}>
            ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs font-bold" style={{ color: up ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
            {up ? '+' : ''}{pnlPct.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-tsua-muted">
        <span>{h.shares} {'מניות'} @ ${h.avg_price}</span>
        <span>{'מחיר נוכחי:'} <span className="font-semibold transition-colors duration-300" style={{ color: live?.flash === 'up' ? '#00e5b0' : live?.flash === 'down' ? '#ff4d6a' : '#e8f0ff' }}>${currentPrice.toFixed(2)}</span></span>
        <div className="flex gap-2">
          <button onClick={() => onTrade(h.ticker, 'buy')}
            className="text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}>
            {'קנה'}
          </button>
          <button onClick={() => onTrade(h.ticker, 'sell')}
            className="text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: 'rgba(255,77,106,0.1)', color: '#ff4d6a', border: '1px solid rgba(255,77,106,0.2)' }}>
            {'מכור'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Up to 20 holdings supported with stable hook calls — add more slots if needed
const SLOTS = 20;

function useLivePortfolioTotals(holdings: Holding[], cash: number) {
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
    let investedValue = 0;
    let todayChange = 0;
    for (let i = 0; i < holdings.length && i < SLOTS; i++) {
      const h = holdings[i];
      const live = livePrices[i];
      const currentPrice = live?.price ?? h.avg_price;
      investedValue += h.shares * currentPrice;
      todayChange += live ? h.shares * live.change : 0;
    }
    const totalValue = investedValue + cash;
    const totalReturn = totalValue - INITIAL_CASH;
    const totalReturnPct = (totalReturn / INITIAL_CASH) * 100;
    const isPositive = totalReturn >= 0;
    return { totalValue, investedValue, totalReturn, totalReturnPct, isPositive, todayChange };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, cash, ...livePrices.map(p => p?.price), ...livePrices.map(p => p?.change)]);
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

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;
    const res = await fetch('/api/portfolio', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setHoldings(data.holdings ?? []);
    setTransactions(data.transactions ?? []);
    setCash(data.cash ?? INITIAL_CASH);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchPortfolio();
    else setLoading(false);
  }, [user, fetchPortfolio]);

  // Real-time portfolio totals derived from live prices
  const { totalValue, investedValue, totalReturn, totalReturnPct, isPositive, todayChange } =
    useLivePortfolioTotals(holdings, cash);

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
        <a href={`/${locale}/login`} className="px-6 py-2.5 rounded-xl text-tsua-bg font-black text-sm" style={{ background: 'linear-gradient(135deg,#00e5b0,#00c49a)' }}>
          {'כניסה'}
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.7)' }} />
        ))}
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-tsua-text">
          💼 {'תיק וירטואלי'}
        </h1>
        <button
          onClick={() => setTradeModal({ ticker: 'NVDA', mode: 'buy' })}
          className="text-sm font-bold px-4 py-2 rounded-xl text-tsua-bg"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
        >
          + {'קנה מניה'}
        </button>
      </div>

      {/* Main value card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'rgba(15,25,41,0.8)', border: isPositive ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(255,77,106,0.2)' }}
      >
        <div className="absolute inset-0" style={{ background: isPositive ? 'radial-gradient(ellipse at top right, rgba(0,229,176,0.05), transparent 60%)' : 'radial-gradient(ellipse at top right, rgba(255,77,106,0.05), transparent 60%)' }} />
        <div className="relative">
          <div className="text-xs text-tsua-muted mb-1">{'שווי תיק כולל'}</div>
          <div className="text-3xl font-black text-tsua-text" dir="ltr">
            ₪{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          {/* Total P&L vs ₪100,000 starting capital */}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold" style={{ color: isPositive ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
              {isPositive ? '+' : ''}₪{totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={isPositive ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0' } : { background: 'rgba(255,77,106,0.12)', color: '#ff4d6a' }}>
              {isPositive ? '+' : ''}{totalReturnPct.toFixed(2)}%
            </span>
            <span className="text-xs text-tsua-muted">{'מתוך ₪100,000'}</span>
          </div>
          {/* Today's change */}
          {holdings.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-tsua-muted">{'היום:'}</span>
              <span className="text-xs font-bold" style={{ color: todayChange >= 0 ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
                {todayChange >= 0 ? '+' : ''}₪{todayChange.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>

        {/* Sub stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(26,40,64,0.6)' }}>
          {[
            { label: 'מזומן', value: `₪${Math.max(0, cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#00e5b0' },
            { label: 'מושקע', value: `₪${investedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#3b82f6' },
            { label: 'מניות', value: holdings.length.toString(), color: '#f5b942' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-tsua-muted mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
        {([['holdings', '📊 אחזקות'], ['history', '📋 היסטוריה'], ['leaderboard', '🏆 דירוג']] as ['holdings'|'history'|'leaderboard', string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
            style={tab === t ? { background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#080d1a' } : { color: '#5a7090' }}>
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
            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={tx.type === 'buy' ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0' } : { background: 'rgba(255,77,106,0.15)', color: '#ff4d6a' }}>
                {tx.type === 'buy' ? '▲' : '▼'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-tsua-text">
                  {tx.type === 'buy' ? 'קנה' : 'מכור'} <span style={{ color: '#00e5b0' }}>${tx.ticker}</span>
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
              style={{ background: (leader as any).isMe ? 'rgba(0,229,176,0.06)' : 'rgba(15,25,41,0.7)', border: (leader as any).isMe ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(26,40,64,0.8)' }}>
              <div className="w-7 text-center text-sm font-bold shrink-0">
                {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : `#${leader.rank}`}
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-tsua-bg text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}>
                {leader.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-tsua-text">{leader.displayName}</div>
                <div className="text-xs text-tsua-muted">₪{leader.portfolioValue.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-base font-black" style={{ color: '#00e5b0' }}>+{leader.returnPct}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

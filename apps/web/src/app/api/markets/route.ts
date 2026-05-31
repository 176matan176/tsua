import { NextResponse } from 'next/server';
import { fetchQuote, fetchYahooQuote } from '@/lib/quotes';

// 60s ISR — markets data moves intraday but we don't need sub-minute freshness
// on the dashboard. `force-dynamic` would defeat the cache and hammer Finnhub.
export const revalidate = 60;

const INDICES = [
  { symbol: 'SPY',  nameHe: 'S&P 500',   nameEn: 'S&P 500',    flag: '🇺🇸', currency: 'USD' },
  { symbol: 'QQQ',  nameHe: 'נאסד"ק',    nameEn: 'NASDAQ',     flag: '🇺🇸', currency: 'USD' },
  { symbol: 'DIA',  nameHe: 'דאו ג\'ונס', nameEn: 'Dow Jones',  flag: '🇺🇸', currency: 'USD' },
  { symbol: 'NVDA', nameHe: 'אנבידיה',   nameEn: 'Nvidia',     flag: '🇺🇸', currency: 'USD' },
  { symbol: 'TEVA', nameHe: 'טבע',       nameEn: 'Teva',       flag: '🇮🇱', currency: 'USD' },
  { symbol: 'CHKP', nameHe: "צ'קפוינט", nameEn: 'Check Point', flag: '🇮🇱', currency: 'USD' },
];

// Stocks to track for gainers/losers
const WATCH_LIST = [
  { symbol: 'TEVA', nameHe: 'טבע',           nameEn: 'Teva',         exchange: 'NYSE'   },
  { symbol: 'NICE', nameHe: 'נייס',            nameEn: 'NICE',         exchange: 'NASDAQ' },
  { symbol: 'CHKP', nameHe: "צ'קפוינט",      nameEn: 'Check Point',  exchange: 'NASDAQ' },
  { symbol: 'ESLT', nameHe: 'אלביט מערכות',   nameEn: 'Elbit Systems',exchange: 'NASDAQ' },
  { symbol: 'NVDA', nameHe: 'אנבידיה',         nameEn: 'Nvidia',       exchange: 'NASDAQ' },
  { symbol: 'AAPL', nameHe: 'אפל',             nameEn: 'Apple',        exchange: 'NASDAQ' },
  { symbol: 'TSLA', nameHe: 'טסלה',            nameEn: 'Tesla',        exchange: 'NASDAQ' },
  { symbol: 'MSFT', nameHe: 'מיקרוסופט',      nameEn: 'Microsoft',    exchange: 'NASDAQ' },
  { symbol: 'GOOGL',nameHe: 'גוגל',            nameEn: 'Google',       exchange: 'NASDAQ' },
  { symbol: 'META', nameHe: 'מטא',             nameEn: 'Meta',         exchange: 'NASDAQ' },
  { symbol: 'AMZN', nameHe: 'אמזון',           nameEn: 'Amazon',       exchange: 'NASDAQ' },
  { symbol: 'INTC', nameHe: 'אינטל',           nameEn: 'Intel',        exchange: 'NASDAQ' },
  { symbol: 'MNDO', nameHe: 'מיינד',           nameEn: 'MIND C.T.I.',  exchange: 'NASDAQ' },
  { symbol: 'ICL',  nameHe: 'כיל',             nameEn: 'ICL Group',    exchange: 'NYSE'   },
];

// Forex pairs — Yahoo Finance uses `USDILS=X`-style symbols.
// Finnhub's `OANDA:*` feed requires a paid plan; free tier returns empty.
const FOREX = [
  { symbol: 'USDILS=X', pair: 'USD/ILS', base: '🇺🇸', quote: '🇮🇱' },
  { symbol: 'EURILS=X', pair: 'EUR/ILS', base: '🇪🇺', quote: '🇮🇱' },
  { symbol: 'GBPILS=X', pair: 'GBP/ILS', base: '🇬🇧', quote: '🇮🇱' },
  { symbol: 'BTC-USD',  pair: 'BTC/USD', base: '₿',   quote: '🇺🇸' },
];

export async function GET() {
  try {
    // Indices + watch-list go through fetchQuote (Finnhub primary, Yahoo fallback).
    // Forex/crypto go straight to Yahoo since Finnhub free returns empty.
    const [indexQuotes, watchQuotes, forexQuotes] = await Promise.all([
      Promise.all(INDICES.map(i => fetchQuote(i.symbol))),
      Promise.all(WATCH_LIST.map(s => fetchQuote(s.symbol))),
      Promise.all(FOREX.map(f => fetchYahooQuote(f.symbol))),
    ]);

    // Map each index quote to a row. If the quote came back empty (c === 0),
    // emit `null` rather than 0/0/0 — otherwise the UI happily renders "$0.00"
    // as if that were a real price.
    const indices = INDICES.map((idx, i) => {
      const q = indexQuotes[i];
      const has = (q?.c ?? 0) > 0;
      return {
        symbol: idx.symbol,
        nameHe: idx.nameHe,
        nameEn: idx.nameEn,
        flag: idx.flag,
        currency: idx.currency,
        price:         has ? q.c  : null,
        change:        has ? q.d  : null,
        changePercent: has ? q.dp : null,
      };
    });

    const watchWithQuotes = WATCH_LIST.map((s, i) => ({
      ...s,
      price: watchQuotes[i]?.c ?? 0,
      change: watchQuotes[i]?.d ?? 0,
      changePercent: watchQuotes[i]?.dp ?? 0,
    })).filter(s => s.price > 0);

    const gainers = [...watchWithQuotes]
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    const losers = [...watchWithQuotes]
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5);

    const forex = FOREX.map((f, i) => ({
      pair: f.pair,
      base: f.base,
      quote: f.quote,
      rate: forexQuotes[i]?.c ?? 0,
      change: forexQuotes[i]?.d ?? 0,
      changePercent: forexQuotes[i]?.dp ?? 0,
    })).filter(f => f.rate > 0);

    return NextResponse.json({
      indices,
      gainers,
      losers,
      forex,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

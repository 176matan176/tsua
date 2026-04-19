import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

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
  { symbol: 'USDILS=X', pair: 'USD/ILS', base: '🇺🇸', quote: '🇮🇱', source: 'yahoo' as const },
  { symbol: 'EURILS=X', pair: 'EUR/ILS', base: '🇪🇺', quote: '🇮🇱', source: 'yahoo' as const },
  { symbol: 'GBPILS=X', pair: 'GBP/ILS', base: '🇬🇧', quote: '🇮🇱', source: 'yahoo' as const },
  { symbol: 'BTC-USD',  pair: 'BTC/USD', base: '₿',   quote: '🇺🇸', source: 'yahoo' as const },
];

async function getQuote(symbol: string) {
  const r = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
    { next: { revalidate: 60 } }
  );
  return r.json();
}

// Pull live FX / crypto from Yahoo Finance chart API (no paid tier needed).
async function getYahooQuote(symbol: string): Promise<{ c: number; d: number; dp: number }> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    });
    if (!r.ok) return { c: 0, d: 0, dp: 0 };
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice) || 0;
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose ?? price) || price;
    const d = price - prev;
    const dp = prev ? (d / prev) * 100 : 0;
    return { c: price, d, dp };
  } catch {
    return { c: 0, d: 0, dp: 0 };
  }
}

export async function GET() {
  if (!FINNHUB_KEY) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  try {
    // Fetch all quotes in parallel.
    // Indices + stocks come from Finnhub; forex/crypto come from Yahoo
    // (Finnhub's free tier returns 0 for OANDA/BINANCE symbols).
    const [indexQuotes, watchQuotes, forexQuotes] = await Promise.all([
      Promise.all(INDICES.map(i => getQuote(i.symbol))),
      Promise.all(WATCH_LIST.map(s => getQuote(s.symbol))),
      Promise.all(FOREX.map(f => getYahooQuote(f.symbol))),
    ]);

    const indices = INDICES.map((idx, i) => ({
      symbol: idx.symbol,
      nameHe: idx.nameHe,
      nameEn: idx.nameEn,
      flag: idx.flag,
      currency: idx.currency,
      price: indexQuotes[i]?.c ?? 0,
      change: indexQuotes[i]?.d ?? 0,
      changePercent: indexQuotes[i]?.dp ?? 0,
    }));

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

    return NextResponse.json({ indices, gainers, losers, forex });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

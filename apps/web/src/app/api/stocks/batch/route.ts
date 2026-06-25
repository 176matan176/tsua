import { NextRequest, NextResponse } from 'next/server';
import { fetchQuotes } from '@/lib/quotes';

// Per-request fresh — clients poll this every 5s during market hours.
// The upstream Yahoo/Finnhub call is cached for 10s (was 60s) so prices
// genuinely tick once every ~10s rather than appearing frozen for a
// minute at a time. 10s is short enough to feel live and long enough
// that one user's polling doesn't hammer Finnhub's 60 req/min cap —
// each ticker hits upstream at most 6x/min even under heavy traffic.
export const dynamic = 'force-dynamic';

// 5s upstream — paired with 2s client polling during market hours, prices
// genuinely tick every 5-10s, matching Yahoo Finance / Apple Stocks feel.
const UPSTREAM_CACHE_SECONDS = 5;

// GET /api/stocks/batch?symbols=TEVA,NVDA,AAPL
//
// Uses the shared fetchQuote (Finnhub → Yahoo fallback) so symbols that
// Finnhub doesn't support (delisted, renamed, TASE) still resolve.
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({});

  const tickers = [...new Set(symbols.split(',').map(s => s.trim().toUpperCase()))].slice(0, 20);
  const quotes = await fetchQuotes(tickers, UPSTREAM_CACHE_SECONDS);

  const data: Record<string, { price: number; change: number; changePercent: number }> = {};
  tickers.forEach((ticker, i) => {
    const q = quotes[i];
    if (q?.c) {
      data[ticker] = { price: q.c, change: q.d, changePercent: q.dp };
    }
  });

  return NextResponse.json(data);
}

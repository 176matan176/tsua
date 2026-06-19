import { NextRequest, NextResponse } from 'next/server';
import { fetchQuotes } from '@/lib/quotes';

// Per-request fresh — clients poll this every 30s for live tickers and
// expect each poll to return current prices. The expensive part (Yahoo /
// Finnhub network calls) is cached for 60s inside fetchQuotes via Next.js
// Data Cache, so we don't double-hit upstream APIs.
export const dynamic = 'force-dynamic';

// GET /api/stocks/batch?symbols=TEVA,NVDA,AAPL
//
// Uses the shared fetchQuote (Finnhub → Yahoo fallback) so symbols that
// Finnhub doesn't support (delisted, renamed, TASE) still resolve.
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({});

  const tickers = [...new Set(symbols.split(',').map(s => s.trim().toUpperCase()))].slice(0, 20);
  const quotes = await fetchQuotes(tickers);

  const data: Record<string, { price: number; change: number; changePercent: number }> = {};
  tickers.forEach((ticker, i) => {
    const q = quotes[i];
    if (q?.c) {
      data[ticker] = { price: q.c, change: q.d, changePercent: q.dp };
    }
  });

  return NextResponse.json(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { fetchQuotes } from '@/lib/quotes';

// 30s ISR — was force-dynamic, which made every chip-hover re-hit Finnhub
// and contributed to the rate-limits the Yahoo fallback exists to absorb.
export const revalidate = 30;

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

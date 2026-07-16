import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchYahooQuotes } from '@/lib/quotes';

// Per-request fresh (same reasoning as /api/markets — ISR served 40-minute-
// old heatmaps in low-traffic windows). The expensive Yahoo/Finnhub calls
// inside fetchQuotes() are still 60s-cached, so the compute cost stays low.
export const dynamic = 'force-dynamic';

// GET /api/sectors — returns the 11 GICS sectors with live ETF performance
// Uses fetchQuote (Finnhub → Yahoo fallback) so the heatmap stays populated
// even when Finnhub rate-limits us.
//
// Wrapped in try/catch so a single thrown error doesn't 500 with an empty
// body — the client's `.catch{}` would then hide everything with no signal.
// Instead we always return a JSON envelope with an `error` flag the widget
// can render honestly.
export async function GET() {
  try {
    const tickers = SECTORS.map((s) => s.etf);
    // Yahoo-live: Finnhub's free tier serves stale quotes (see /api/stocks/batch).
    const quotes = await fetchYahooQuotes(tickers);

    const sectors = SECTORS.map((sector, i) => {
      const q = quotes[i];
      const has = (q?.c ?? 0) > 0;
      return {
        key: sector.key,
        nameHe: sector.nameHe,
        nameEn: sector.nameEn,
        emoji: sector.emoji,
        etf: sector.etf,
        color: sector.color,
        description: sector.description,
        price: has ? q.c : null,
        change: has ? q.d : null,
        changePercent: has ? q.dp : null,
        high: has ? q.h : null,
        low: has ? q.l : null,
      };
    });

    return NextResponse.json({ sectors, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { sectors: [], timestamp: Date.now(), error: err instanceof Error ? err.message : 'fetch_failed' },
      { status: 502 },
    );
  }
}

import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchQuotes } from '@/lib/quotes';

// `force-dynamic` + `revalidate` is contradictory; revalidate alone gives ISR.
export const revalidate = 60;

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
    const quotes = await fetchQuotes(tickers);

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

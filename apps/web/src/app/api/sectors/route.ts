import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchQuotes } from '@/lib/quotes';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// GET /api/sectors — returns the 11 GICS sectors with live ETF performance
// Uses fetchQuote (Finnhub → Yahoo fallback) so the heatmap stays populated
// even when Finnhub rate-limits us.
export async function GET() {
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
}

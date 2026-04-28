import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchQuotes } from '@/lib/quotes';
import { MARKET_CAPS } from '@/lib/marketCaps';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/sectors/heatmap
 *
 * Finviz-style market map data: every stock in our sector universe with its
 * market cap (static — see marketCaps.ts) and live daily change (Finnhub +
 * Yahoo fallback via fetchQuotes).
 *
 * Rationale for static caps: Finviz's layout doesn't change minute-to-minute
 * either — caps move slowly. Hardcoding them gives a stable, readable map
 * without needing yahoo-finance2 (which doesn't bundle on Webpack — pulls
 * Deno-only modules) or burning Finnhub profile2 calls (60 req/min cap).
 */
export async function GET() {
  // Build a flat list of unique tickers, mapping each back to its sector key.
  const seen = new Set<string>();
  const tickerToSector: Record<string, string> = {};
  const allTickers: string[] = [];
  for (const sector of SECTORS) {
    for (const t of sector.top) {
      const upper = t.toUpperCase();
      if (seen.has(upper)) continue;
      seen.add(upper);
      tickerToSector[upper] = sector.key;
      allTickers.push(upper);
    }
  }

  // Fetch all live quotes in parallel. fetchQuotes already handles Finnhub
  // → Yahoo fallback so a single 429 doesn't sink any individual stock.
  const quotes = await fetchQuotes(allTickers, 60);

  type Stock = {
    ticker: string;
    sectorKey: string;
    name: string;
    price: number;
    changePercent: number;
    marketCap: number;
    currency: string;
  };

  const stocks: Stock[] = allTickers
    .map((ticker, i) => {
      const q = quotes[i];
      const cap = MARKET_CAPS[ticker] ?? 0;
      if (!q?.c || cap <= 0) return null;
      return {
        ticker,
        sectorKey: tickerToSector[ticker] ?? 'tech',
        name: ticker, // we don't fetch profile here; client just shows ticker
        price: q.c,
        changePercent: q.dp,
        marketCap: cap,
        currency: 'USD',
      };
    })
    .filter((s): s is Stock => s !== null);

  return NextResponse.json({
    sectors: SECTORS.map((s) => ({
      key: s.key,
      nameHe: s.nameHe,
      nameEn: s.nameEn,
      emoji: s.emoji,
      color: s.color,
    })),
    stocks,
    timestamp: Date.now(),
  });
}

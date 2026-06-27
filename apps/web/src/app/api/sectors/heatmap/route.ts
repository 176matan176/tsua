import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchQuotes } from '@/lib/quotes';
import { MARKET_CAPS } from '@/lib/marketCaps';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * Fetch a single ticker's market cap from Finnhub's profile2 endpoint.
 * Cached 24h via Next.js Data Cache so we only hit Finnhub once per ticker
 * per day — well within their 60 req/min limit even on cold-cache startup
 * (200 tickers × 1 call/day = 0.14 req/min).
 *
 * Falls back to the static MARKET_CAPS table when Finnhub doesn't have the
 * symbol (rare — usually delisted tickers) or is rate-limited mid-fetch.
 *
 * Why this matters: the static table was last updated 2026-04; PLTR alone
 * has tripled since then ($90B → $270B+). Yahoo and Finviz both pull caps
 * live; we now do the same.
 */
async function fetchMarketCap(ticker: string): Promise<number> {
  if (FINNHUB_KEY) {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 86400 } },
      );
      if (r.ok) {
        const j = await r.json();
        const capMillions = Number(j?.marketCapitalization);
        // Finnhub returns the cap in millions of USD. Skip suspiciously
        // small values (some delisted entries return 0 or 1).
        if (Number.isFinite(capMillions) && capMillions > 100) {
          return capMillions * 1_000_000;
        }
      }
    } catch {
      // Network error / 429 — fall through to static fallback.
    }
  }
  return MARKET_CAPS[ticker.toUpperCase()] ?? 0;
}

/**
 * GET /api/sectors/heatmap
 *
 * Finviz-style market map data: every stock in our sector universe with its
 * market cap (LIVE from Finnhub, cached 24h, with static fallback) and
 * live daily change (Finnhub + Yahoo fallback via fetchQuotes).
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

  // Fetch quotes + caps in parallel. Each map produces a Promise.all
  // separately so a slow market-cap call doesn't block any quote.
  const [quotes, caps] = await Promise.all([
    fetchQuotes(allTickers, 60),
    Promise.all(allTickers.map(fetchMarketCap)),
  ]);

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
      const cap = caps[i];
      if (!q?.c || cap <= 0) return null;
      return {
        ticker,
        sectorKey: tickerToSector[ticker] ?? 'tech',
        name: ticker,
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

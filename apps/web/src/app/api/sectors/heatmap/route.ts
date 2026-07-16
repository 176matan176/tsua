import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';
import { fetchYahooQuotes } from '@/lib/quotes';
import { MARKET_CAPS } from '@/lib/marketCaps';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * Tickers where Finnhub's profile2 endpoint reliably returns the cap in
 * the local listing currency (DKK, TWD, EUR…) without USD conversion.
 * For these we skip the live fetch and use the hardcoded MARKET_CAPS
 * value directly — a manually-maintained snapshot beats a 10x-wrong
 * live value every time.
 */
const FINNHUB_FOREIGN_CAP_BUGGY = new Set([
  // Foreign ADRs where Finnhub returns the cap in local listing currency
  // (DKK, TWD, EUR…) without converting to USD.
  'TSM',   // TWD ⇒ \$62T
  'NVO',   // DKK ⇒ \$1.4T
  'ASML',  // EUR ⇒ inflated
  'BABA',  // CNY
  'BIDU',  // CNY
  'TM',    // JPY
  'SONY',  // JPY
  'NU',    // BRL
  'MELI',  // BRL (sometimes)
  'SHOP',  // CAD (sometimes)
  // US-listed but Finnhub returns implausible 10x values — likely a
  // shares-outstanding parsing error in their profile2 data.
  'MU',    // \$1.27T live vs \$130B real (Micron)
]);

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
  // Foreign ADRs where we know Finnhub's value is wrong — skip live fetch.
  if (FINNHUB_FOREIGN_CAP_BUGGY.has(ticker.toUpperCase())) {
    return MARKET_CAPS[ticker.toUpperCase()] ?? 0;
  }

  if (FINNHUB_KEY) {
    try {
      const r = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 86400 } },
      );
      if (r.ok) {
        const j = await r.json();
        const capMillions = Number(j?.marketCapitalization);
        // Finnhub returns the cap in millions of USD — usually. For foreign-
        // listed ADRs (TSM, NVO, ASML, NU) it occasionally returns the cap in
        // the LOCAL currency without converting (TSM came back as ~32M ×
        // 1_000_000 = \$32T, which would put it above the entire S&P 500
        // combined). Sanity-window the value to [\$100M, \$8T]; anything
        // outside falls back to the hardcoded table which we know is sane.
        const MIN_CAP_MILLIONS = 100;
        const MAX_CAP_MILLIONS = 8_000_000; // \$8T — bigger than Apple, smaller than Finnhub's foreign-ADR bug
        if (
          Number.isFinite(capMillions)
          && capMillions >= MIN_CAP_MILLIONS
          && capMillions <= MAX_CAP_MILLIONS
        ) {
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
    fetchYahooQuotes(allTickers, 60),
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

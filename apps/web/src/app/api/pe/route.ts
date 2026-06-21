import { NextResponse } from 'next/server';
import { fetchYahooPE } from '@/lib/quotes';

/**
 * Index P/E ratios.
 *
 * Moved from `/api/markets/pe` because Vercel's edge cache returned a stale
 * 404 for that path indefinitely (10+ days, never refreshed). Same logic,
 * fresh URL.
 *
 * Source order:
 *   1. Yahoo `quoteSummary` via fetchYahooPE (does the crumb dance)
 *   2. Finnhub `/stock/metric` (works for individual stocks; mostly empty
 *      for ETFs on the free tier — kept as a defensive fallback)
 *   3. Curated static fallback so the widget never blanks; refreshed
 *      manually each quarter from public fund-fact-sheet pages.
 */
// Per-request fresh — was `revalidate = 3600` but Vercel CDN happily served
// 38-second-old cached responses across page loads (same staleness bug we
// caught on /api/feargreed and /api/markets). Each request now regenerates
// the JSON; the expensive Yahoo `quoteSummary` upstream call is cached for
// 15 min inside fetchYahooPE so we don't actually hit Yahoo more often.
//
// 15 min on the upstream gives the widget *intraday* P/E movement: trailing
// EPS is fixed but the price part moves with the market, so P/E shifts ~0.1-
// 0.5 across the trading day. 1h was masking those moves entirely.
export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

const INDEX_LIST = [
  { symbol: 'SPY',  nameHe: 'S&P 500',     flag: '🇺🇸' },
  { symbol: 'QQQ',  nameHe: 'נאסד"ק 100',  flag: '🇺🇸' },
  { symbol: 'DIA',  nameHe: 'דאו ג\'ונס',   flag: '🇺🇸' },
  { symbol: 'EIS',  nameHe: 'ת"א 35',      flag: '🇮🇱' },
] as const;

const FALLBACK: Record<string, number> = {
  SPY: 28.5,
  QQQ: 35.5,
  DIA: 24.0,
  EIS: 19.3,
};

interface FinnhubMetric {
  metric?: {
    peAnnual?: number;
    peTTM?: number;
    peNormalizedAnnual?: number;
  };
}

async function fetchFinnhubPE(symbol: string): Promise<number | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`,
      { next: { revalidate: 3600 } },
    );
    if (!r.ok) return null;
    const json = (await r.json()) as FinnhubMetric;
    const pe =
      json.metric?.peAnnual ??
      json.metric?.peTTM ??
      json.metric?.peNormalizedAnnual ??
      null;
    return typeof pe === 'number' && Number.isFinite(pe) && pe > 0 ? pe : null;
  } catch {
    return null;
  }
}

async function resolvePE(symbol: string): Promise<{ pe: number; source: 'live' } | null> {
  // 15 min internal cache so P/E reflects intraday price moves while still
  // throttling our Yahoo crumb traffic to a handful of calls per hour.
  const yahoo = await fetchYahooPE(symbol, 900);
  if (yahoo?.trailingPE) {
    return { pe: parseFloat(yahoo.trailingPE.toFixed(1)), source: 'live' };
  }
  const finnhub = await fetchFinnhubPE(symbol);
  if (finnhub) {
    return { pe: parseFloat(finnhub.toFixed(1)), source: 'live' };
  }
  return null;
}

export async function GET() {
  const resolved = await Promise.all(INDEX_LIST.map((i) => resolvePE(i.symbol)));

  const ratios = INDEX_LIST.map((idx, i) => {
    const live = resolved[i];
    if (live) {
      return {
        symbol: idx.symbol,
        nameHe: idx.nameHe,
        flag: idx.flag,
        pe: live.pe,
        source: 'live' as const,
      };
    }
    return {
      symbol: idx.symbol,
      nameHe: idx.nameHe,
      flag: idx.flag,
      pe: FALLBACK[idx.symbol] ?? null,
      source: 'estimate' as const,
    };
  });

  return NextResponse.json({
    ratios,
    updatedAt: Date.now(),
  });
}

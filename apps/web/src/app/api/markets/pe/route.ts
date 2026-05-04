import { NextResponse } from 'next/server';
import { fetchYahooPE } from '@/lib/quotes';

export const dynamic = 'force-dynamic';
// P/E ratios move slowly — re-fetch at most once per hour on the server.
export const revalidate = 3600;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * Index P/E ratios.
 *
 * Source order:
 *   1. Yahoo `quoteSummary` (has trailingPE for ETFs — SPY/QQQ/DIA/EIS).
 *   2. Finnhub `/stock/metric` (works for individual stocks; mostly empty
 *      for ETFs on the free tier — kept as a defensive fallback).
 *   3. Curated static fallback so the widget never blanks. These are
 *      refreshed manually each quarter from public fund-fact-sheet pages.
 */
const INDEX_LIST = [
  { symbol: 'SPY',  nameHe: 'S&P 500',     flag: '🇺🇸' },
  { symbol: 'QQQ',  nameHe: 'נאסד"ק 100',  flag: '🇺🇸' },
  { symbol: 'DIA',  nameHe: 'דאו ג\'ונס',   flag: '🇺🇸' },
  { symbol: 'EIS',  nameHe: 'ת"א 35',      flag: '🇮🇱' },
] as const;

const FALLBACK: Record<string, number> = {
  SPY: 21.8,
  QQQ: 31.5,
  DIA: 21.2,
  EIS: 14.3,
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
  // Pass the route's revalidate so the underlying fetch doesn't outlive the
  // route's own ISR window — otherwise Next would re-render every hour but
  // keep replaying the same Yahoo response cached for 6h.
  const yahoo = await fetchYahooPE(symbol, 3600);
  if (yahoo?.trailingPE) {
    return { pe: parseFloat(yahoo.trailingPE.toFixed(1)), source: 'live' };
  }
  // Finnhub second — covers individual stocks if Yahoo blocked the symbol.
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

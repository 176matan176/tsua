import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// P/E ratios move slowly — refresh at most once an hour on the server.
export const revalidate = 3600;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

/**
 * Index P/E ratios. Free Finnhub `/stock/metric` returns data for many
 * stocks but is patchy for ETFs (SPY/QQQ/DIA/EIS often come back with
 * empty `metric.peAnnual`). When live data is missing we fall back to a
 * curated estimate so the widget never blanks.
 *
 * The fallback values are refreshed manually each quarter from public
 * fund-fact-sheet aggregators (SPY/QQQ/DIA: SSGA / Invesco / SPDR pages,
 * EIS: iShares MSCI Israel fact sheet).
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

async function fetchPE(symbol: string): Promise<number | null> {
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
    return typeof pe === 'number' && Number.isFinite(pe) && pe > 0
      ? parseFloat(pe.toFixed(1))
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const peValues = await Promise.all(INDEX_LIST.map((i) => fetchPE(i.symbol)));

  const ratios = INDEX_LIST.map((idx, i) => {
    const live = peValues[i];
    return {
      symbol: idx.symbol,
      nameHe: idx.nameHe,
      flag: idx.flag,
      pe: live ?? FALLBACK[idx.symbol] ?? null,
      source: live != null ? ('live' as const) : ('estimate' as const),
    };
  });

  return NextResponse.json({
    ratios,
    updatedAt: Date.now(),
  });
}

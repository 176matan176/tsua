import { NextResponse } from 'next/server';

/**
 * Live FX rates for the Hebrew currency widget.
 *
 * Source: Yahoo Finance chart API (`USDILS=X` etc.) — intraday updates,
 * returns `regularMarketPrice` + `chartPreviousClose` so we can compute
 * real daily change %.
 *
 * Previously this was a client-side call to `frankfurter.app`, which only
 * serves ECB daily reference rates — not real-time and stale on weekends.
 *
 * Server-side so we can:
 *  - keep a short cache (revalidate: 60s)
 *  - mask the UA / avoid browser CORS issues
 *  - compute the change % consistently
 */

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const PAIRS = [
  { code: 'USD', label: 'דולר',  flag: '🇺🇸', symbol: 'USDILS=X' },
  { code: 'EUR', label: 'יורו',  flag: '🇪🇺', symbol: 'EURILS=X' },
  { code: 'GBP', label: 'פאונד', flag: '🇬🇧', symbol: 'GBPILS=X' },
  { code: 'JPY', label: 'ין',    flag: '🇯🇵', symbol: 'JPYILS=X' },
];

interface FxRate {
  code: string;
  label: string;
  flag: string;
  rate: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: number | null;
}

async function fetchYahooFx(symbol: string): Promise<Pick<FxRate, 'rate' | 'change' | 'changePercent' | 'updatedAt'>> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: {
        // Yahoo blocks empty UAs
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`yahoo ${res.status}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose ?? price);
    const ts = Number(meta?.regularMarketTime);
    if (!price || !isFinite(price)) throw new Error('no price');
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    return {
      rate: price,
      change,
      changePercent,
      updatedAt: ts ? ts * 1000 : Date.now(),
    };
  } catch {
    return { rate: null, change: null, changePercent: null, updatedAt: null };
  }
}

// Frankfurter (ECB) fallback — only used if Yahoo is down.
// Daily reference rate, no change %.
async function fetchFrankfurterFallback(): Promise<Record<string, number>> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=ILS&to=USD,EUR,GBP,JPY', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries<number>(data.rates ?? {})) {
      if (typeof v === 'number' && v > 0) out[k] = 1 / v;
    }
    return out;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const yahoo = await Promise.all(PAIRS.map(p => fetchYahooFx(p.symbol)));
    const needFallback = yahoo.some(y => y.rate === null);

    const fallback = needFallback ? await fetchFrankfurterFallback() : {};

    const rates: FxRate[] = PAIRS.map((p, i) => {
      const y = yahoo[i];
      if (y.rate !== null) {
        return { code: p.code, label: p.label, flag: p.flag, ...y };
      }
      const fb = fallback[p.code];
      return {
        code: p.code,
        label: p.label,
        flag: p.flag,
        rate: fb ?? null,
        change: null,
        changePercent: null,
        updatedAt: fb ? Date.now() : null,
      };
    });

    const latestTs = rates
      .map(r => r.updatedAt ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);

    return NextResponse.json({
      rates,
      updatedAt: latestTs || Date.now(),
      source: needFallback ? 'yahoo+frankfurter' : 'yahoo',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'fx fetch failed' },
      { status: 500 }
    );
  }
}

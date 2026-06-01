import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/quotes';

// 60s ISR — quote is the freshness-critical field; profile/metrics barely
// change. Better than force-dynamic which forced every page-view to hit
// Finnhub and contributed to the rate limits we're falling back from.
export const revalidate = 60;

/** Defensive JSON parse — Finnhub occasionally returns HTML error pages
 *  on rate-limit, which would explode an `await res.json()`. Returns {}
 *  on any parse failure so the route still returns the quote we already
 *  successfully fetched. */
async function safeJson(res: Response | null | undefined): Promise<Record<string, unknown>> {
  if (!res || !res.ok) return {};
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// Map TASE tickers to Yahoo-style symbols Finnhub understands
function toFinnhubSymbol(ticker: string): string {
  const t = ticker.toUpperCase().replace('$', '').replace('.TA', '');
  return t;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().replace('$', '');
  const symbol = toFinnhubSymbol(ticker);

  try {
    // Quote: Finnhub primary + Yahoo fallback (handles 429 and delisted tickers).
    // Profile + metrics: Finnhub-only (Yahoo doesn't expose these on the public chart API).
    // Profile/metrics may return empty for symbols Finnhub doesn't support — that's fine,
    // the page still renders with the quote.
    const [quote, profileRes, metricsRes] = await Promise.all([
      fetchQuote(symbol),
      FINNHUB_KEY
        ? fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`, {
            next: { revalidate: 3600 },
          }).catch(() => null)
        : null,
      FINNHUB_KEY
        ? fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`, {
            next: { revalidate: 3600 },
          }).catch(() => null)
        : null,
    ]);

    if (!quote.c) {
      return NextResponse.json({ error: 'No price data returned' }, { status: 404 });
    }

    // safeJson swallows non-OK responses *and* HTML-rather-than-JSON bodies
    // so a Finnhub error page can't sink the whole route. Profile/metrics
    // are nice-to-haves; the quote is what we must deliver.
    const profile = await safeJson(profileRes);
    const metricsData = await safeJson(metricsRes);
    const m = (metricsData?.metric ?? {}) as Record<string, unknown>;

    // Flag responses where we couldn't enrich with profile/metrics so the
    // client can surface a "partial data" hint instead of pretending the
    // company is anonymous (logo:null, no industry, no fundamentals).
    const partial = !profile.name || !m;

    const num = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    return NextResponse.json({
      ticker,
      name: (profile.name as string) || ticker,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      open: quote.o,
      high: quote.h,
      low: quote.l,
      prevClose: quote.pc,
      // `?? null` is correct here — `0` is a legitimate pre-market value we
      // want to preserve, while `undefined` (Yahoo didn't return it) becomes null.
      volume: quote.v ?? null,
      marketCap: typeof profile.marketCapitalization === 'number'
        ? profile.marketCapitalization * 1_000_000_000
        : null,
      currency: (profile.currency as string) || 'USD',
      exchange: (profile.exchange as string) || '',
      logo: (profile.logo as string) || null,
      country: (profile.country as string) || '',
      // Company overview
      description: (profile.description as string) ?? null,
      industry: (profile.finnhubIndustry as string) || null,
      sector: (profile.gics as string) || null,
      weburl: (profile.weburl as string) || null,
      employees: num(profile.employeeTotal),
      ipo: (profile.ipo as string) || null,
      // Fundamentals from /stock/metric
      week52High: num(m['52WeekHigh']),
      week52Low: num(m['52WeekLow']),
      peRatio: num(m['peBasicExclExtraTTM']) ?? num(m['peTTM']),
      forwardPE: num(m['peNormalizedAnnual']) ?? num(m['peExclExtraAnnual']),
      eps: num(m['epsBasicExclExtraItemsTTM']),
      beta: num(m['beta']),
      dividendYield: num(m['dividendYieldIndicatedAnnual']),
      pbRatio: num(m['pbAnnual']),
      roeTTM: num(m['roeTTM']),
      revenueGrowthTTM: num(m['revenueGrowthTTMYoy']),
      partial,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

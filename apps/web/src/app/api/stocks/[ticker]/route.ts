import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });
  }

  const ticker = params.ticker.toUpperCase().replace('$', '');
  const symbol = toFinnhubSymbol(ticker);

  try {
    // Fetch quote + profile + basic metrics in parallel
    // Quote cached 60s, profile/metrics cached 1hr to avoid Finnhub 429
    const [quoteRes, profileRes, metricsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`, {
        next: { revalidate: 60 },
      }),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`, {
        next: { revalidate: 3600 },
      }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_KEY}`, {
        next: { revalidate: 3600 },
      }),
    ]);

    if (!quoteRes.ok) throw new Error(`Finnhub error: ${quoteRes.status}`);

    const quote = await quoteRes.json();
    const profile = profileRes.ok ? await profileRes.json() : {};
    const metricsData = metricsRes.ok ? await metricsRes.json() : {};
    const m = metricsData?.metric ?? {};

    // quote.c = current price, quote.d = change, quote.dp = change percent
    if (!quote.c || quote.c === 0) {
      throw new Error('No price data returned');
    }

    return NextResponse.json({
      ticker,
      name: profile.name || ticker,
      price: quote.c,
      change: quote.d,
      changePercent: quote.dp,
      open: quote.o,
      high: quote.h,
      low: quote.l,
      prevClose: quote.pc,
      volume: quote.v || null,
      marketCap: profile.marketCapitalization ? profile.marketCapitalization * 1_000_000_000 : null,
      currency: profile.currency || 'USD',
      exchange: profile.exchange || '',
      logo: profile.logo || null,
      country: profile.country || '',
      // Company overview
      description: null, // Finnhub free tier doesn't include description
      industry: profile.finnhubIndustry || null,
      sector: profile.gics || null,
      weburl: profile.weburl || null,
      employees: profile.employeeTotal || null,
      ipo: profile.ipo || null,
      // Fundamentals from /stock/metric
      week52High: m['52WeekHigh'] ?? null,
      week52Low: m['52WeekLow'] ?? null,
      peRatio: m['peBasicExclExtraTTM'] ?? m['peTTM'] ?? null,
      forwardPE: m['peNormalizedAnnual'] ?? m['peExclExtraAnnual'] ?? null,
      eps: m['epsBasicExclExtraItemsTTM'] ?? null,
      beta: m['beta'] ?? null,
      dividendYield: m['dividendYieldIndicatedAnnual'] ?? null,
      pbRatio: m['pbAnnual'] ?? null,
      roeTTM: m['roeTTM'] ?? null,
      revenueGrowthTTM: m['revenueGrowthTTMYoy'] ?? null,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

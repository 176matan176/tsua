import { NextRequest, NextResponse } from 'next/server';
import { fetchYahooOwnership } from '@/lib/quotes';

/**
 * GET /api/stocks/[ticker]/ownership
 *
 * Returns the ownership pie data for a single equity. Powers the
 * "מי מחזיק במניה" widget on each stock page.
 *
 * Per-request fresh route, but the underlying Yahoo crumb call is cached
 * for 6h — ownership shifts very slowly (13F filings are quarterly), and
 * crumb roundtrips are expensive enough to want to share across users.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().replace('$', '').replace('.TA', '');

  const ownership = await fetchYahooOwnership(ticker);

  if (!ownership) {
    return NextResponse.json(
      { ok: false, error: 'not_available' },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, ticker, ownership });
}

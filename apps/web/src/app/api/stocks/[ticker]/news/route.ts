import { NextRequest, NextResponse } from 'next/server';

// `force-dynamic` defeated the `next: { revalidate: 900 }` hint below — same
// contradiction we cleaned up across /api/markets, /api/sectors, /api/macro.
// Top-level revalidate makes the route ISR-cacheable.
export const revalidate = 900;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  // Empty array with 200 here is fine — the absence of an API key is a config
  // state, not a transient failure. Client will render the "no news" copy.
  if (!FINNHUB_KEY) return NextResponse.json([], { status: 200 });

  const ticker = params.ticker.toUpperCase().replace('$', '');

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7); // last 7 days

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${fmt(from)}&to=${fmt(to)}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 900 } } // 15 min cache
    );

    // Surface upstream failures with a proper status code + error envelope
    // instead of `[]` with 200 — the client needs to distinguish "Finnhub
    // 429'd us" from "this ticker genuinely has no news".
    if (!res.ok) {
      return NextResponse.json(
        { error: `upstream ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    // Return top 8 articles, cleaned up
    const articles = (Array.isArray(data) ? data : [])
      .slice(0, 8)
      .map((a: any) => ({
        id: a.id,
        headline: a.headline,
        summary: a.summary,
        source: a.source,
        url: a.url,
        image: a.image || null,
        datetime: a.datetime * 1000, // convert to ms
        category: a.category,
      }));

    return NextResponse.json(articles);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 },
    );
  }
}

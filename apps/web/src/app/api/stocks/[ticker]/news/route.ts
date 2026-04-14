import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
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

    if (!res.ok) return NextResponse.json([]);

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
  } catch {
    return NextResponse.json([]);
  }
}

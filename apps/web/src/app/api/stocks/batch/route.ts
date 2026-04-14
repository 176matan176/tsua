import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// GET /api/stocks/batch?symbols=TEVA,NVDA,AAPL
export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  if (!symbols) return NextResponse.json({});
  if (!FINNHUB_KEY) return NextResponse.json({});

  const tickers = [...new Set(symbols.split(',').map(s => s.trim().toUpperCase()))].slice(0, 20);

  const results = await Promise.allSettled(
    tickers.map(ticker =>
      fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`, {
        next: { revalidate: 60 },
      }).then(r => r.json()).then(q => ({ ticker, price: q.c, change: q.d, changePercent: q.dp }))
    )
  );

  const data: Record<string, { price: number; change: number; changePercent: number }> = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled' && r.value?.price) {
      data[r.value.ticker] = {
        price: r.value.price,
        change: r.value.change,
        changePercent: r.value.changePercent,
      };
    }
  });

  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';
import { SECTORS } from '@/lib/sectors';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

// GET /api/sectors — returns the 11 GICS sectors with live ETF performance
export async function GET() {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ sectors: [], error: 'no_api_key' }, { status: 500 });
  }

  const results = await Promise.allSettled(
    SECTORS.map(async (sector) => {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${sector.etf}&token=${FINNHUB_KEY}`,
        { next: { revalidate: 60 } },
      );
      const q = await r.json();
      return {
        key: sector.key,
        nameHe: sector.nameHe,
        nameEn: sector.nameEn,
        emoji: sector.emoji,
        etf: sector.etf,
        color: sector.color,
        description: sector.description,
        price: typeof q.c === 'number' ? q.c : null,
        change: typeof q.d === 'number' ? q.d : null,
        changePercent: typeof q.dp === 'number' ? q.dp : null,
        high: typeof q.h === 'number' ? q.h : null,
        low: typeof q.l === 'number' ? q.l : null,
      };
    }),
  );

  const sectors = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          key: SECTORS[i].key,
          nameHe: SECTORS[i].nameHe,
          nameEn: SECTORS[i].nameEn,
          emoji: SECTORS[i].emoji,
          etf: SECTORS[i].etf,
          color: SECTORS[i].color,
          description: SECTORS[i].description,
          price: null,
          change: null,
          changePercent: null,
          high: null,
          low: null,
        },
  );

  return NextResponse.json({ sectors, timestamp: Date.now() });
}

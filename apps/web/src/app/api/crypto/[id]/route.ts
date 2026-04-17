import { NextRequest, NextResponse } from 'next/server';
import { getCoin } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

// GET /api/crypto/[id] — detail for one coin + 7-day sparkline
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const meta = getCoin(params.id);
  if (!meta) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const [marketRes, chartRes] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${meta.id}&price_change_percentage=24h,7d,30d`,
        { next: { revalidate: 60 } },
      ),
      fetch(
        `https://api.coingecko.com/api/v3/coins/${meta.id}/market_chart?vs_currency=usd&days=7`,
        { next: { revalidate: 300 } },
      ),
    ]);

    const marketData = marketRes.ok ? await marketRes.json() : null;
    const c = Array.isArray(marketData) && marketData.length > 0 ? marketData[0] : null;

    let sparkline: Array<[number, number]> = [];
    if (chartRes.ok) {
      const chart = await chartRes.json();
      if (Array.isArray(chart?.prices)) {
        sparkline = chart.prices;
      }
    }

    return NextResponse.json({
      id: meta.id,
      symbol: meta.symbol,
      nameHe: meta.nameHe,
      nameEn: meta.nameEn,
      description: meta.description,
      image: c?.image ?? null,
      price: typeof c?.current_price === 'number' ? c.current_price : null,
      change24h: typeof c?.price_change_24h === 'number' ? c.price_change_24h : null,
      changePercent24h: typeof c?.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : null,
      changePercent7d: typeof c?.price_change_percentage_7d_in_currency === 'number' ? c.price_change_percentage_7d_in_currency : null,
      changePercent30d: typeof c?.price_change_percentage_30d_in_currency === 'number' ? c.price_change_percentage_30d_in_currency : null,
      marketCap: typeof c?.market_cap === 'number' ? c.market_cap : null,
      marketCapRank: typeof c?.market_cap_rank === 'number' ? c.market_cap_rank : null,
      volume24h: typeof c?.total_volume === 'number' ? c.total_volume : null,
      high24h: typeof c?.high_24h === 'number' ? c.high_24h : null,
      low24h: typeof c?.low_24h === 'number' ? c.low_24h : null,
      ath: typeof c?.ath === 'number' ? c.ath : null,
      athChangePercent: typeof c?.ath_change_percentage === 'number' ? c.ath_change_percentage : null,
      athDate: c?.ath_date ?? null,
      circulatingSupply: typeof c?.circulating_supply === 'number' ? c.circulating_supply : null,
      totalSupply: typeof c?.total_supply === 'number' ? c.total_supply : null,
      maxSupply: typeof c?.max_supply === 'number' ? c.max_supply : null,
      sparkline,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}

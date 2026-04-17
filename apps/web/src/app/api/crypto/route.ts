import { NextResponse } from 'next/server';
import { CRYPTO_COINS, getAllCoinIds } from '@/lib/crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 1 min — CoinGecko rate-limits free tier to 30/min

// GET /api/crypto — returns top 20 coins with live price, 24h change, market cap
export async function GET() {
  const ids = getAllCoinIds().join(',');
  try {
    const r = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`,
      { next: { revalidate: 60 } },
    );
    if (!r.ok) {
      return NextResponse.json({ coins: [], error: `upstream_${r.status}` }, { status: 502 });
    }
    const data = await r.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ coins: [], error: 'bad_response' }, { status: 502 });
    }

    // Merge with our Hebrew metadata
    const coins = data.map((c: any) => {
      const meta = CRYPTO_COINS.find(m => m.id === c.id);
      return {
        id: c.id,
        symbol: (c.symbol ?? '').toUpperCase(),
        nameHe: meta?.nameHe ?? c.name,
        nameEn: c.name,
        description: meta?.description ?? '',
        image: c.image,
        price: typeof c.current_price === 'number' ? c.current_price : null,
        change24h: typeof c.price_change_24h === 'number' ? c.price_change_24h : null,
        changePercent24h: typeof c.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : null,
        marketCap: typeof c.market_cap === 'number' ? c.market_cap : null,
        marketCapRank: typeof c.market_cap_rank === 'number' ? c.market_cap_rank : null,
        volume24h: typeof c.total_volume === 'number' ? c.total_volume : null,
        high24h: typeof c.high_24h === 'number' ? c.high_24h : null,
        low24h: typeof c.low_24h === 'number' ? c.low_24h : null,
        ath: typeof c.ath === 'number' ? c.ath : null,
        athChangePercent: typeof c.ath_change_percentage === 'number' ? c.ath_change_percentage : null,
        athDate: c.ath_date ?? null,
      };
    });

    // Sort by market cap rank (CoinGecko returns sorted already, but double-check)
    coins.sort((a: any, b: any) => (a.marketCapRank ?? 999) - (b.marketCapRank ?? 999));

    return NextResponse.json({ coins, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ coins: [], error: 'fetch_failed' }, { status: 500 });
  }
}

// apps/web/src/app/api/stocks/hot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  IL_UNIVERSE, US_UNIVERSE, computeHotScore, buildSparklinePoints,
  type UniverseStock, type StockScore,
} from '@/lib/hotStocks';

export const revalidate = 120; // 2-minute ISR cache

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // change %
  o: number;   // open
  h: number;   // high
  l: number;   // low
  pc: number;  // previous close
  v: number;   // volume
}

async function fetchQuote(ticker: string): Promise<FinnhubQuote | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    const q: FinnhubQuote = await res.json();
    return q.c && q.c !== 0 ? q : null;
  } catch {
    return null;
  }
}

function getSentiment(posts: { sentiment: string | null }[]) {
  const c = { bullish: 0, bearish: 0, neutral: 0 };
  for (const p of posts) {
    const s = (p.sentiment ?? 'neutral') as keyof typeof c;
    if (s in c) c[s]++; else c.neutral++;
  }
  const total = c.bullish + c.bearish + c.neutral;
  const bullish = total > 0 ? Math.round((c.bullish / total) * 100) : 0;
  const bearish = total > 0 ? Math.round((c.bearish / total) * 100) : 0;
  return { bullish, bearish, neutral: total > 0 ? 100 - bullish - bearish : 0, total };
}

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') ?? 'il') as 'il' | 'us';
  const universe: UniverseStock[] = market === 'il' ? IL_UNIVERSE : US_UNIVERSE;
  const tickers = universe.map(s => s.ticker);

  // ── 1. Fetch all relevant posts from Supabase in ONE query ──────────────
  const supabase = createClient();
  const h24ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from('posts')
    .select('stock_mentions, sentiment')
    .gte('created_at', h24ago)
    .not('stock_mentions', 'is', null);

  // Count mentions + collect posts per ticker
  const mentionsMap: Record<string, { count: number; posts: { sentiment: string | null }[] }> = {};
  for (const t of tickers) mentionsMap[t] = { count: 0, posts: [] };
  for (const post of posts ?? []) {
    for (const raw of (post.stock_mentions ?? []) as string[]) {
      const t = raw.toUpperCase().replace('.TA', '');
      if (mentionsMap[t]) {
        mentionsMap[t].count++;
        mentionsMap[t].posts.push({ sentiment: post.sentiment });
      }
    }
  }

  // ── 2. Fetch Finnhub quotes in parallel ─────────────────────────────────
  const quotes = await Promise.all(tickers.map(t => fetchQuote(t)));

  // ── 3. Rank by volume (for volume_score) ────────────────────────────────
  const volumeRankMap: Record<string, number> = {};
  tickers
    .map((t, i) => ({ t, vol: quotes[i]?.v ?? 0 }))
    .sort((a, b) => b.vol - a.vol)
    .forEach(({ t }, rank) => { volumeRankMap[t] = rank; });

  // ── 4. Score every stock ─────────────────────────────────────────────────
  const now = new Date();
  const scored: StockScore[] = universe.map((stock, i) => {
    const q = quotes[i];
    const { count: mentions24h, posts: stockPosts } = mentionsMap[stock.ticker];
    const { hotScore, buzzScore, volatilityScore, volumeScore, reason } = computeHotScore(
      mentions24h,
      q?.dp ?? null,
      volumeRankMap[stock.ticker] ?? 0,
      universe.length,
    );
    return {
      ...stock,
      rank: 0, // assigned below
      price:         q?.c  ?? null,
      changePercent: q?.dp ?? null,
      volume:        q?.v  ?? null,
      open:          q?.o  ?? null,
      high:          q?.h  ?? null,
      low:           q?.l  ?? null,
      prevClose:     q?.pc ?? null,
      hotScore,
      buzzScore,
      volatilityScore,
      volumeScore,
      reason,
      mentions24h,
      sentiment: getSentiment(stockPosts),
    };
  });

  // ── 5. Sort and assign ranks ─────────────────────────────────────────────
  scored.sort((a, b) => b.hotScore - a.hotScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return NextResponse.json({ market, updatedAt: now.toISOString(), stocks: scored });
}

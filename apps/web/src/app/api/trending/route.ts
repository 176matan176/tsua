import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Real-time trending tickers based on post mentions.
 *
 * Query params:
 *   ?window=24h | 7d   (default 24h)
 *   ?limit=8           (default 8)
 *
 * Returns the top N tickers by post count in the time window,
 * along with bullish/bearish sentiment breakdown.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface TrendingTicker {
  ticker: string;
  mentions: number;
  bullish: number;
  bearish: number;
  neutral: number;
}

const WINDOW_HOURS: Record<string, number> = {
  '1h':  1,
  '24h': 24,
  '7d':  24 * 7,
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const windowKey = searchParams.get('window') ?? '24h';
  const hours = WINDOW_HOURS[windowKey] ?? 24;
  const limit = Math.min(Number(searchParams.get('limit') ?? 8), 20);

  try {
    const supabase = createClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Pull recent posts with at least one ticker mention.
    // Limit to 2000 so a busy window doesn't blow up memory.
    const { data, error } = await supabase
      .from('posts')
      .select('stock_mentions, sentiment')
      .gte('created_at', since)
      .not('stock_mentions', 'is', null)
      .limit(2000);

    if (error) throw error;

    // Aggregate in-memory — GIN index on stock_mentions could support this server-side,
    // but at 2k rows client-side aggregation is fast and simpler.
    const counts = new Map<string, TrendingTicker>();
    for (const row of data ?? []) {
      const tickers: string[] = row.stock_mentions ?? [];
      const sentiment: string = row.sentiment ?? 'neutral';
      for (const raw of tickers) {
        if (!raw) continue;
        const t = String(raw).toUpperCase();
        const cur = counts.get(t) ?? {
          ticker: t, mentions: 0, bullish: 0, bearish: 0, neutral: 0,
        };
        cur.mentions += 1;
        if (sentiment === 'bullish') cur.bullish += 1;
        else if (sentiment === 'bearish') cur.bearish += 1;
        else cur.neutral += 1;
        counts.set(t, cur);
      }
    }

    const trending = Array.from(counts.values())
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, limit);

    return NextResponse.json({
      window: windowKey,
      trending,
      updatedAt: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'trending query failed', trending: [] },
      { status: 500 }
    );
  }
}

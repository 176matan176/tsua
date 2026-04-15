import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 300; // 5-min cache

interface SentimentCounts {
  bullish: number;
  bearish: number;
  neutral: number;
}

function countBySentiment(posts: { sentiment: string | null }[]): SentimentCounts {
  const c: SentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const p of posts) {
    const s = (p.sentiment ?? 'neutral') as keyof SentimentCounts;
    if (s in c) c[s]++;
    else c.neutral++;
  }
  return c;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().replace('$', '').replace('.TA', '');
  const supabase = createClient();

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [{ data: curr }, { data: prev }] = await Promise.all([
    supabase
      .from('posts')
      .select('sentiment')
      .contains('stock_mentions', [ticker])
      .gte('created_at', h24ago),
    supabase
      .from('posts')
      .select('sentiment')
      .contains('stock_mentions', [ticker])
      .gte('created_at', h48ago)
      .lt('created_at', h24ago),
  ]);

  const currCounts = countBySentiment(curr ?? []);
  const prevCounts = countBySentiment(prev ?? []);

  const total     = currCounts.bullish + currCounts.bearish + currCounts.neutral;
  const prevTotal = prevCounts.bullish + prevCounts.bearish + prevCounts.neutral;

  const bullish = total > 0 ? Math.round((currCounts.bullish / total) * 100) : 0;
  const bearish = total > 0 ? Math.round((currCounts.bearish / total) * 100) : 0;
  const neutral = total > 0 ? 100 - bullish - bearish : 0;

  const prevBullish = prevTotal > 0 ? Math.round((prevCounts.bullish / prevTotal) * 100) : 0;
  const change24h   = bullish - prevBullish;

  return NextResponse.json({ bullish, bearish, neutral, total, change24h });
}

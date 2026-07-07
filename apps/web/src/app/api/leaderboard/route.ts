import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard?period=7d|30d|all&category=all|tase|us
 *
 * Replaces the retired external API (Railway app is gone — the old
 * `${NEXT_PUBLIC_API_URL}/api/v1/users/leaderboard` returns
 * "Application not found", which left the page permanently erroring).
 * Computes the same social leaderboard directly from Supabase, matching
 * the page header: "מדורגים לפי פעילות ולייקים".
 *
 * Field notes:
 * - `accuracy` is an ENGAGEMENT score 0-100 (avg interactions per post,
 *   capped) — we have no prediction-outcome data, so we don't pretend to.
 * - `score` = likes*3 + reposts*3 + replies*2 + posts*5, transparent and
 *   period-scoped. Followers intentionally excluded so the board rewards
 *   current activity, not accumulated audience.
 */

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

interface AuthorAgg {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followersCount: number;
  postCount: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  bullishCount: number;
  bearishCount: number;
}

const isTase = (ticker: string) => ticker.toUpperCase().endsWith('.TA');

function badgeFor(score: number): 'legend' | 'expert' | 'rising' | 'rookie' {
  if (score >= 500) return 'legend';
  if (score >= 200) return 'expert';
  if (score >= 60) return 'rising';
  return 'rookie';
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const period = params.get('period') ?? '30d';
  const category = params.get('category') ?? 'all';

  const supabase = createSupabase();

  let query = supabase
    .from('posts')
    .select(`
      author_id, sentiment, stock_mentions, like_count, reply_count, repost_count, created_at,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, followers_count)
    `)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (period !== 'all') {
    const days = period === '7d' ? 7 : 30;
    query = query.gte('created_at', new Date(Date.now() - days * 86_400_000).toISOString());
  }

  const { data: posts, error } = await query;
  if (error) {
    console.error('[api/leaderboard] query failed:', error.message);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }

  const byAuthor = new Map<string, AuthorAgg>();

  for (const p of posts ?? []) {
    const prof = p.profiles as unknown as {
      id: string; username: string; display_name: string | null;
      avatar_url: string | null; is_verified: boolean | null; followers_count: number | null;
    } | null;
    if (!prof?.username) continue;

    if (category !== 'all') {
      const mentions: string[] = p.stock_mentions ?? [];
      if (mentions.length === 0) continue;
      const hasTase = mentions.some(isTase);
      const hasUs = mentions.some(t => !isTase(t));
      if (category === 'tase' && !hasTase) continue;
      if (category === 'us' && !hasUs) continue;
    }

    let agg = byAuthor.get(prof.id);
    if (!agg) {
      agg = {
        id: prof.id,
        username: prof.username,
        displayName: prof.display_name ?? prof.username,
        avatarUrl: prof.avatar_url,
        isVerified: prof.is_verified ?? false,
        followersCount: prof.followers_count ?? 0,
        postCount: 0, totalLikes: 0, totalReplies: 0, totalReposts: 0,
        bullishCount: 0, bearishCount: 0,
      };
      byAuthor.set(prof.id, agg);
    }

    agg.postCount += 1;
    agg.totalLikes += p.like_count ?? 0;
    agg.totalReplies += p.reply_count ?? 0;
    agg.totalReposts += p.repost_count ?? 0;
    if (p.sentiment === 'bullish') agg.bullishCount += 1;
    if (p.sentiment === 'bearish') agg.bearishCount += 1;
  }

  const traders = [...byAuthor.values()]
    .map(a => {
      const score = a.totalLikes * 3 + a.totalReposts * 3 + a.totalReplies * 2 + a.postCount * 5;
      const engagement = a.postCount > 0
        ? Math.min(100, Math.round(((a.totalLikes + a.totalReplies + a.totalReposts) / a.postCount) * 10))
        : 0;
      return {
        id: a.id,
        username: a.username,
        displayName: a.displayName,
        avatarUrl: a.avatarUrl,
        isVerified: a.isVerified,
        followersCount: a.followersCount,
        postCount: a.postCount,
        totalLikes: a.totalLikes,
        bullishCount: a.bullishCount,
        bearishCount: a.bearishCount,
        accuracy: engagement,
        badge: badgeFor(score),
        score,
      };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 50)
    .map((t, i) => ({ rank: i + 1, ...t }));

  return NextResponse.json(traders, {
    headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' },
  });
}

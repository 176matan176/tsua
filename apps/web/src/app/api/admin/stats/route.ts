import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 *
 * Returns aggregate metrics for the admin dashboard:
 *   - Total users / posts / likes / follows
 *   - 24h deltas
 *   - Recent signups + recent posts
 *   - Top authors by post count
 *
 * Gated by ADMIN_EMAILS. Uses the service-role client so RLS doesn't
 * limit the queries.
 */
export async function GET() {
  const auth = await isAdminRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const sb = createAdminClient();
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const since7d  = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      usersTotal,
      usersLast24h,
      usersLast7d,
      postsTotal,
      postsLast24h,
      postsLast7d,
      likesTotal,
      followsTotal,
      recentUsers,
      recentPosts,
      topAuthorsRaw,
    ] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
      sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
      sb.from('posts').select('*', { count: 'exact', head: true }),
      sb.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
      sb.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
      sb.from('likes').select('*', { count: 'exact', head: true }),
      sb.from('follows').select('*', { count: 'exact', head: true }),
      sb.from('profiles')
        .select('id, username, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      sb.from('posts')
        .select('id, body, author_id, created_at, like_count, reply_count, stock_mentions, sentiment, profiles(username, display_name, avatar_url)')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(10),
      sb.from('posts')
        .select('author_id, profiles(username, display_name, avatar_url)')
        .gte('created_at', since7d)
        .limit(2000),
    ]);

    // Count top authors client-side (DB doesn't have a cheap group-by
    // that joins profiles in a single call).
    const authorCounts = new Map<string, { author_id: string; count: number; profile: any }>();
    for (const p of (topAuthorsRaw.data ?? []) as any[]) {
      const cur = authorCounts.get(p.author_id) ?? { author_id: p.author_id, count: 0, profile: p.profiles };
      cur.count += 1;
      authorCounts.set(p.author_id, cur);
    }
    const topAuthors = Array.from(authorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      snapshotAt: new Date().toISOString(),
      viewer: { email: auth.email },
      totals: {
        users: usersTotal.count ?? 0,
        posts: postsTotal.count ?? 0,
        likes: likesTotal.count ?? 0,
        follows: followsTotal.count ?? 0,
      },
      deltas: {
        users24h:  usersLast24h.count ?? 0,
        users7d:   usersLast7d.count ?? 0,
        posts24h:  postsLast24h.count ?? 0,
        posts7d:   postsLast7d.count ?? 0,
      },
      recentUsers: recentUsers.data ?? [],
      recentPosts: recentPosts.data ?? [],
      topAuthors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'stats failed' }, { status: 500 });
  }
}

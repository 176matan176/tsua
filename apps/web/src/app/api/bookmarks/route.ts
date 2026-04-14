import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

// POST /api/bookmarks — toggle bookmark
export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('bookmarks')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
    return NextResponse.json({ bookmarked: false });
  } else {
    await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
    return NextResponse.json({ bookmarked: true });
  }
}

// GET /api/bookmarks — list bookmarked posts
export async function GET() {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from('bookmarks')
    .select(`
      post_id,
      posts!post_id (
        id, body, lang, sentiment, stock_mentions, like_count, reply_count, repost_count, created_at,
        profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const posts = (data ?? []).map((b: any) => {
    const p = b.posts;
    return {
      id: p.id, body: p.body, lang: p.lang, sentiment: p.sentiment,
      imageUrls: [], likeCount: p.like_count, replyCount: p.reply_count,
      repostCount: p.repost_count, createdAt: p.created_at, isLiked: false,
      stockMentions: (p.stock_mentions ?? []).map((t: string) => ({ ticker: t, nameEn: t, nameHe: t, exchange: 'NASDAQ' })),
      author: {
        id: p.profiles?.id, username: p.profiles?.username,
        displayName: p.profiles?.display_name ?? p.profiles?.username,
        avatarUrl: p.profiles?.avatar_url,
        isVerified: p.profiles?.is_verified ?? false, rating: p.profiles?.rating,
      },
    };
  });

  return NextResponse.json(posts);
}

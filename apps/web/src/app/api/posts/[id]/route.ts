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

// GET /api/posts/[id] — fetch a single post
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: p, error } = await supabase
    .from('posts')
    .select(`
      id, body, lang, sentiment, stock_mentions, image_urls,
      like_count, reply_count, repost_count, created_at, parent_id,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Liked + bookmarked state for the current user
  let isLiked = false;
  let isBookmarked = false;
  if (user) {
    const [{ data: like }, { data: bm }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).eq('post_id', p.id).maybeSingle(),
      supabase.from('bookmarks').select('post_id').eq('user_id', user.id).eq('post_id', p.id).maybeSingle(),
    ]);
    isLiked = !!like;
    isBookmarked = !!bm;
  }

  const post = {
    id: p.id,
    body: p.body,
    lang: p.lang,
    sentiment: p.sentiment,
    imageUrls: p.image_urls ?? [],
    likeCount: p.like_count,
    replyCount: p.reply_count,
    repostCount: p.repost_count,
    createdAt: p.created_at,
    parentId: p.parent_id,
    isLiked,
    isBookmarked,
    stockMentions: (p.stock_mentions ?? []).map((ticker: string) => ({
      ticker, nameEn: ticker, nameHe: ticker, exchange: 'NASDAQ',
    })),
    author: {
      id: (p.profiles as any)?.id,
      username: (p.profiles as any)?.username ?? 'unknown',
      displayName: (p.profiles as any)?.display_name ?? (p.profiles as any)?.username ?? 'Unknown',
      avatarUrl: (p.profiles as any)?.avatar_url,
      isVerified: (p.profiles as any)?.is_verified ?? false,
      rating: (p.profiles as any)?.rating,
    },
  };

  return NextResponse.json(post);
}

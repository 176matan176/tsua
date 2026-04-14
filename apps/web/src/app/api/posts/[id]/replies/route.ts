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

// GET /api/posts/[id]/replies
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabase();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, body, lang, sentiment, stock_mentions, image_urls,
      like_count, reply_count, created_at, parent_id,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
    `)
    .eq('parent_id', params.id)
    .order('created_at', { ascending: true })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const replies = (data ?? []).map(p => ({
    id: p.id,
    body: p.body,
    lang: p.lang,
    sentiment: p.sentiment,
    imageUrls: p.image_urls ?? [],
    likeCount: p.like_count,
    replyCount: p.reply_count,
    createdAt: p.created_at,
    parentId: p.parent_id,
    isLiked: false,
    stockMentions: (p.stock_mentions ?? []).map((t: string) => ({ ticker: t, nameEn: t, nameHe: t, exchange: 'NASDAQ' })),
    author: {
      id: (p.profiles as any)?.id,
      username: (p.profiles as any)?.username,
      displayName: (p.profiles as any)?.display_name ?? (p.profiles as any)?.username,
      avatarUrl: (p.profiles as any)?.avatar_url,
      isVerified: (p.profiles as any)?.is_verified ?? false,
      rating: (p.profiles as any)?.rating,
    },
  }));

  return NextResponse.json(replies);
}

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

// GET /api/profile/[username]
export async function GET(_req: NextRequest, { params }: { params: { username: string } }) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_verified, rating, followers, following, post_count, created_at')
    .eq('username', params.username)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Check if current user follows this profile
  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    isFollowing = !!follow;
  }

  // Fetch posts by this user
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, body, lang, sentiment, stock_mentions, image_urls,
      like_count, reply_count, repost_count, created_at,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
    `)
    .eq('author_id', profile.id)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    profile: {
      ...profile,
      isMe: user?.id === profile.id,
      isFollowing,
    },
    posts: (posts ?? []).map(p => ({
      id: p.id,
      body: p.body,
      lang: p.lang,
      sentiment: p.sentiment,
      imageUrls: p.image_urls ?? [],
      likeCount: p.like_count,
      replyCount: p.reply_count,
      repostCount: p.repost_count,
      createdAt: p.created_at,
      isLiked: false,
      stockMentions: (p.stock_mentions ?? []).map((ticker: string) => ({
        ticker, nameEn: ticker, nameHe: ticker, exchange: 'NASDAQ',
      })),
      author: {
        id: (p.profiles as any)?.id,
        username: (p.profiles as any)?.username,
        displayName: (p.profiles as any)?.display_name ?? (p.profiles as any)?.username,
        avatarUrl: (p.profiles as any)?.avatar_url,
        isVerified: (p.profiles as any)?.is_verified ?? false,
        rating: (p.profiles as any)?.rating,
      },
    })),
  });
}

// POST /api/profile/[username]/follow — toggle follow
export async function POST(_req: NextRequest, { params }: { params: { username: string } }) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', params.username)
    .single();

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', target.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target.id);
    return NextResponse.json({ following: false });
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id: target.id });
    return NextResponse.json({ following: true });
  }
}

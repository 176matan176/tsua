import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

// GET /api/posts — fetch feed
export async function GET(req: NextRequest) {
  const supabase = createSupabase();
  const { searchParams } = new URL(req.url);
  const ticker  = searchParams.get('ticker');
  const cursor  = searchParams.get('cursor');   // ISO date for pagination
  const limit   = parseInt(searchParams.get('limit') ?? '30');

  // Get current user (for isLiked)
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('posts')
    .select(`
      id, body, lang, sentiment, stock_mentions, image_urls,
      like_count, reply_count, repost_count, created_at, parent_id,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
    `)
    .is('parent_id', null)   // top-level posts only
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ticker) {
    query = query.contains('stock_mentions', [ticker.toUpperCase()]);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data: posts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch which posts the user liked
  let likedSet = new Set<string>();
  if (user && posts?.length) {
    const ids = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', ids);
    likedSet = new Set(likes?.map(l => l.post_id) ?? []);
  }

  const result = (posts ?? []).map(p => ({
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
    isLiked: likedSet.has(p.id),
    stockMentions: (p.stock_mentions ?? []).map((ticker: string) => ({
      ticker,
      nameEn: ticker,
      nameHe: ticker,
      exchange: 'NASDAQ',
    })),
    author: {
      id: (p.profiles as any)?.id,
      username: (p.profiles as any)?.username ?? 'unknown',
      displayName: (p.profiles as any)?.display_name ?? (p.profiles as any)?.username ?? 'Unknown',
      avatarUrl: (p.profiles as any)?.avatar_url,
      isVerified: (p.profiles as any)?.is_verified ?? false,
      rating: (p.profiles as any)?.rating,
    },
  }));

  return NextResponse.json(result);
}

// POST /api/posts — create post
//
// Maximum body length matches the client composer's 280-char limit. The
// server enforces independently so abusers can't bypass the UI cap and
// 500-char-spam the feed. Same for stockMentions: the UI's $TICKER picker
// caps at 5 mentions; the server validates and re-caps server-side.
const MAX_POST_LENGTH      = 280;
const MAX_STOCK_MENTIONS   = 5;
const TICKER_PATTERN       = /^[A-Z0-9.\-]{1,10}$/;

export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate-limit on user.id when authenticated — keys-by-IP was throttling
  // every user behind a shared NAT (office wifi, mobile carrier CGNAT).
  const rl = rateLimit(req, {
    limit: 10,
    windowMs: 60 * 1000,
    identity: user.id,
  });
  if (!rl.success) {
    return NextResponse.json({ error: 'יותר מדי בקשות, נסה שוב עוד דקה' }, { status: 429 });
  }

  const body = await req.json();
  const { text, sentiment, stockMentions, lang, imageUrls, parentId } = body;

  if (!text?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 });
  if (text.length > MAX_POST_LENGTH) {
    return NextResponse.json({ error: 'Too long' }, { status: 400 });
  }

  // Sanitize stockMentions: cap count, uppercase, drop anything that doesn't
  // match the ticker shape. Without this, abusers were stuffing 1000 fake
  // tickers per post and polluting the trending aggregation.
  const cleanMentions: string[] = Array.isArray(stockMentions)
    ? Array.from(new Set(
        stockMentions
          .map((t: unknown) => String(t).toUpperCase().trim())
          .filter((t: string) => TICKER_PATTERN.test(t))
      )).slice(0, MAX_STOCK_MENTIONS)
    : [];

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      body: text.trim(),
      lang: lang ?? 'he',
      sentiment: sentiment ?? null,
      stock_mentions: cleanMentions,
      image_urls: imageUrls ?? [],
      parent_id: parentId ?? null,
    })
    .select(`
      id, body, lang, sentiment, stock_mentions, image_urls,
      like_count, reply_count, repost_count, created_at, parent_id,
      profiles!author_id (id, username, display_name, avatar_url, is_verified, rating)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update post_count (best-effort)
  try { await supabase.rpc('increment_post_count', { user_id: user.id }); } catch { /* ok */ }

  // Atomic reply_count bump. The old read-then-write was racy: two concurrent
  // replies both read N and wrote N+1, losing a reply from the count forever.
  // The RPC runs `update set reply_count = reply_count + 1` in a single
  // statement so Postgres serialises it per-row.
  //
  // Requires the atomic_counters_migration.sql to be applied — falls back to
  // the old behaviour if the RPC isn't there yet (so this commit doesn't
  // break prod before the migration lands).
  if (parentId) {
    const rpcRes = await supabase.rpc('increment_reply_count', { p_post_id: parentId });
    if (rpcRes.error) {
      // Migration not yet applied — fall back. Still racy, but no worse than before.
      try {
        const { data: parent } = await supabase
          .from('posts')
          .select('reply_count')
          .eq('id', parentId)
          .single();
        if (parent) {
          await supabase
            .from('posts')
            .update({ reply_count: (parent.reply_count ?? 0) + 1 })
            .eq('id', parentId);
        }
      } catch { /* ok */ }
    }
  }

  const post = {
    id: data.id,
    body: data.body,
    lang: data.lang,
    sentiment: data.sentiment,
    imageUrls: data.image_urls ?? [],
    likeCount: 0,
    replyCount: 0,
    repostCount: 0,
    createdAt: data.created_at,
    isLiked: false,
    stockMentions: (data.stock_mentions ?? []).map((ticker: string) => ({
      ticker, nameEn: ticker, nameHe: ticker, exchange: 'NASDAQ',
    })),
    author: {
      id: (data.profiles as any)?.id,
      username: (data.profiles as any)?.username,
      displayName: (data.profiles as any)?.display_name ?? (data.profiles as any)?.username,
      avatarUrl: (data.profiles as any)?.avatar_url,
      isVerified: (data.profiles as any)?.is_verified ?? false,
      rating: (data.profiles as any)?.rating,
    },
  };

  return NextResponse.json(post, { status: 201 });
}

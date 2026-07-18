import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { resolveCommunity } from '@/lib/communities';

export const dynamic = 'force-dynamic';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

interface ProfileRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

function normalizeProfile(p: unknown): ProfileRow | null {
  const row = Array.isArray(p) ? p[0] : p;
  return row && typeof row === 'object' ? (row as ProfileRow) : null;
}

interface ReactionAgg { emoji: string; count: number; reacted: boolean }

function mapMessage(
  m: { id: string; author_id?: string; body: string; created_at: string; profiles: unknown },
  reactions: ReactionAgg[] = [],
  currentUserId: string | null = null,
) {
  const author = normalizeProfile(m.profiles);
  return {
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    isOwn: currentUserId != null && m.author_id === currentUserId,
    reactions,
    author: {
      id: author?.id ?? '',
      username: author?.username ?? 'user',
      displayName: author?.display_name || author?.username || 'משתמש',
      avatarUrl: author?.avatar_url ?? null,
    },
  };
}

/** Aggregate reactions for a set of message ids into per-message {emoji,count,reacted}.
 *  Defensive: if the table doesn't exist yet (SQL not run), returns empty map. */
async function loadReactions(
  supabase: ReturnType<typeof createSupabase>,
  messageIds: string[],
  userId: string | null,
): Promise<Map<string, ReactionAgg[]>> {
  const out = new Map<string, ReactionAgg[]>();
  if (messageIds.length === 0) return out;
  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, emoji, user_id')
    .in('message_id', messageIds);
  if (error || !data) return out; // table missing / transient → no reactions
  const byMsg = new Map<string, Map<string, { count: number; reacted: boolean }>>();
  for (const r of data as { message_id: string; emoji: string; user_id: string }[]) {
    let em = byMsg.get(r.message_id);
    if (!em) { em = new Map(); byMsg.set(r.message_id, em); }
    const cur = em.get(r.emoji) ?? { count: 0, reacted: false };
    cur.count += 1;
    if (userId && r.user_id === userId) cur.reacted = true;
    em.set(r.emoji, cur);
  }
  for (const [mid, em] of byMsg) {
    out.set(mid, [...em.entries()].map(([emoji, v]) => ({ emoji, count: v.count, reacted: v.reacted })));
  }
  return out;
}

// GET /api/rooms/[slug]/messages?limit=50
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const community = resolveCommunity(params.slug);
  if (!community) {
    return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  }
  const roomSlug = community.slug;
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 100);
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('room_messages')
    .select('id, author_id, body, created_at, profiles!author_id (id, username, display_name, avatar_url)')
    .eq('room_slug', roomSlug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []).reverse();
  const reactionMap = await loadReactions(supabase, rows.map((m) => m.id), user?.id ?? null);
  const messages = rows.map((m) => mapMessage(m, reactionMap.get(m.id) ?? [], user?.id ?? null));
  return NextResponse.json({ messages });
}

// POST /api/rooms/[slug]/messages — send a message (auth required)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const community = resolveCommunity(params.slug);
  if (!community) {
    return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  }
  const roomSlug = community.slug;
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(req, { limit: 20, windowMs: 60 * 1000, identity: user.id });
  if (!rl.success) return NextResponse.json({ error: 'לאט לאט… יותר מדי הודעות' }, { status: 429 });

  let text = '';
  try {
    const json = await req.json();
    text = typeof json?.body === 'string' ? json.body.trim() : '';
  } catch { /* empty-body 400 below */ }
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'ההודעה חייבת להיות באורך 1–500 תווים' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_slug: roomSlug, author_id: user.id, body: text })
    .select('id, author_id, body, created_at, profiles!author_id (id, username, display_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapMessage(data, [], user.id), { status: 201 });
}

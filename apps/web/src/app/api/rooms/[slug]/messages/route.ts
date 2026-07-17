import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { getCommunity } from '@/lib/communities';

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

/** Supabase returns the FK-joined profile as an object (or array on some
 *  driver versions) — normalize defensively. */
function normalizeProfile(p: unknown): ProfileRow | null {
  const row = Array.isArray(p) ? p[0] : p;
  return row && typeof row === 'object' ? (row as ProfileRow) : null;
}

function mapMessage(m: {
  id: string; body: string; created_at: string; profiles: unknown;
}) {
  const author = normalizeProfile(m.profiles);
  return {
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    author: {
      id: author?.id ?? '',
      username: author?.username ?? 'user',
      displayName: author?.display_name || author?.username || 'משתמש',
      avatarUrl: author?.avatar_url ?? null,
    },
  };
}

// GET /api/rooms/[slug]/messages?limit=50 — latest messages, oldest-first
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!getCommunity(params.slug)) {
    return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 100);
  const supabase = createSupabase();

  const { data, error } = await supabase
    .from('room_messages')
    .select('id, body, created_at, profiles!author_id (id, username, display_name, avatar_url)')
    .eq('room_slug', params.slug)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetched newest-first for the LIMIT; render oldest-first like a chat.
  const messages = (data ?? []).reverse().map(mapMessage);
  return NextResponse.json({ messages });
}

// POST /api/rooms/[slug]/messages — send a message (auth required)
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!getCommunity(params.slug)) {
    return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  }

  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 20 messages/min per user — chat cadence, stricter than nothing, looser
  // than the 10/min post limit.
  const rl = rateLimit(req, { limit: 20, windowMs: 60 * 1000, identity: user.id });
  if (!rl.success) {
    return NextResponse.json({ error: 'לאט לאט… יותר מדי הודעות' }, { status: 429 });
  }

  let text = '';
  try {
    const json = await req.json();
    text = typeof json?.body === 'string' ? json.body.trim() : '';
  } catch {
    /* fall through to the empty-body 400 */
  }
  if (!text || text.length > 500) {
    return NextResponse.json({ error: 'ההודעה חייבת להיות באורך 1–500 תווים' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('room_messages')
    .insert({ room_slug: params.slug, author_id: user.id, body: text })
    .select('id, body, created_at, profiles!author_id (id, username, display_name, avatar_url)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mapMessage(data), { status: 201 });
}

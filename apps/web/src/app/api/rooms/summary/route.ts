import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COMMUNITIES } from '@/lib/communities';

export const dynamic = 'force-dynamic';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

interface LastMessage { body: string; createdAt: string; authorName: string }

/** Latest message per community, in one query. Fetch recent messages across all
 *  rooms and keep the first (newest) seen per slug. Defensive: table missing →
 *  empty map. */
async function loadLastMessages(
  supabase: ReturnType<typeof createSupabase>,
): Promise<Map<string, LastMessage>> {
  const out = new Map<string, LastMessage>();
  const { data, error } = await supabase
    .from('room_messages')
    .select('room_slug, body, created_at, profiles!author_id (display_name, username)')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error || !data) return out;
  for (const m of data as {
    room_slug: string; body: string; created_at: string;
    profiles: { display_name: string | null; username: string | null } | { display_name: string | null; username: string | null }[] | null;
  }[]) {
    if (out.has(m.room_slug)) continue; // already have the newest for this room
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    out.set(m.room_slug, {
      body: m.body,
      createdAt: m.created_at,
      authorName: p?.display_name || p?.username || 'משתמש',
    });
  }
  return out;
}

// GET /api/rooms/summary — member counts + my membership + last message, per
// community, in a single round-trip for the directory.
export async function GET() {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberRows } = await supabase.from('room_members').select('room_slug, user_id');
  const lastMessages = await loadLastMessages(supabase);

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const row of (memberRows ?? []) as { room_slug: string; user_id: string }[]) {
    counts.set(row.room_slug, (counts.get(row.room_slug) ?? 0) + 1);
    if (user && row.user_id === user.id) mine.add(row.room_slug);
  }

  const communities = COMMUNITIES.map((c) => ({
    slug: c.slug,
    members: counts.get(c.slug) ?? 0,
    isMember: mine.has(c.slug),
    lastMessage: lastMessages.get(c.slug) ?? null,
  }));
  return NextResponse.json({ communities });
}

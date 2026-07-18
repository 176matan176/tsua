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

// GET /api/rooms/summary — real member counts + my membership per community.
// One round-trip for the whole directory. Defensive: if room_members doesn't
// exist yet (SQL not run), returns zeros so the directory still renders.
export async function GET() {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const empty = COMMUNITIES.map((c) => ({ slug: c.slug, members: 0, isMember: false }));

  const { data, error } = await supabase
    .from('room_members')
    .select('room_slug, user_id');
  if (error || !data) return NextResponse.json({ communities: empty });

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const row of data as { room_slug: string; user_id: string }[]) {
    counts.set(row.room_slug, (counts.get(row.room_slug) ?? 0) + 1);
    if (user && row.user_id === user.id) mine.add(row.room_slug);
  }

  const communities = COMMUNITIES.map((c) => ({
    slug: c.slug,
    members: counts.get(c.slug) ?? 0,
    isMember: mine.has(c.slug),
  }));
  return NextResponse.json({ communities });
}

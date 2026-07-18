import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';
import { resolveCommunity } from '@/lib/communities';

export const dynamic = 'force-dynamic';

// Whitelisted reaction set — keeps the column clean and the UI predictable.
const ALLOWED = new Set(['👍', '🚀', '❤️', '🐻', '🔥', '😂']);

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

// POST /api/rooms/[slug]/messages/[id]/react  body: { emoji }
// Toggles the caller's reaction: adds it if absent, removes it if present.
// Returns { emoji, reacted } so the client can reconcile its optimistic update.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const community = resolveCommunity(params.slug);
  if (!community) return NextResponse.json({ error: 'unknown community' }, { status: 404 });

  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = rateLimit(req, { limit: 60, windowMs: 60 * 1000, identity: user.id });
  if (!rl.success) return NextResponse.json({ error: 'יותר מדי ריאקציות' }, { status: 429 });

  let emoji = '';
  try {
    const json = await req.json();
    emoji = typeof json?.emoji === 'string' ? json.emoji : '';
  } catch { /* validated below */ }
  if (!ALLOWED.has(emoji)) {
    return NextResponse.json({ error: 'ריאקציה לא נתמכת' }, { status: 400 });
  }

  // Is it already there? Toggle accordingly.
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('message_id')
    .eq('message_id', params.id)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', params.id)
      .eq('user_id', user.id)
      .eq('emoji', emoji);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ emoji, reacted: false });
  }

  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: params.id, user_id: user.id, emoji, room_slug: community.slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emoji, reacted: true });
}

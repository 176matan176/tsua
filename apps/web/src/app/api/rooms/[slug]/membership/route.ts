import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

async function state(supabase: ReturnType<typeof createSupabase>, slug: string, userId: string | null) {
  const { count } = await supabase
    .from('room_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('room_slug', slug);
  let isMember = false;
  if (userId) {
    const { data } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_slug', slug)
      .eq('user_id', userId)
      .maybeSingle();
    isMember = !!data;
  }
  return { members: count ?? 0, isMember };
}

// GET — { members, isMember }
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!getCommunity(params.slug)) return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json(await state(supabase, params.slug, user?.id ?? null));
}

// POST — join (auth). Idempotent via upsert on the composite PK.
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!getCommunity(params.slug)) return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('room_members')
    .upsert({ room_slug: params.slug, user_id: user.id }, { onConflict: 'room_slug,user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await state(supabase, params.slug, user.id));
}

// DELETE — leave (auth)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!getCommunity(params.slug)) return NextResponse.json({ error: 'unknown community' }, { status: 404 });
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('room_members')
    .delete()
    .eq('room_slug', params.slug)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(await state(supabase, params.slug, user.id));
}

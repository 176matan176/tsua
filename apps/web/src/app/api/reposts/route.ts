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

// POST /api/reposts — toggle repost
export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId } = await req.json();
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reposts').delete().eq('user_id', user.id).eq('post_id', postId);
    return NextResponse.json({ reposted: false });
  } else {
    await supabase.from('reposts').insert({ user_id: user.id, post_id: postId });
    return NextResponse.json({ reposted: true });
  }
}

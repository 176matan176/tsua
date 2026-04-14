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
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

// POST /api/posts/[id]/like — toggle like
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = rateLimit(req, { limit: 30, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'יותר מדי בקשות, נסה שוב עוד דקה' }, { status: 429 });
  }

  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = params.id;

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
    return NextResponse.json({ liked: false });
  } else {
    // Like
    await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    return NextResponse.json({ liked: true });
  }
}

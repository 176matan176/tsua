import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// DELETE /api/watchlist/[ticker] — remove ticker
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ticker = params.ticker.toUpperCase();

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker', ticker);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: ticker });
}

// GET /api/watchlist/[ticker] — check if in watchlist
export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ inWatchlist: false });

  const ticker = params.ticker.toUpperCase();
  const { data } = await supabase
    .from('watchlist')
    .select('id')
    .eq('user_id', user.id)
    .eq('ticker', ticker)
    .maybeSingle();

  return NextResponse.json({ inWatchlist: !!data });
}

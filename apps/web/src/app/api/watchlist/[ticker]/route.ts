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

  // Use .select() so we get back the rows that were actually removed —
  // otherwise a DELETE that matched zero rows returns the same 200 as a
  // successful one, and the client can't tell the difference.
  const { data: removed, error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', user.id)
    .eq('ticker', ticker)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!removed || removed.length === 0) {
    return NextResponse.json({ error: 'not in watchlist' }, { status: 404 });
  }
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

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

// GET /api/watchlist — all tickers for current user
export async function GET() {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/watchlist — add ticker
export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticker, name_he, name_en, exchange, logo } = await req.json();
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  const { data, error } = await supabase
    .from('watchlist')
    .upsert({
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      name_he: name_he ?? null,
      name_en: name_en ?? null,
      exchange: exchange ?? 'NASDAQ',
      logo: logo ?? null,
    }, { onConflict: 'user_id,ticker' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

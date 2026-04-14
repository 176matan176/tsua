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

// GET /api/search?q=teva&type=all|stocks|users
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { limit: 30, windowMs: 60 * 1000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'יותר מדי בקשות, נסה שוב עוד דקה' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const type = searchParams.get('type') ?? 'all';

  if (!q || q.length < 1) return NextResponse.json({ stocks: [], users: [] });

  const results: { stocks: any[]; users: any[] } = { stocks: [], users: [] };

  // ── Stock search via Finnhub ───────────────────────────────
  if (type === 'all' || type === 'stocks') {
    try {
      const finnhubRes = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: 60 } }
      );
      if (finnhubRes.ok) {
        const data = await finnhubRes.json();
        results.stocks = (data.result ?? [])
          .filter((r: any) => r.type === 'Common Stock' || r.type === 'ETP')
          .slice(0, 6)
          .map((r: any) => ({
            ticker: r.symbol,
            name: r.description,
            exchange: r.primaryExchange ?? '',
            type: r.type,
          }));
      }
    } catch { /* ignore */ }
  }

  // ── User search via Supabase ──────────────────────────────
  if (type === 'all' || type === 'users') {
    try {
      const supabase = createSupabase();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_verified, followers')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(5);
      results.users = data ?? [];
    } catch { /* ignore */ }
  }

  return NextResponse.json(results);
}

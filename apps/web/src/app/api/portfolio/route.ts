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

// GET /api/portfolio — fetch holdings + transactions for current user
export async function GET() {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [holdingsRes, txRes, profileRes] = await Promise.all([
    supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .limit(50),
    supabase
      .from('profiles')
      .select('virtual_cash')
      .eq('id', user.id)
      .single(),
  ]);

  return NextResponse.json({
    holdings: holdingsRes.data ?? [],
    transactions: txRes.data ?? [],
    cash: profileRes.data?.virtual_cash ?? 100000,
  });
}

// POST /api/portfolio — buy or sell
export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ticker, nameHe, nameEn, exchange, shares, price, type } = await req.json();

  if (!ticker || !shares || !price || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const total = shares * price;

  // Get current cash
  const { data: profile } = await supabase
    .from('profiles')
    .select('virtual_cash')
    .eq('id', user.id)
    .single();

  const currentCash = profile?.virtual_cash ?? 100000;

  if (type === 'buy') {
    if (currentCash < total) {
      return NextResponse.json({ error: 'Insufficient cash' }, { status: 400 });
    }

    // Upsert holding (update avg_price if already have position)
    const { data: existing } = await supabase
      .from('portfolio_holdings')
      .select('shares, avg_price')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .maybeSingle();

    if (existing) {
      const totalShares = existing.shares + shares;
      const newAvg = (existing.shares * existing.avg_price + total) / totalShares;
      await supabase
        .from('portfolio_holdings')
        .update({ shares: totalShares, avg_price: newAvg, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('ticker', ticker.toUpperCase());
    } else {
      await supabase.from('portfolio_holdings').insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        name_he: nameHe ?? ticker,
        name_en: nameEn ?? ticker,
        exchange: exchange ?? 'NASDAQ',
        shares,
        avg_price: price,
      });
    }

    // Deduct cash
    await supabase
      .from('profiles')
      .update({ virtual_cash: currentCash - total })
      .eq('id', user.id);

  } else if (type === 'sell') {
    const { data: holding } = await supabase
      .from('portfolio_holdings')
      .select('shares')
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())
      .maybeSingle();

    if (!holding || holding.shares < shares) {
      return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 });
    }

    const remaining = holding.shares - shares;
    if (remaining === 0) {
      await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker.toUpperCase());
    } else {
      await supabase
        .from('portfolio_holdings')
        .update({ shares: remaining, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('ticker', ticker.toUpperCase());
    }

    // Add cash
    await supabase
      .from('profiles')
      .update({ virtual_cash: currentCash + total })
      .eq('id', user.id);
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // Record transaction
  await supabase.from('portfolio_transactions').insert({
    user_id: user.id,
    ticker: ticker.toUpperCase(),
    type,
    shares,
    price,
  });

  return NextResponse.json({ success: true });
}

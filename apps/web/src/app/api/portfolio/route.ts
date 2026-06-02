import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { fetchQuote } from '@/lib/quotes';

// Per-user authenticated data — must never be ISR-cached.
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

/**
 * POST /api/portfolio — buy or sell.
 *
 * SECURITY NOTE: We deliberately ignore any `price` field in the request body.
 * The server fetches the authoritative quote itself; otherwise a user could
 * POST `{ price: 0.01 }` and buy NVDA at a cent — fatal to the simulated
 * portfolio's competitive integrity.
 *
 * ATOMICITY NOTE: Supabase JS has no client-side transaction primitive, so
 * the buy/sell flow uses a compensating-actions saga: mutate the riskier
 * leg first, and if the second leg fails, revert the first. This is *not*
 * truly atomic (the revert itself can fail under network partition), but
 * it's strictly safer than the prior "fire-and-forget two updates" code
 * which would happily give a user free shares if the cash debit silently
 * failed. The bullet-proof fix is a Postgres RPC like `execute_trade(...)`
 * wrapping all three writes in a single transaction — see TODO below.
 */
export async function POST(req: NextRequest) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Client price is read but NEVER trusted — we keep `clientPrice` only for
  // sanity logging if it deviates wildly from the server quote (front-end bug
  // or stale tab). The actual money math uses `price` (server-fetched).
  const { ticker, nameHe, nameEn, exchange, shares, price: clientPrice, type } =
    await req.json();

  if (!ticker || !shares || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (typeof shares !== 'number' || shares <= 0 || !Number.isFinite(shares)) {
    return NextResponse.json({ error: 'Invalid shares' }, { status: 400 });
  }

  const upperTicker = ticker.toUpperCase();

  // Fetch authoritative price from our shared quote helper (Finnhub → Yahoo).
  // This is the SINGLE point where the trade value is determined.
  const quote = await fetchQuote(upperTicker);
  if (!quote.c || quote.c <= 0) {
    return NextResponse.json({ error: 'Cannot price ticker right now' }, { status: 502 });
  }
  const price = quote.c;
  const total = shares * price;

  // If the client thought the price was very different (>2% drift), refuse —
  // protects the user from accidentally trading at a price they didn't see.
  if (typeof clientPrice === 'number' && clientPrice > 0) {
    const drift = Math.abs(clientPrice - price) / price;
    if (drift > 0.02) {
      return NextResponse.json(
        { error: 'price_drift', clientPrice, serverPrice: price },
        { status: 409 },
      );
    }
  }

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

    // STEP 1: Debit cash first — this is the harder-to-revert side if it
    // ever happens that we credit shares but fail to debit cash (free
    // shares for the user). Doing cash first means a holdings failure
    // just means we restore cash, which is cheap.
    const newCash = currentCash - total;
    const cashUpd = await supabase
      .from('profiles')
      .update({ virtual_cash: newCash })
      .eq('id', user.id);
    if (cashUpd.error) {
      return NextResponse.json({ error: 'cash debit failed' }, { status: 500 });
    }

    // STEP 2: Upsert holding. On failure, COMPENSATE by restoring cash.
    const { data: existing } = await supabase
      .from('portfolio_holdings')
      .select('shares, avg_price')
      .eq('user_id', user.id)
      .eq('ticker', upperTicker)
      .maybeSingle();

    let holdingErr: { message?: string } | null = null;
    if (existing) {
      const totalShares = existing.shares + shares;
      const newAvg = (existing.shares * existing.avg_price + total) / totalShares;
      const u = await supabase
        .from('portfolio_holdings')
        .update({ shares: totalShares, avg_price: newAvg, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('ticker', upperTicker);
      holdingErr = u.error;
    } else {
      const u = await supabase.from('portfolio_holdings').insert({
        user_id: user.id,
        ticker: upperTicker,
        name_he: nameHe ?? ticker,
        name_en: nameEn ?? ticker,
        exchange: exchange ?? 'NASDAQ',
        shares,
        avg_price: price,
      });
      holdingErr = u.error;
    }

    if (holdingErr) {
      // Compensating refund. If this ALSO fails the user is undercharged
      // (we owe them `total` back). Log loudly so an operator can repair.
      const refund = await supabase
        .from('profiles')
        .update({ virtual_cash: currentCash })
        .eq('id', user.id);
      if (refund.error) {
        console.error(
          '[portfolio] CRITICAL: cash debit succeeded but holdings insert AND refund both failed',
          { userId: user.id, ticker: upperTicker, total, holdingErr, refundErr: refund.error },
        );
      }
      return NextResponse.json({ error: 'holdings update failed' }, { status: 500 });
    }

  } else if (type === 'sell') {
    const { data: holding } = await supabase
      .from('portfolio_holdings')
      .select('shares, avg_price')
      .eq('user_id', user.id)
      .eq('ticker', upperTicker)
      .maybeSingle();

    if (!holding || holding.shares < shares) {
      return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 });
    }

    // STEP 1: Remove shares first (easier to restore than money).
    const remaining = holding.shares - shares;
    let sharesErr: { message?: string } | null = null;
    if (remaining === 0) {
      const d = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', upperTicker);
      sharesErr = d.error;
    } else {
      const u = await supabase
        .from('portfolio_holdings')
        .update({ shares: remaining, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('ticker', upperTicker);
      sharesErr = u.error;
    }
    if (sharesErr) {
      return NextResponse.json({ error: 'sell failed' }, { status: 500 });
    }

    // STEP 2: Credit cash. On failure, COMPENSATE by restoring shares.
    const cashUpd = await supabase
      .from('profiles')
      .update({ virtual_cash: currentCash + total })
      .eq('id', user.id);
    if (cashUpd.error) {
      // Restore the shares — re-upsert what we just removed. Name fields
      // here are best-effort fallbacks (we didn't re-select them on read).
      const restore = await supabase.from('portfolio_holdings').upsert({
        user_id: user.id,
        ticker: upperTicker,
        name_he: nameHe ?? upperTicker,
        name_en: nameEn ?? upperTicker,
        exchange: exchange ?? 'NASDAQ',
        shares: holding.shares,
        avg_price: holding.avg_price,
      });
      if (restore.error) {
        console.error(
          '[portfolio] CRITICAL: shares removed but cash credit AND restore both failed',
          { userId: user.id, ticker: upperTicker, shares, total, cashErr: cashUpd.error, restoreErr: restore.error },
        );
      }
      return NextResponse.json({ error: 'cash credit failed' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  // Record transaction with the server-fetched price (not the client's value).
  await supabase.from('portfolio_transactions').insert({
    user_id: user.id,
    ticker: upperTicker,
    type,
    shares,
    price, // authoritative
  });

  // TODO(atomicity): Move all writes above into a single Postgres RPC like
  //   CREATE FUNCTION execute_trade(user uuid, ticker text, shares numeric,
  //                                 price numeric, type text, ...) RETURNS jsonb
  // so the holdings + cash + transactions writes either all commit or all
  // roll back. The compensating-actions pattern above is the best we can
  // do from supabase-js client without an RPC migration.

  return NextResponse.json({ success: true, executedPrice: price });
}

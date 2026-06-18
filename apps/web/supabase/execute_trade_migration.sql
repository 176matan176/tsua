-- ============================================================================
-- Migration: execute_trade RPC for atomic buy/sell
-- ============================================================================
--
-- WHY: The /api/portfolio POST currently writes to three places —
--   profiles.virtual_cash, portfolio_holdings, portfolio_transactions —
-- using separate non-transactional Supabase JS calls. A failure in the
-- middle of the chain leaves the user with free shares (or vanished cash).
-- The application code patched the worst cases with compensating actions
-- but compensation isn't atomicity; under concurrent writes the user state
-- can still drift.
--
-- This migration adds a Postgres function that wraps the three writes in
-- a single transaction. The API route calls it via supabase.rpc('execute_trade')
-- and the database guarantees all-or-nothing.
--
-- HOW TO APPLY:
--   1. Open Supabase dashboard → SQL Editor
--   2. Paste this whole file
--   3. Run. Verify 'execute_trade' appears under Database → Functions.
--
-- After verifying, swap the API route to call this function (separate PR).
--
-- ROLLBACK: at the bottom of this file.
-- ============================================================================

create or replace function public.execute_trade(
  p_ticker      text,
  p_shares      numeric,
  p_price       numeric,
  p_type        text,           -- 'buy' or 'sell'
  p_name_he     text default null,
  p_name_en     text default null,
  p_exchange    text default 'NASDAQ'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_cash        numeric;
  v_total       numeric := p_shares * p_price;
  v_existing    portfolio_holdings%rowtype;
  v_new_avg     numeric;
  v_remaining   numeric;
begin
  -- ── Authentication ──────────────────────────────────────────────────────
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- ── Input validation ────────────────────────────────────────────────────
  if p_shares is null or p_shares <= 0 or not (p_shares = p_shares) then
    return jsonb_build_object('ok', false, 'error', 'invalid_shares');
  end if;
  if p_price is null or p_price <= 0 or not (p_price = p_price) then
    return jsonb_build_object('ok', false, 'error', 'invalid_price');
  end if;
  if p_type not in ('buy', 'sell') then
    return jsonb_build_object('ok', false, 'error', 'invalid_type');
  end if;

  -- Lock the user's profile row for the duration of this transaction so
  -- two concurrent trades can't both read stale cash and double-spend.
  select virtual_cash into v_cash
    from profiles
    where id = v_user_id
    for update;

  -- New users get the 100K seed if their row doesn't have it yet.
  if v_cash is null then
    v_cash := 100000;
    update profiles set virtual_cash = v_cash where id = v_user_id;
  end if;

  -- ── BUY ─────────────────────────────────────────────────────────────────
  if p_type = 'buy' then
    if v_cash < v_total then
      return jsonb_build_object('ok', false, 'error', 'insufficient_cash');
    end if;

    -- Lock the holding row too (no race against another tab's sell).
    select * into v_existing
      from portfolio_holdings
      where user_id = v_user_id and ticker = upper(p_ticker)
      for update;

    if found then
      -- Weighted average cost basis on top-up.
      v_new_avg := (v_existing.shares * v_existing.avg_price + v_total)
                 / (v_existing.shares + p_shares);
      update portfolio_holdings
        set shares     = v_existing.shares + p_shares,
            avg_price  = v_new_avg,
            updated_at = now()
        where user_id = v_user_id and ticker = upper(p_ticker);
    else
      insert into portfolio_holdings (
        user_id, ticker, name_he, name_en, exchange, shares, avg_price
      ) values (
        v_user_id, upper(p_ticker),
        coalesce(p_name_he, p_ticker),
        coalesce(p_name_en, p_ticker),
        coalesce(p_exchange, 'NASDAQ'),
        p_shares, p_price
      );
    end if;

    update profiles set virtual_cash = v_cash - v_total where id = v_user_id;

  -- ── SELL ────────────────────────────────────────────────────────────────
  else
    select * into v_existing
      from portfolio_holdings
      where user_id = v_user_id and ticker = upper(p_ticker)
      for update;

    if not found or v_existing.shares < p_shares then
      return jsonb_build_object('ok', false, 'error', 'insufficient_shares');
    end if;

    v_remaining := v_existing.shares - p_shares;
    if v_remaining = 0 then
      delete from portfolio_holdings
        where user_id = v_user_id and ticker = upper(p_ticker);
    else
      update portfolio_holdings
        set shares     = v_remaining,
            updated_at = now()
        where user_id = v_user_id and ticker = upper(p_ticker);
    end if;

    update profiles set virtual_cash = v_cash + v_total where id = v_user_id;
  end if;

  -- ── Transaction record ─────────────────────────────────────────────────
  insert into portfolio_transactions (user_id, ticker, type, shares, price)
    values (v_user_id, upper(p_ticker), p_type, p_shares, p_price);

  return jsonb_build_object(
    'ok',             true,
    'executed_price', p_price,
    'total',          v_total,
    'new_cash',       case when p_type = 'buy' then v_cash - v_total else v_cash + v_total end
  );

exception
  -- Any error inside this block triggers an automatic rollback of every
  -- write above. The caller gets a structured error envelope instead of
  -- a half-applied trade.
  when others then
    return jsonb_build_object(
      'ok',        false,
      'error',     'db_error',
      'detail',    sqlerrm
    );
end;
$$;

-- Permit authenticated users to call this function. anon role is NOT granted —
-- the function itself checks auth.uid() and bails for unauthenticated callers,
-- but defence-in-depth.
revoke all on function public.execute_trade(text, numeric, numeric, text, text, text, text) from public;
grant execute on function public.execute_trade(text, numeric, numeric, text, text, text, text) to authenticated;

-- ============================================================================
-- ROLLBACK (run only if you want to remove the function):
--   drop function if exists public.execute_trade(text, numeric, numeric, text, text, text, text);
-- ============================================================================

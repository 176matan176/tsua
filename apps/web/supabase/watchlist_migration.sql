-- ============================================================
--  TSUA — Watchlist Migration
--  Run in Supabase SQL Editor after schema.sql
-- ============================================================

create table if not exists public.watchlist (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  ticker     text not null,
  name_he    text,
  name_en    text,
  exchange   text default 'NASDAQ',
  logo       text,
  added_at   timestamptz default now(),
  unique (user_id, ticker)
);

alter table public.watchlist enable row level security;
create policy "Users view own watchlist"   on public.watchlist for select using (auth.uid() = user_id);
create policy "Users manage own watchlist" on public.watchlist for all    using (auth.uid() = user_id);

-- Index for fast per-user queries
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);

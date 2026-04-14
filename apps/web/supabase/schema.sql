-- ============================================================
--  TSUA — Complete Database Schema
--  Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ────────────────────────────────────────────────
-- Mirrors auth.users, auto-created on signup via trigger
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  is_verified   boolean default false,
  rating        numeric(4,1),           -- analyst score 0-10
  followers     int default 0,
  following     int default 0,
  post_count    int default 0,
  virtual_cash  numeric default 100000, -- starting balance for virtual portfolio
  created_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles visible to all" on public.profiles for select using (true);
create policy "Users update own profile"       on public.profiles for update using (auth.uid() = id);

-- ── Auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── posts ────────────────────────────────────────────────────
create table if not exists public.posts (
  id              uuid primary key default uuid_generate_v4(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) <= 500),
  lang            text default 'he' check (lang in ('he','en')),
  sentiment       text check (sentiment in ('bullish','bearish','neutral')),
  stock_mentions  text[] default '{}',   -- array of tickers e.g. ['TEVA','NVDA']
  image_urls      text[] default '{}',
  like_count      int default 0,
  reply_count     int default 0,
  repost_count    int default 0,
  parent_id       uuid references public.posts(id) on delete cascade,  -- for replies
  created_at      timestamptz default now()
);
alter table public.posts enable row level security;
create policy "Posts visible to all"     on public.posts for select using (true);
create policy "Auth users create posts"  on public.posts for insert with check (auth.uid() = author_id);
create policy "Authors delete own posts" on public.posts for delete using (auth.uid() = author_id);

-- Index for feed queries
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_stock_mentions_idx on public.posts using gin(stock_mentions);

-- ── likes ────────────────────────────────────────────────────
create table if not exists public.likes (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  post_id  uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, post_id),
  created_at timestamptz default now()
);
alter table public.likes enable row level security;
create policy "Likes visible to all"    on public.likes for select using (true);
create policy "Auth users like posts"   on public.likes for insert with check (auth.uid() = user_id);
create policy "Users unlike own likes"  on public.likes for delete using (auth.uid() = user_id);

-- Auto-update like_count on posts
create or replace function public.handle_like_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.handle_like_change();

-- ── follows ──────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  primary key (follower_id, following_id),
  check (follower_id != following_id),
  created_at timestamptz default now()
);
alter table public.follows enable row level security;
create policy "Follows visible to all"   on public.follows for select using (true);
create policy "Auth users follow"        on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users unfollow own"       on public.follows for delete using (auth.uid() = follower_id);

-- Auto-update follower/following counters
create or replace function public.handle_follow_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.profiles set following  = following  + 1 where id = new.follower_id;
    update public.profiles set followers  = followers  + 1 where id = new.following_id;
  elsif TG_OP = 'DELETE' then
    update public.profiles set following  = greatest(0, following  - 1) where id = old.follower_id;
    update public.profiles set followers  = greatest(0, followers  - 1) where id = old.following_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_follow_change on public.follows;
create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute procedure public.handle_follow_change();

-- ── portfolio_holdings ───────────────────────────────────────
create table if not exists public.portfolio_holdings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  ticker      text not null,
  name_he     text,
  name_en     text,
  exchange    text default 'NASDAQ',
  shares      numeric not null check (shares > 0),
  avg_price   numeric not null check (avg_price > 0),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, ticker)
);
alter table public.portfolio_holdings enable row level security;
create policy "Users view own holdings"   on public.portfolio_holdings for select using (auth.uid() = user_id);
create policy "Users manage own holdings" on public.portfolio_holdings for all    using (auth.uid() = user_id);

-- ── portfolio_transactions ───────────────────────────────────
create table if not exists public.portfolio_transactions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  ticker       text not null,
  type         text not null check (type in ('buy','sell')),
  shares       numeric not null check (shares > 0),
  price        numeric not null check (price > 0),
  total        numeric generated always as (shares * price) stored,
  executed_at  timestamptz default now()
);
alter table public.portfolio_transactions enable row level security;
create policy "Users view own transactions"   on public.portfolio_transactions for select using (auth.uid() = user_id);
create policy "Users create own transactions" on public.portfolio_transactions for insert with check (auth.uid() = user_id);

-- ── alerts ───────────────────────────────────────────────────
create table if not exists public.alerts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  ticker        text not null,
  name_he       text,
  name_en       text,
  alert_type    text not null check (alert_type in ('price_above','price_below','volume_spike','news')),
  threshold     numeric,
  is_active     boolean default true,
  triggered_at  timestamptz,
  created_at    timestamptz default now()
);
alter table public.alerts enable row level security;
create policy "Users view own alerts"   on public.alerts for select using (auth.uid() = user_id);
create policy "Users manage own alerts" on public.alerts for all    using (auth.uid() = user_id);

-- ── Enable Realtime ──────────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication
-- Or uncomment:
-- alter publication supabase_realtime add table public.posts;
-- alter publication supabase_realtime add table public.likes;

-- ── Seed data (optional demo posts) ─────────────────────────
-- Insert a demo bot user for seed posts
-- (Skip if you want a clean start)

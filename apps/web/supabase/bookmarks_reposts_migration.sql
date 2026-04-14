-- ============================================================
--  TSUA — Bookmarks & Reposts Migration
-- ============================================================

-- Bookmarks
create table if not exists public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id)    on delete cascade,
  primary key (user_id, post_id),
  created_at timestamptz default now()
);
alter table public.bookmarks enable row level security;
create policy "Users view own bookmarks"   on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users manage own bookmarks" on public.bookmarks for all    using (auth.uid() = user_id);

-- Reposts
create table if not exists public.reposts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  post_id     uuid not null references public.posts(id)    on delete cascade,
  unique (user_id, post_id),
  created_at  timestamptz default now()
);
alter table public.reposts enable row level security;
create policy "Reposts visible to all"    on public.reposts for select using (true);
create policy "Auth users repost"         on public.reposts for insert with check (auth.uid() = user_id);
create policy "Users undo own repost"     on public.reposts for delete using (auth.uid() = user_id);

-- Auto-update repost_count
create or replace function public.handle_repost_change()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set repost_count = repost_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update public.posts set repost_count = greatest(0, repost_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
drop trigger if exists on_repost_change on public.reposts;
create trigger on_repost_change
  after insert or delete on public.reposts
  for each row execute procedure public.handle_repost_change();

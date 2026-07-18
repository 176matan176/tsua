-- ═══════════════════════════════════════════════════════════════════════════
-- Communities phase 3: real membership + message reactions + delete.
-- Run ONCE in Supabase Dashboard → SQL Editor → Run. Idempotent (safe to re-run).
-- Requires room_messages (from room_messages.sql) to already exist.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Membership ──────────────────────────────────────────────────────────────
create table if not exists public.room_members (
  room_slug  text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (room_slug, user_id)
);
create index if not exists room_members_slug_idx on public.room_members (room_slug);

alter table public.room_members enable row level security;

drop policy if exists "room_members_select_all" on public.room_members;
create policy "room_members_select_all" on public.room_members for select using (true);

drop policy if exists "room_members_insert_own" on public.room_members;
create policy "room_members_insert_own" on public.room_members for insert with check (auth.uid() = user_id);

drop policy if exists "room_members_delete_own" on public.room_members;
create policy "room_members_delete_own" on public.room_members for delete using (auth.uid() = user_id);

-- ── Reactions ───────────────────────────────────────────────────────────────
-- room_slug is denormalized so the chat can subscribe to realtime changes
-- filtered to a single community.
create table if not exists public.message_reactions (
  message_id uuid not null references public.room_messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  room_slug  text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_msg_idx  on public.message_reactions (message_id);
create index if not exists message_reactions_room_idx on public.message_reactions (room_slug);

alter table public.message_reactions enable row level security;

drop policy if exists "message_reactions_select_all" on public.message_reactions;
create policy "message_reactions_select_all" on public.message_reactions for select using (true);

drop policy if exists "message_reactions_insert_own" on public.message_reactions;
create policy "message_reactions_insert_own" on public.message_reactions for insert with check (auth.uid() = user_id);

drop policy if exists "message_reactions_delete_own" on public.message_reactions;
create policy "message_reactions_delete_own" on public.message_reactions for delete using (auth.uid() = user_id);

-- Realtime for live reactions (no-op if already added)
do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Community chat (קהילות) — real message persistence + realtime.
-- Run this ONCE in the Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.room_messages (
  id         uuid primary key default gen_random_uuid(),
  room_slug  text not null,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists room_messages_room_created_idx
  on public.room_messages (room_slug, created_at desc);

alter table public.room_messages enable row level security;

-- Everyone can read (communities are public)
drop policy if exists "room_messages_select_all" on public.room_messages;
create policy "room_messages_select_all"
  on public.room_messages for select
  using (true);

-- Only authenticated users can post, and only as themselves
drop policy if exists "room_messages_insert_own" on public.room_messages;
create policy "room_messages_insert_own"
  on public.room_messages for insert
  with check (auth.uid() = author_id);

-- Authors can delete their own messages
drop policy if exists "room_messages_delete_own" on public.room_messages;
create policy "room_messages_delete_own"
  on public.room_messages for delete
  using (auth.uid() = author_id);

-- Realtime: let the chat UI receive INSERTs live (no-op if already added)
do $$ begin
  alter publication supabase_realtime add table public.room_messages;
exception when duplicate_object then null; end $$;

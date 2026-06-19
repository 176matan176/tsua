-- ============================================================================
-- Migration: atomic counter helpers + unique constraint on likes
-- ============================================================================
--
-- WHY: Two real bugs the feed audit caught:
--
--   #17 reply_count race: POST /api/posts read parent's reply_count then
--       wrote +1 in two separate queries. Two concurrent replies both see N
--       and both write N+1 → one reply is invisible in the count forever.
--
--   #18 like idempotency: POST /api/posts/[id]/like did "check if liked,
--       insert if not." Two parallel taps from the same user (rapid double-
--       click, retry) can both pass the "not liked yet" check and both
--       insert — leaving two like rows for one user-post pair.
--
-- Fixes:
--   1. increment_reply_count() / decrement_reply_count() RPC functions that
--      use a single UPDATE expression — Postgres guarantees per-row atomicity.
--   2. UNIQUE constraint on post_likes (user_id, post_id) so duplicate inserts
--      fail at the DB level. API code becomes simpler: upsert + on conflict.
--   3. Optional like_count trigger so the post row stays in sync without the
--      app touching it.
--
-- HOW TO APPLY:
--   Supabase dashboard → SQL Editor → paste → Run.
--
-- ============================================================================

-- ── Atomic reply_count helpers ─────────────────────────────────────────────
create or replace function public.increment_reply_count(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update posts set reply_count = coalesce(reply_count, 0) + 1 where id = p_post_id;
$$;

create or replace function public.decrement_reply_count(p_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update posts set reply_count = greatest(coalesce(reply_count, 0) - 1, 0) where id = p_post_id;
$$;

revoke all on function public.increment_reply_count(uuid) from public;
revoke all on function public.decrement_reply_count(uuid) from public;
grant execute on function public.increment_reply_count(uuid) to authenticated;
grant execute on function public.decrement_reply_count(uuid) to authenticated;

-- ── Like uniqueness ─────────────────────────────────────────────────────────
-- Existing duplicates (if any) must be cleared first or this will fail.
-- The DELETE below keeps the earliest row per (user, post).
delete from public.post_likes
  where id in (
    select id from (
      select id, row_number() over (
        partition by user_id, post_id order by created_at asc
      ) as rn
      from post_likes
    ) ranked
    where rn > 1
  );

alter table public.post_likes
  drop constraint if exists post_likes_user_post_unique;

alter table public.post_likes
  add constraint post_likes_user_post_unique unique (user_id, post_id);

-- ── like_count sync trigger (optional but ideal) ───────────────────────────
-- Keeps posts.like_count == count(post_likes WHERE post_id = posts.id)
-- without the app having to remember to update it manually.
create or replace function public._tg_post_likes_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = coalesce(like_count, 0) + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(coalesce(like_count, 0) - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_sync_count on public.post_likes;
create trigger post_likes_sync_count
  after insert or delete on public.post_likes
  for each row execute function public._tg_post_likes_sync_count();

-- One-time backfill so the trigger starts from a correct baseline.
update public.posts p
  set like_count = (select count(*) from public.post_likes l where l.post_id = p.id);

-- ============================================================================
-- ROLLBACK:
--   drop trigger if exists post_likes_sync_count on public.post_likes;
--   drop function if exists public._tg_post_likes_sync_count();
--   alter table public.post_likes drop constraint if exists post_likes_user_post_unique;
--   drop function if exists public.increment_reply_count(uuid);
--   drop function if exists public.decrement_reply_count(uuid);
-- ============================================================================

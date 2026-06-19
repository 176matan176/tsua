-- ============================================================================
-- Migration: post_reports table + reporting RPC
-- ============================================================================
--
-- WHY: P3 of the launch plan is "serious community discussion." That requires
-- moderation primitives — users need a Report button on every post and an
-- admin queue to triage them. This migration adds:
--
--   1. post_reports — one row per reporter+post (idempotent on resubmit)
--   2. Read RLS: users see their own reports; admins see all
--   3. Insert RLS: anyone authenticated may report; the report's reporter_id
--      is forced to auth.uid() server-side so users can't spoof someone else
--   4. report_post() RPC — sanity-checks then upserts, returns structured result
--
-- HOW TO APPLY:
--   1. Supabase dashboard → SQL Editor
--   2. Paste this whole file → Run
--   3. Verify table appears under Database → Tables (post_reports)
--   4. Verify function under Database → Functions (report_post)
--
-- ROLLBACK at bottom of file.
-- ============================================================================

create table if not exists public.post_reports (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  reporter_id   uuid not null references auth.users(id) on delete cascade,
  reason        text not null,           -- short machine-readable code
  details       text,                    -- optional free-text from user
  status        text not null default 'pending'
                  check (status in ('pending', 'resolved_actioned', 'resolved_dismissed')),
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz,
  resolution_note text,
  created_at    timestamptz not null default now(),

  -- One report per user per post — clicking "Report" twice on the same post
  -- updates the existing row rather than spamming the moderation queue.
  unique (post_id, reporter_id)
);

create index if not exists post_reports_status_created_idx
  on public.post_reports (status, created_at desc);

create index if not exists post_reports_post_idx
  on public.post_reports (post_id);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.post_reports enable row level security;

-- Reporters can see their own reports (so the UI can show "you already
-- reported this post"). Admins can see everything.
drop policy if exists "Reporters read own" on public.post_reports;
create policy "Reporters read own"
  on public.post_reports for select
  using (
    reporter_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Inserts go via the RPC below; direct inserts are blocked. This guarantees
-- the sanity checks (no self-report, etc.) and idempotent upsert behaviour
-- are always applied.
drop policy if exists "No direct inserts" on public.post_reports;
create policy "No direct inserts"
  on public.post_reports for insert
  with check (false);

-- Only admins can change status / add resolution notes.
drop policy if exists "Admins update" on public.post_reports;
create policy "Admins update"
  on public.post_reports for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- ── Reporting function ──────────────────────────────────────────────────────
create or replace function public.report_post(
  p_post_id    uuid,
  p_reason     text,
  p_details    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_post_owner uuid;
  v_existing   uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- Validate the reason against the allowed taxonomy. Keeps the moderation
  -- queue groupable and prevents free-text junk from drowning real reports.
  if p_reason not in (
    'spam',         -- promotional / repeated content
    'harassment',   -- personal attack / abuse
    'misleading',   -- price manipulation, fake claims
    'illegal',      -- regulated advice, fraud
    'off_topic',    -- not about finance / community
    'other'
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_reason');
  end if;

  if p_details is not null and length(p_details) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'details_too_long');
  end if;

  -- Reject self-reports — there's no constructive case for reporting your
  -- own post; almost always spam against the queue.
  select user_id into v_post_owner
    from posts
    where id = p_post_id;

  if v_post_owner is null then
    return jsonb_build_object('ok', false, 'error', 'post_not_found');
  end if;
  if v_post_owner = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'cannot_self_report');
  end if;

  -- Idempotent upsert: a user re-reporting the same post just updates their
  -- existing row (refreshes reason/details) without creating duplicates.
  insert into post_reports (post_id, reporter_id, reason, details)
    values (p_post_id, v_user_id, p_reason, p_details)
    on conflict (post_id, reporter_id)
    do update set
      reason     = excluded.reason,
      details    = excluded.details,
      created_at = now(),
      -- Re-open a previously-dismissed report when the same user re-files
      status     = 'pending'
    returning id into v_existing;

  return jsonb_build_object('ok', true, 'report_id', v_existing);

exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'db_error', 'detail', sqlerrm);
end;
$$;

revoke all on function public.report_post(uuid, text, text) from public;
grant execute on function public.report_post(uuid, text, text) to authenticated;

-- ============================================================================
-- IF profiles.is_admin DOESN'T EXIST YET, run this once first:
--   alter table public.profiles add column if not exists is_admin boolean not null default false;
--   create index if not exists profiles_admin_idx on public.profiles (is_admin) where is_admin = true;
-- ============================================================================
--
-- ROLLBACK (only if you want to drop everything):
--   drop function if exists public.report_post(uuid, text, text);
--   drop table if exists public.post_reports;
-- ============================================================================

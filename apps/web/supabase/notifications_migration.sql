-- ============================================================
--  TSUA — Notifications Migration
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in (
    'new_follower', 'post_liked', 'post_reply', 'alert_triggered', 'mention'
  )),
  title       text not null,
  body        text,
  link        text,                        -- e.g. /he/profile/user or /he/stocks/TEVA
  actor_id    uuid references public.profiles(id) on delete set null,
  is_read     boolean default false,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users view own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
create policy "System insert notifications"
  on public.notifications for insert with check (true);

create index if not exists notifications_user_id_idx   on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);
create index if not exists notifications_unread_idx     on public.notifications(user_id, is_read) where is_read = false;

-- ── Trigger: notify on new follow ───────────────────────────
create or replace function public.handle_new_follow_notification()
returns trigger language plpgsql security definer as $$
declare
  actor_name text;
begin
  select coalesce(display_name, username) into actor_name
  from public.profiles where id = new.follower_id;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    new.following_id,
    'new_follower',
    actor_name || ' התחיל לעקוב אחריך',
    null,
    '/he/profile/' || (select username from public.profiles where id = new.follower_id),
    new.follower_id
  );
  return new;
end;
$$;

drop trigger if exists on_new_follow_notification on public.follows;
create trigger on_new_follow_notification
  after insert on public.follows
  for each row execute procedure public.handle_new_follow_notification();

-- ── Trigger: notify on like ──────────────────────────────────
create or replace function public.handle_new_like_notification()
returns trigger language plpgsql security definer as $$
declare
  actor_name   text;
  post_author  uuid;
  post_body    text;
begin
  select coalesce(display_name, username) into actor_name
  from public.profiles where id = new.user_id;

  select author_id, substring(body, 1, 60) into post_author, post_body
  from public.posts where id = new.post_id;

  -- Don't notify if liking own post
  if post_author = new.user_id then return new; end if;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    post_author,
    'post_liked',
    actor_name || ' אהב את הפוסט שלך',
    post_body,
    null,
    new.user_id
  );
  return new;
end;
$$;

drop trigger if exists on_new_like_notification on public.likes;
create trigger on_new_like_notification
  after insert on public.likes
  for each row execute procedure public.handle_new_like_notification();

-- ── Trigger: notify on reply ─────────────────────────────────
create or replace function public.handle_new_reply_notification()
returns trigger language plpgsql security definer as $$
declare
  actor_name   text;
  post_author  uuid;
begin
  if new.parent_id is null then return new; end if;

  select coalesce(display_name, username) into actor_name
  from public.profiles where id = new.author_id;

  select author_id into post_author
  from public.posts where id = new.parent_id;

  if post_author = new.author_id then return new; end if;

  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    post_author,
    'post_reply',
    actor_name || ' הגיב לפוסט שלך',
    substring(new.body, 1, 60),
    null,
    new.author_id
  );
  return new;
end;
$$;

drop trigger if exists on_new_reply_notification on public.posts;
create trigger on_new_reply_notification
  after insert on public.posts
  for each row execute procedure public.handle_new_reply_notification();

-- Enable Realtime for notifications
alter publication supabase_realtime add table public.notifications;

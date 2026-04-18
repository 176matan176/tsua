-- ============================================================
--  TSUA — Wave 4 Migration
--  Alerts engine, Web Push, Email, Referrals
-- ============================================================

-- ── Push subscriptions (Web Push via VAPID) ─────────────────
create table if not exists public.push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz default now(),
  last_used_at timestamptz
);

alter table public.push_subscriptions enable row level security;
create policy "Users view own push subs"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users manage own push subs"
  on public.push_subscriptions for all using (auth.uid() = user_id);
create policy "Service inserts push subs"
  on public.push_subscriptions for insert with check (true);

create index if not exists push_subs_user_id_idx on public.push_subscriptions(user_id);

-- ── Alert events log (audit trail for triggered alerts) ─────
create table if not exists public.alert_events (
  id             uuid primary key default uuid_generate_v4(),
  alert_id       uuid not null references public.alerts(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  ticker         text not null,
  event_type     text not null,                -- price_above | price_below | volume_spike | news
  trigger_value  numeric,                      -- actual value that crossed threshold
  threshold      numeric,                      -- the threshold that was set
  message        text,
  delivered_push boolean default false,
  delivered_mail boolean default false,
  created_at     timestamptz default now()
);

alter table public.alert_events enable row level security;
create policy "Users view own alert events"
  on public.alert_events for select using (auth.uid() = user_id);
create policy "Service manages alert events"
  on public.alert_events for all using (true);

create index if not exists alert_events_user_id_idx  on public.alert_events(user_id, created_at desc);
create index if not exists alert_events_alert_id_idx on public.alert_events(alert_id);

-- ── Extend alerts table: cooldown + last_price snapshot ─────
alter table public.alerts
  add column if not exists cooldown_until timestamptz,
  add column if not exists last_price     numeric,
  add column if not exists notify_push    boolean default true,
  add column if not exists notify_email   boolean default true;

-- ── Profile extension: email preferences + referral code ────
alter table public.profiles
  add column if not exists email_alerts        boolean default true,
  add column if not exists email_digest        boolean default true,
  add column if not exists email_marketing     boolean default false,
  add column if not exists referral_code       text unique,
  add column if not exists referred_by         uuid references public.profiles(id) on delete set null,
  add column if not exists referral_credits    integer default 0;

-- Auto-generate referral code on new profile
create or replace function public.generate_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := lower(regexp_replace(coalesce(new.username, 'user'), '[^a-z0-9]', '', 'g')) ||
                         substr(md5(new.id::text), 1, 4);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_referral_code on public.profiles;
create trigger trg_generate_referral_code
  before insert on public.profiles
  for each row execute procedure public.generate_referral_code();

-- Back-fill existing users without a referral code
update public.profiles
set referral_code = lower(regexp_replace(coalesce(username, 'user'), '[^a-z0-9]', '', 'g')) ||
                    substr(md5(id::text), 1, 4)
where referral_code is null;

-- ── Referrals table (tracks actual conversions + rewards) ───
create table if not exists public.referrals (
  id            uuid primary key default uuid_generate_v4(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referred_id   uuid not null references public.profiles(id) on delete cascade,
  code_used     text not null,
  credit_awarded integer default 1,
  created_at    timestamptz default now(),
  unique (referred_id)
);

alter table public.referrals enable row level security;
create policy "Users view own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);
create policy "Service inserts referrals"
  on public.referrals for insert with check (true);

create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

-- Award credit to referrer when referral is created
create or replace function public.handle_referral_credit()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
  set referral_credits = coalesce(referral_credits, 0) + new.credit_awarded
  where id = new.referrer_id;

  -- Notification for referrer
  insert into public.notifications (user_id, type, title, body, link, actor_id)
  values (
    new.referrer_id,
    'new_follower',
    'חבר חדש הצטרף דרך ההזמנה שלך 🎉',
    'קיבלת נקודת זיכוי.',
    null,
    new.referred_id
  );
  return new;
end;
$$;

drop trigger if exists trg_referral_credit on public.referrals;
create trigger trg_referral_credit
  after insert on public.referrals
  for each row execute procedure public.handle_referral_credit();

-- ── Done ────────────────────────────────────────────────────

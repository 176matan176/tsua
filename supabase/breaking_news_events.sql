-- ============================================================
--  TSUA — Breaking News (חדשות מתפרצות) — events log
--  אידמפוטנטי: בטוח להרצה חוזרת ב-SQL Editor של Supabase.
--
--  משמש את /api/cron/breaking-news:
--   - דדופ קשיח לפי source_id (מזהה Finnhub)
--   - היסטוריית התראות שנשלחו (הקשר לדדופ סמנטי של Claude)
--   - בסיס לפיד "חדשות מתפרצות" עתידי בפרונט
-- ============================================================

create table if not exists public.breaking_news_events (
  id            bigint generated always as identity primary key,
  source_id     text        not null unique,   -- Finnhub news id
  headline      text        not null,
  summary       text,
  source        text,
  url           text,
  published_at  timestamptz,
  market_moving boolean     not null default false,
  severity      int,
  duplicate     boolean     not null default false,
  alert_he      text,                          -- ההתראה בעברית שנוצרה ע"י ה-AI
  tickers       text[]      not null default '{}',
  pushed        boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.breaking_news_events enable row level security;

-- קריאה פתוחה (לפיד עתידי); כתיבה — service role בלבד (אין policies לכתיבה)
do $$ begin
  create policy "Breaking news readable by all"
    on public.breaking_news_events for select using (true);
exception when duplicate_object then null; end $$;

create index if not exists breaking_news_created_idx
  on public.breaking_news_events (created_at desc);
create index if not exists breaking_news_pushed_idx
  on public.breaking_news_events (pushed) where pushed;

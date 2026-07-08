# tsua (תשואה) — Israeli social network for the stock market

Hebrew-first (RTL) Next.js 14 app. Monorepo: the live app is `apps/web`
(App Router, Tailwind, Supabase). `apps/api` is a RETIRED Express backend —
its Railway deployment is gone; do not wire anything to it.

## ⚠️ Deploying — the #1 trap in this repo

**`git push` does NOT deploy. There is no GitHub→Vercel integration.**
Production once sat 66 days stale while everyone pushed to master.

```bash
cd <repo root> && vercel --prod --yes   # THE deploy command
```

- Deploy from the **repo root** (linked to Vercel project `tsua`, aliased to
  https://tsua-rho.vercel.app). `apps/web/.vercel` links to a different,
  wrong project ("web") — never deploy from there.
- Always verify after deploy: fetch the prod HTML, extract the
  `/_next/static/css/*.css` path, grep it for something your change added.
- The app registers a service worker — tell users to hard-refresh
  (Ctrl+Shift+R) after deploys.
- Full procedure: use the `tsua-deploy` skill.

## Theming — never hardcode colors

Theme = `data-theme="dark|light"` on `<html>`, set by a boot script in
`app/[locale]/layout.tsx` (before paint, do not touch). All colors flow from
CSS variables in `app/[locale]/globals.css` (two palette blocks) through
Tailwind `tsua-*` classes (`bg-tsua-card`, `text-tsua-text`, …).

Rules learned the hard way (a 1,576-replacement migration cleaned this up):
- **Never** write literal colors (`#0d1424`, `rgba(0,229,176,…)`, `text-white`,
  `bg-slate-900`) in components. Use `var(--token)` or `tsua-*` classes.
- Alpha variants: `rgb(var(--rgb-accent) / 0.15)` — triplets defined in
  globals.css.
- JS-computed colors (charts, heatmaps) must also return `var(--token)`
  strings — inline styles accept them.
- When fixing light mode, dark mode must stay pixel-identical: in dark the
  tokens resolve to the original literals by design.
- Intentionally fixed colors (OG images `app/api/og/*`, chart series,
  ThemeToggle art): leave them; do not "fix".
- Relative-time strings rendered during SSR need `suppressHydrationWarning`.

## Supabase — schema truth (code once drifted, breaking prod)

`profiles` real columns: `id, username, display_name, bio, avatar_url,
is_verified, rating, accuracy, total_predictions, correct_predictions,
win_streak, followers_count, following_count, created_at`.

- It's `followers_count` / `following_count` — NOT `followers`/`following`.
- There is **no `post_count` column** — compute with a head-only count query.
- `accuracy` / `total_predictions` exist but are **never populated** (all 0).
  Don't surface them as real data; leaderboard uses engagement instead.
- Client components expect mapped keys (`followers`, `post_count`) — map in
  the API route, don't rename client fields.
- A wrong column name fails the whole select → routes 404/500 silently.
  After changing any query, use the `tsua-schema-check` skill.
- Env note: `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` has a literal `\n`
  inside the quotes; it works, but don't copy the pattern.

## Prices / realtime

Live prices poll the internal `/api/stocks/batch` route (Finnhub + Yahoo
fallback). The socket.io path activates ONLY if `NEXT_PUBLIC_WS_URL` is set —
it is intentionally unset; the old value pointed at the dead Railway app and
burned 10 failed handshakes per visitor. Don't reintroduce those env vars.

## New pages / components checklist

- Pages live under `src/app/[locale]/<name>/page.tsx`; Hebrew is RTL —
  the layout sets `dir` from locale.
- RTL gotcha: an element wider than its container anchors to the RIGHT in
  RTL and overflows LEFT. For marquee/scroll strips, anchor explicitly
  (see `.market-scroll { float: left }` in globals.css).
- API routes: copy the `createSupabase()` pattern from
  `app/api/profile/me/route.ts`; add `export const dynamic = 'force-dynamic'`.
- Icon-only buttons need Hebrew `aria-label`s (Israeli accessibility law).
- Skeleton/loading states use `animate-pulse` with token backgrounds.
- News list keys: never key by array index or a URL prefix — gnews ids once
  collided because base64("https://…").slice(0,10) is identical for all links.

## Dev environment

- Dev server: `.claude/launch.json` → "Tsua Frontend (Next.js)", port 3000.
  It dies frequently mid-session; restart via preview_start and get a fresh
  server id. Type-check with `cd apps/web && npx tsc --noEmit`.
- **No automated tests exist.** Verify changes live: `tsua-audit` skill
  (contrast scanner both themes + console + API probes) before deploying.
- Terminal cannot reach Supabase directly (sandbox) — probe REST via the
  browser preview instead.
- Git auth: Windows Credential Manager works (`git push origin master` is
  fine). Never embed tokens in the remote URL — a leaked `ghp_` token
  lived there once.

## Production health

Quick end-to-end check of the live site: `tsua-health` skill.
Known open item: username content policy (an offensive username exists;
owner decision pending).

---
name: tsua-schema-check
description: Use when adding or changing Supabase queries in tsua, or when an API route unexpectedly returns 500/404 or empty data — column names in code may not match the real database schema.
---

# tsua Supabase schema check

## Overview

Code once selected `followers, following, post_count` from `profiles` —
none of which exist. One wrong column fails the ENTIRE select, so every
profile page 404'd and user search returned `[]` for weeks (observed).
PostgREST doesn't partially succeed: verify columns before shipping queries.

## Getting the real schema

The sandboxed terminal cannot reach Supabase — probe from the **browser
preview** instead (dev server running, any app page open):

```js
// preview_eval — anon key from apps/web/.env.local
(async () => {
  const KEY = '<NEXT_PUBLIC_SUPABASE_ANON_KEY>';
  const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  const t = await fetch('https://sekfpbcflionqnltppwi.supabase.co/rest/v1/profiles?select=*&limit=1', { headers: H }).then(r => r.json());
  return t[0] ? Object.keys(t[0]) : t; // real column names
})()
```

Swap the table name to inspect `posts`, `follows`, `bookmarks`, `alerts`, …
Then grep code for `.select(` / `.from('<table>')` and compare every column.

## Known truth (verified 2026-07-07)

| Table | Gotchas |
|-------|---------|
| `profiles` | `followers_count`, `following_count` (NOT followers/following); **no post_count** — count posts instead; `accuracy`/`total_predictions` exist but are all 0 (feature never ran) |
| `posts` | `author_id, sentiment, stock_mentions[], like_count, reply_count, repost_count, parent_id, created_at`; join via `profiles!author_id (…)` |
| `follows` | `follower_id`, `following_id` |

## Common mistakes

- Trusting an existing route's select as schema documentation — broken
  selects fail silently as 404/"no results", so working-looking code lies.
- Renaming client-side fields to match DB columns — clients expect mapped
  keys (`followers`, `post_count`); map inside the API route instead.
- Probing Supabase with `curl` from the terminal and concluding it's down —
  the sandbox blocks it (HTTP 000); only the browser path works.

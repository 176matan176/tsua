---
name: tsua-health
description: Use when checking whether tsua production is healthy — after a deploy, after Supabase or env changes, or when a user reports the site or a feature (leaderboard, profiles, search, prices) is down or empty.
---

# tsua production health check

## Overview

End-to-end probe of https://tsua-rho.vercel.app. Baseline failure (observed):
leaderboard, all profile pages, and user search were broken in production
for weeks with nobody noticing — pages rendered, only their data calls died.
Checking "the site loads" is not a health check.

## Probes

```bash
B=https://tsua-rho.vercel.app
curl -s -o /dev/null -w "site: %{http_code}\n" $B
curl -s "$B/api/leaderboard?period=30d&category=all" | head -c 120   # expect JSON array
curl -s -o /dev/null -w "profile: %{http_code}\n" "$B/api/profile/yakov362"  # expect 200
curl -s "$B/api/search?q=yak&type=users" | head -c 150               # expect users:[...]
curl -s -o /dev/null -w "stocks: %{http_code}\n" "$B/api/stocks/hot"
curl -s -o /dev/null -w "news: %{http_code}\n"   "$B/api/news"
curl -s -o /dev/null -w "sectors: %{http_code}\n" "$B/api/sectors/heatmap"
```

Healthy = all 200 **and** the JSON bodies are non-empty arrays/objects
(a 200 with `[]` from leaderboard on 30d may just mean a quiet month —
cross-check with `period=all` before declaring breakage).

## If something fails

| Symptom | First suspect |
|---------|---------------|
| Route 500 | Supabase column drift — use `tsua-schema-check` |
| Route 404 (page HTML) | Route file missing from build / wrong path |
| Empty users/search | profiles select broke (column names) |
| Prices stuck as skeletons | `/api/stocks/batch` or Finnhub key |
| Fix deployed but still broken | Deploy didn't take — use `tsua-deploy` verify step |

## Common mistakes

- Testing only the homepage status — data APIs fail independently of pages.
- Probing endpoints that never existed (`/api/market/indices`) and
  reporting them as regressions — check the route exists in `src/app/api/`.

---
name: tsua-deploy
description: Use when deploying tsua to production, releasing changes to the live site, or when a change was committed/pushed but is not visible on tsua-rho.vercel.app.
---

# Deploying tsua to production

## Overview

**`git push` does NOT deploy — there is no GitHub→Vercel integration.**
Baseline failure (observed): production sat 66 days stale while commits
landed on master and everyone assumed they were live.

## Procedure

```bash
# 1. Type-check (no test suite exists — this is the only gate)
cd apps/web && npx tsc --noEmit

# 2. Commit + push (version control only; does NOT deploy)
git add <files> && git commit -m "..." && git push origin master

# 3. DEPLOY — from repo root, never from apps/web
cd <repo root> && vercel --prod --yes

# 4. VERIFY the live site actually serves the change
CSS=$(curl -s https://tsua-rho.vercel.app | grep -oE '/_next/static/css/[^"]+\.css' | head -1)
curl -s "https://tsua-rho.vercel.app$CSS" | grep -c "<something-your-change-added>"
```

For JS changes, grep a layout/page chunk instead of CSS. A new build always
gets a new asset hash — same hash as before = deploy didn't take.

## Quick reference

| Fact | Value |
|------|-------|
| Deploy command | `vercel --prod --yes` from **repo root** |
| Vercel project | `tsua` → alias tsua-rho.vercel.app |
| Wrong project | `apps/web/.vercel` links to "web" — never deploy there |
| After deploy | Users need hard refresh (service worker caches) |

## Common mistakes

- **"Pushed to master, so it's deployed"** — it is not. Run step 3.
- Declaring success after `vercel` says "Ready" without step 4 — the alias
  can lag or the change may not be in the build. Verify against the domain.
- Deploying from `apps/web/` — hits the wrong Vercel project.
- Skipping the hard-refresh warning — the SW serves stale HTML to the user,
  who then reports "nothing changed".

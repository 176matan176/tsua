---
name: tsua-audit
description: Use after UI, theme, or CSS changes in tsua, or when a user reports faded/unreadable text, wrong colors in light or dark mode, console errors, or "something looks off" without specifics.
---

# tsua UI & runtime audit

## Overview

Systematic sweep of every page in both themes. Baseline failure (observed):
ad-hoc eyeballing missed neon-on-cream text (contrast 1.33), 172 console
error lines, and hydration failures — the scripted sweep found all of them
in one pass.

## Procedure

1. Start the dev server (launch config "Tsua Frontend (Next.js)"), navigate
   the preview to `http://localhost:3000/`.
2. Set theme: `localStorage.setItem('tsua-theme','light')` + reload.
3. On each page, run [scanner.js](scanner.js) via `preview_eval` — it walks
   every text node, computes WCAG contrast against the effective background,
   and returns offenders (ratio < 2.6) with color/element samples.
4. Page list: `/` `/markets` `/news` `/hot` `/crypto` `/sectors`
   `/leaderboard` `/stocks/TEVA` `/login`.
5. Repeat the sweep with `tsua-theme` = `dark`.
6. `preview_console_logs` (level: error) — expect **zero**; hydration
   warnings and duplicate-key warnings are real bugs here, not noise.
7. Probe the data APIs (list in `tsua-health`) from the page context.

## Interpreting results

| Finding | Likely cause |
|---------|--------------|
| Dark-palette color in light mode | Hardcoded literal missed by tokens — fix at source, see CLAUDE.md theming rules |
| Same offender across pages | Shared component/JS-computed color (heatmap, gauge) |
| Text ratio 2.6–4.5 | Borderline — judgment call, note it |
| Element with gradient background flagged | Scanner sees only backgroundColor — verify manually before "fixing" |

## Common mistakes

- Trusting geometry/layout measurements when the preview tab is hidden —
  check `document.documentElement.clientWidth > 0` first; a 0-width viewport
  fabricates overflow findings.
- Fixing dark-mode colors while fixing light — dark must stay identical;
  route fixes through tokens that resolve to the old dark values.
- Screenshot-based color checks — use computed styles; screenshots time out
  on hidden tabs and lie about exact colors.

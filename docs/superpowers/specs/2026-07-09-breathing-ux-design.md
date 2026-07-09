# Breathing UX — "Alive" mode for tsua

**Date:** 2026-07-09 · **Status:** Approved by owner (intensity level "alive"
chosen from live mockups) · **Rollback requirement:** single-switch revert.

## Goal

Make tsua feel alive like trading apps (Yahoo Finance / Robinhood): prices
visibly tick, changes flash, live indicators breathe — while social/text
content stays calm and readable.

## Non-goals

- No changes to polling cadence or data layer (PriceContext already polls
  every 2s in market hours and exposes `flash: 'up' | 'down' | null`).
- No new JS timers/intervals; the visual layer rides existing flash state.
- No motion on post bodies or feed text content.
- No layout movement of any kind (zero CLS).
- No user-facing settings toggle (future idea, out of scope).

## Master switch (the rollback mechanism)

- `src/lib/breathe.ts` exports `export const BREATHE: 'on' | 'off' = 'on'`.
- `app/[locale]/layout.tsx` renders `<html data-breathe={BREATHE}>` (SSR —
  no hydration flicker).
- **Every** new style rule is scoped under `[data-breathe="on"]` inside a
  single clearly-delimited block in `globals.css` (`/* ── breathe layer ── */`).
- The entire layer is additionally wrapped in
  `@media (prefers-reduced-motion: no-preference)` — OS-level "reduce
  motion" users get today's behavior automatically.
- **Rollback = flip `BREATHE` to `'off'` + redeploy (tsua-deploy).** With the
  attribute off, added class names match no rules and behavior is exactly
  today's. Git revert remains the secondary path.

## What breathes (scope)

Components get inert class hooks (e.g. `breathe-flash-up`, `breathe-pop`,
`breathe-dot`, `breathe-card`); all visual behavior lives in the CSS layer.
Existing inline flash styles stay untouched (they are today's behavior and
the fallback when the switch is off). Where both would tint a background,
the CSS layer only adds what inline styles don't already do (pop/glow), to
avoid double-tinting.

| Hook | Applied to | Effect (under data-breathe=on) |
|------|-----------|--------------------------------|
| `breathe-flash-up/down` | Price rows/cells lacking flash visuals today: HotStocks, TrendingStocks, MarketSummary, CurrencyRates, CryptoGrid, HotStocksWidget, StockHeader price | Background tint pulse `rgb(var(--rgb-accent)/.16)` (up) / `rgb(var(--rgb-red)/.16)` (down), ~1.2s ease-out, triggered by existing `flash` state |
| `breathe-pop` | The price `<span>` in the same components + LiveMarketBar | `transform: scale(1.12)` pop, ~0.5s, on flash |
| `breathe-dot` | All LIVE indicator dots (Navbar, LiveMarketBar "שוק", crypto 24/7) | Unified 1.6s opacity/scale pulse + small glow |
| `breathe-card` | Market widget cards only (markets page widgets, sidebar market widgets) | 4s box-shadow inhale/exhale, very subtle (`rgb(var(--rgb-accent)/.07)` peak) |
| `breathe-shimmer` | Loading skeletons | Flowing shimmer (existing `shimmer` keyframes) instead of static pulse |

Token-based colors only → correct in dark AND light; light-mode contrast must
pass the tsua-audit scanner (tint alphas ≤ .16 over card backgrounds).

## Performance constraints

- Animate only `opacity`, `transform`, `background-color`, and (sparingly,
  breathe-card only) `box-shadow`.
- Browsers freeze CSS animations in hidden tabs (verified in this project).
- No JS added beyond conditional class names on existing flash state.

## Error handling

No price data / no flash state → hooks stay inert, nothing animates —
graceful degradation is inherent (class with no trigger = static).

## Verification

1. `cd apps/web && npx tsc --noEmit`
2. tsua-audit: contrast scan light+dark on `/`, `/markets`, `/stocks/TEVA`,
   `/crypto` (flash tints active), console errors = 0.
3. Manual: watch LiveMarketBar + HotStocks during polling; toggle
   `BREATHE='off'` locally and confirm exact-today behavior returns.
4. Deploy via tsua-deploy; verify `data-breathe="on"` present in prod HTML
   and the breathe layer exists in the prod CSS.

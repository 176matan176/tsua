# Breathing UX ("Alive" mode) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tsua's market surfaces visibly "breathe" (price flashes, number pops, pulsing LIVE dots, card glow, skeleton shimmer) behind a single `data-breathe` switch that rolls back to today's exact behavior.

**Architecture:** One config constant → `data-breathe` attribute on `<html>` (SSR). All new visuals are CSS rules scoped under `[data-breathe="on"]` inside one delimited block in `globals.css`, wrapped in `@media (prefers-reduced-motion: no-preference)`. Components only gain inert class-name hooks driven by the EXISTING `flash` state from PriceContext — zero new timers, zero data-layer changes.

**Tech Stack:** Next.js 14 App Router, Tailwind + CSS variables (tsua token system), existing PriceContext flash mechanism.

**Spec:** `docs/superpowers/specs/2026-07-09-breathing-ux-design.md`

**Approved deviations from spec** (self-review findings): CryptoGrid and HotStocksWidget render REST prices with **no flash state**, so flash/pop hooks there would be permanently inert dead code — they are excluded from v1 (spec's "hooks stay inert" clause makes this a no-op either way). CurrencyRates similarly has no flash state → gets `breathe-dot` + `breathe-shimmer` only.

**Testing note:** The repo has no test runner. "Tests" in this plan are the spec's verification commands (tsc, in-browser assertions via preview_eval, contrast scanner). Each task states its verification and expected output.

---

### Task 1: Master switch

**Files:**
- Create: `apps/web/src/lib/breathe.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx` (the `<html …>` tag, ~line 100)

- [ ] **Step 1: Create the config file**

```ts
// apps/web/src/lib/breathe.ts
/**
 * Master switch for the "breathing" (alive-mode) visual layer.
 * 'on'  → <html data-breathe="on"> and the CSS layer in globals.css applies.
 * 'off' → attribute renders "off", every breathe-* class matches no rule,
 *         and the site behaves EXACTLY as before this feature. This is the
 *         one-line rollback required by the spec.
 */
export const BREATHE: 'on' | 'off' = 'on';
```

- [ ] **Step 2: Render the attribute in layout.tsx**

Add the import at the top of `apps/web/src/app/[locale]/layout.tsx`:

```tsx
import { BREATHE } from '@/lib/breathe';
```

Change the `<html>` tag (keep every existing attribute exactly as-is, add only `data-breathe`):

```tsx
<html lang={locale} dir={dir} data-breathe={BREATHE} suppressHydrationWarning>
```

(If the current tag has no `suppressHydrationWarning`, keep whatever it has and only add `data-breathe={BREATHE}`.)

- [ ] **Step 3: Verify**

Run: `cd apps/web && npx tsc --noEmit` → expect exit 0.
Start the dev server, then in preview_eval:
`document.documentElement.getAttribute('data-breathe')` → expect `"on"`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/breathe.ts "apps/web/src/app/[locale]/layout.tsx"
git commit -m "feat(breathe): data-breathe master switch on <html>"
```

---

### Task 2: CSS breathe layer

**Files:**
- Modify: `apps/web/src/app/[locale]/globals.css` (append at end of file)

- [ ] **Step 1: Append the complete layer**

```css
/* ═══════════════ breathe layer — alive-mode visuals ═══════════════
   Every rule here is gated on <html data-breathe="on"> (set from
   src/lib/breathe.ts). Flip the constant to 'off' to restore pre-feature
   behavior exactly. Spec: docs/superpowers/specs/2026-07-09-breathing-ux-design.md */
@media (prefers-reduced-motion: no-preference) {

  @keyframes breatheFlashUp {
    0%   { background-color: rgb(var(--rgb-accent) / 0.16); }
    100% { background-color: transparent; }
  }
  @keyframes breatheFlashDown {
    0%   { background-color: rgb(var(--rgb-red) / 0.16); }
    100% { background-color: transparent; }
  }
  @keyframes breathePop {
    0%   { transform: scale(1); }
    35%  { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  @keyframes breatheDot {
    0%, 100% { opacity: 1;   transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes breatheCard {
    0%, 100% { box-shadow: 0 0 0 rgb(var(--rgb-accent) / 0); }
    50%      { box-shadow: 0 0 14px rgb(var(--rgb-accent) / 0.07); }
  }
  @keyframes breatheShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Transient — applied only while PriceContext flash state is set */
  [data-breathe="on"] .breathe-flash-up   { animation: breatheFlashUp 1.2s ease-out; border-radius: 6px; }
  [data-breathe="on"] .breathe-flash-down { animation: breatheFlashDown 1.2s ease-out; border-radius: 6px; }
  [data-breathe="on"] .breathe-pop        { display: inline-block; animation: breathePop 0.5s ease-out; }

  /* Persistent ambience */
  [data-breathe="on"] .breathe-dot  { animation: breatheDot 1.6s ease-in-out infinite; box-shadow: 0 0 6px rgb(var(--rgb-accent) / 0.7); }
  [data-breathe="on"] .breathe-card { animation: breatheCard 4s ease-in-out infinite; }
  [data-breathe="on"] .breathe-shimmer {
    background-image: linear-gradient(90deg, transparent 30%, rgb(var(--rgb-text) / 0.07) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: breatheShimmer 1.6s linear infinite;
  }
}
/* ═══════════════ end breathe layer ═══════════════ */
```

- [ ] **Step 2: Verify inert**

Dev server: pages render identically (no element has the classes yet).
preview_eval: `[...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.cssText.includes('breatheFlashUp')); } catch { return false; } })` → `true`.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/[locale]/globals.css"
git commit -m "feat(breathe): scoped CSS layer (flash/pop/dot/card/shimmer)"
```

---

### Task 3: LiveMarketBar hooks (pop + dot + shimmer)

**Files:**
- Modify: `apps/web/src/components/layout/LiveMarketBar.tsx`

- [ ] **Step 1: Price pop.** In `TickerItem`, the price span currently reads:

```tsx
<span
  className="text-xs font-black font-mono transition-colors duration-300 tabular-nums"
  style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
>
```

Change the className to append the transient pop hook:

```tsx
<span
  className={`text-xs font-black font-mono transition-colors duration-300 tabular-nums ${live.flash ? 'breathe-pop' : ''}`}
  style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
>
```

- [ ] **Step 2: Skeleton shimmer.** The loading placeholder currently reads:

```tsx
<div className="w-14 h-3 rounded animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
```

Change to:

```tsx
<div className="w-14 h-3 rounded animate-pulse breathe-shimmer" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
```

- [ ] **Step 3: "שוק" dot.** The fixed label dot currently reads:

```tsx
<span
  className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 me-1.5"
  style={{ background: 'var(--accent)', boxShadow: '0 0 6px rgb(var(--rgb-accent) / 0.8)' }}
/>
```

Change className to `"w-1.5 h-1.5 rounded-full breathe-dot shrink-0 me-1.5"` (breathe-dot replaces animate-pulse under the gate; keep the element's inline styles).
⚠️ Keep `animate-pulse` OFF this element only if `data-breathe` is on? No — CSS can't know. Instead append: `className="w-1.5 h-1.5 rounded-full animate-pulse breathe-dot shrink-0 me-1.5"`. Under the gate, `breathe-dot`'s animation shorthand overrides `animate-pulse` (later stylesheet position); with the gate off, `animate-pulse` behaves as today.

- [ ] **Step 4: Verify**

Dev server during polling (market hours or wait for a flash): price spans briefly scale; dot pulses with glow; skeletons shimmer on first load.
preview_eval sanity: `document.querySelectorAll('.breathe-dot').length >= 1` → true.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/LiveMarketBar.tsx
git commit -m "feat(breathe): LiveMarketBar pop + dot + shimmer hooks"
```

---

### Task 4: HotStocks + TrendingStocks flash & pop

**Files:**
- Modify: `apps/web/src/components/markets/HotStocks.tsx:89-93`
- Modify: `apps/web/src/components/stocks/TrendingStocks.tsx:53-58`

- [ ] **Step 1: HotStocks.** The live price div currently reads (lines ~89-93):

```tsx
<div
  className="text-sm font-black font-mono tabular-nums"
  style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
  dir="ltr"
>
```

Change className to add the transient bg-flash + pop:

```tsx
<div
  className={`text-sm font-black font-mono tabular-nums px-1 ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
  style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text2)' }}
  dir="ltr"
>
```

- [ ] **Step 2: TrendingStocks.** Same transformation on its price div (lines ~53-58, className `"text-sm font-black font-mono tabular-nums transition-colors duration-300"`): append the identical conditional string.

- [ ] **Step 3: Verify**

`/markets` and a stock page sidebar during polling: price cells tint green/red and pop on change.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/markets/HotStocks.tsx apps/web/src/components/stocks/TrendingStocks.tsx
git commit -m "feat(breathe): flash+pop on HotStocks and TrendingStocks prices"
```

---

### Task 5: MarketSummary flash/pop + StockHeader pop

**Files:**
- Modify: `apps/web/src/components/stocks/MarketSummary.tsx:74-83`
- Modify: `apps/web/src/components/stocks/StockHeader.tsx` (price element near the `flashStyle` const, ~line 264)

- [ ] **Step 1: MarketSummary.** The live price div (lines 74-83) gets the same conditional as Task 4:

```tsx
<div
  dir="ltr"
  className={`text-lg font-black font-mono tracking-tight tabular-nums transition-colors duration-300 px-1 ${live.flash === 'up' ? 'breathe-flash-up breathe-pop' : live.flash === 'down' ? 'breathe-flash-down breathe-pop' : ''}`}
  style={{
    color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text)',
  }}
>
```

- [ ] **Step 2: StockHeader.** It already background-flashes via `flashStyle` (line ~264) — per spec, do NOT add another tint. Locate the main price text element that renders `{price.toFixed(2)}` (the large `font-mono` element inside the container that consumes `flashStyle`) and append only the pop hook to its className:

```tsx
className={`<existing classes unchanged> ${flash ? 'breathe-pop' : ''}`}
```

- [ ] **Step 3: Verify**

Stock page (`/stocks/TEVA`): big price pops on live updates, background tint unchanged from today. MarketSummary widget flashes+pops.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/stocks/MarketSummary.tsx apps/web/src/components/stocks/StockHeader.tsx
git commit -m "feat(breathe): MarketSummary flash+pop, StockHeader pop"
```

---

### Task 6: LIVE dots + remaining skeletons

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx` (two `w-1 h-1 rounded-full animate-pulse` LIVE dots — mobile ~line 311, desktop ~line 348)
- Modify: `apps/web/src/app/[locale]/crypto/page.tsx:23` (24/7 LIVE dot)
- Modify: `apps/web/src/components/markets/CurrencyRates.tsx:115` (updated dot) and `:143` (skeleton)

- [ ] **Step 1:** On each of the four dot elements, append `breathe-dot` to the existing className (keep `animate-pulse` — the gate overrides it, off-mode preserves it). Example (Navbar):

```tsx
<span
  className="w-1 h-1 rounded-full animate-pulse breathe-dot"
  ...unchanged styles...
/>
```

- [ ] **Step 2:** CurrencyRates skeleton (line 143): append `breathe-shimmer`:

```tsx
<div className="w-16 h-4 rounded animate-pulse breathe-shimmer" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
```

- [ ] **Step 3: Verify** — all LIVE dots across the site share the same rhythm; currency skeletons shimmer while loading.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/Navbar.tsx "apps/web/src/app/[locale]/crypto/page.tsx" apps/web/src/components/markets/CurrencyRates.tsx
git commit -m "feat(breathe): unified LIVE dots + currency skeleton shimmer"
```

---

### Task 7: Card glow (breathe-card)

**Files:**
- Modify: `apps/web/src/components/markets/HotStocks.tsx:132` (root card)
- Modify: `apps/web/src/components/stocks/MarketSummary.tsx:20` (root card)

- [ ] **Step 1:** Append `breathe-card` to each root className:

HotStocks (line 132): `className="rounded-2xl overflow-hidden breathe-card"`
MarketSummary (line 20): `className="relative overflow-hidden rounded-2xl p-3.5 cursor-pointer transition-all duration-300 group breathe-card"`

- [ ] **Step 2: Verify** — both cards show a very subtle 4s glow inhale/exhale in dark AND light themes; nothing moves.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/markets/HotStocks.tsx apps/web/src/components/stocks/MarketSummary.tsx
git commit -m "feat(breathe): ambient glow on market cards"
```

---

### Task 8: Full verification (including rollback test)

- [ ] **Step 1:** `cd apps/web && npx tsc --noEmit` → exit 0.
- [ ] **Step 2: Rollback test.** Set `BREATHE = 'off'` in `src/lib/breathe.ts`, reload dev:
  - `document.documentElement.getAttribute('data-breathe')` → `"off"`
  - `document.querySelector('.breathe-dot')` → element exists, and `getComputedStyle(el).animationName` shows the OLD value (`pulse`, from animate-pulse) — NOT `breatheDot`.
  Restore `BREATHE = 'on'`.
- [ ] **Step 3: Contrast + console.** Run the tsua-audit skill scanner (light AND dark) on `/`, `/markets`, `/stocks/TEVA`, `/crypto` → 0 low-contrast offenders; preview_console_logs(error) → empty.
- [ ] **Step 4: Reduced motion.** preview_resize or DevTools emulation not available → verify via CSS: the entire layer is inside the media query (grep globals.css: the block's first line is the `@media` wrapper).
- [ ] **Step 5: Commit any fixes** (`fix(breathe): …`).

---

### Task 9: Deploy

- [ ] **Step 1:** Use the **tsua-deploy** skill: push, `vercel --prod --yes` from repo root.
- [ ] **Step 2:** Verify live: prod HTML contains `data-breathe="on"`; prod CSS contains `breatheFlashUp`.
- [ ] **Step 3:** Remind owner: hard refresh (service worker), and the rollback is `BREATHE='off'` + redeploy.

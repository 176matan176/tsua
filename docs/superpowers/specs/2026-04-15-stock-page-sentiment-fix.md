# Stock Page — SentimentMeter Real Data + Light Mode Fix

**Date:** 2026-04-15
**Scope:** Small, focused — 1 API endpoint + component wiring + CSS var fixes

---

## Problem

1. `SentimentMeter` uses `getMockSentiment()` — fake percentages derived from the ticker's character codes. Useless and misleading.
2. Stock page components (`StockPageClient`, `SentimentMeter`, `StockNews`, `KeyStats`, `CompanyOverview`) use hardcoded dark `rgba()` values instead of CSS variables, so light mode is broken.

---

## Solution

### 1. New API Endpoint: `/api/stocks/[ticker]/sentiment`

**File:** `apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts`

`GET /api/stocks/TEVA/sentiment`

Logic:
- Query Supabase `posts` table using the anon key (server-side)
- Filter: `stock_mentions` array contains `ticker.toUpperCase()`
- Two time windows: last 24h and previous 24h (24–48h ago)
- Count rows grouped by `sentiment` in each window
- Compute `change24h` = (bullish% now) − (bullish% yesterday)

Response shape:
```json
{
  "bullish": 58,
  "bearish": 24,
  "neutral": 18,
  "total": 42,
  "change24h": 5
}
```

Edge cases:
- Zero posts → return `{ bullish: 0, bearish: 0, neutral: 0, total: 0, change24h: 0 }`
- Missing sentiment values (`null`) counted as `neutral`

Cache: `revalidate = 300` (5 min) — sentiment doesn't need to be real-time.

---

### 2. Update `SentimentMeter` Component

**File:** `apps/web/src/components/stocks/SentimentMeter.tsx`

- Remove `getMockSentiment()` function
- `useEffect` fetches `/api/stocks/${ticker}/sentiment`
- Show skeleton while loading
- Show "אין מספיק נתונים" state when `total === 0`
- Replace hardcoded dark colors with CSS variables:
  - `rgba(15,25,41,0.7)` → `var(--card)`
  - `rgba(26,40,64,0.8)` → `var(--border)`

---

### 3. CSS Variable Fixes in Stock Components

Replace all hardcoded dark `rgba` values with CSS vars in:

| File | Replace | With |
|------|---------|------|
| `StockPageClient.tsx` | `rgba(15,25,41,0.6)` | `var(--surface2)` |
| `StockPageClient.tsx` | `rgba(26,40,64,0.8)` | `var(--border)` |
| `SentimentMeter.tsx` | `rgba(15,25,41,0.7)` | `var(--card)` |
| `SentimentMeter.tsx` | `rgba(26,40,64,0.8)` | `var(--border)` |
| `StockNews.tsx` | dark hardcoded backgrounds | `var(--card)`, `var(--border)` |
| `KeyStats.tsx` | dark hardcoded backgrounds | `var(--card)`, `var(--border)`, `var(--surface2)` |
| `CompanyOverview.tsx` | dark hardcoded backgrounds | `var(--card)`, `var(--border)` |

---

## Files Changed

```
apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts   ← NEW
apps/web/src/components/stocks/SentimentMeter.tsx          ← UPDATE
apps/web/src/app/[locale]/stocks/[ticker]/StockPageClient.tsx ← UPDATE (CSS vars)
apps/web/src/components/stocks/StockNews.tsx               ← UPDATE (CSS vars)
apps/web/src/components/stocks/KeyStats.tsx                ← UPDATE (CSS vars)
apps/web/src/components/stocks/CompanyOverview.tsx         ← UPDATE (CSS vars)
```

---

## Out of Scope

- Push notifications for price alerts (separate feature)
- Real-time sentiment updates via WebSocket (overkill for now, 5min cache is fine)
- Adding more stock page sections

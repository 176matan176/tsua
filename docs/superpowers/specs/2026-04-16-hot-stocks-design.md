# Hot Stocks Feature — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

Add a "Hot Stocks" (מניות חמות) feature to the Tsua platform — showing which stocks are generating the most activity based on a composite score of community buzz, price volatility, and trading volume. Displayed as a homepage widget and a dedicated `/hot` page, with separate tabs for Israeli (TASE) and US (NYSE/NASDAQ) markets.

---

## Architecture

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| API route | `apps/web/src/app/api/stocks/hot/route.ts` | Computes hot scores, returns ranked list |
| Widget | `apps/web/src/components/stocks/HotStocksWidget.tsx` | Top-5 compact widget for homepage |
| Page | `apps/web/src/app/[locale]/hot/page.tsx` | Full page with Top-30 table per market |
| Page client | `apps/web/src/app/[locale]/hot/HotPageClient.tsx` | Client component for tabs + sorting + search |

### Data Flow

```
Supabase posts (stock_mentions, last 24h)  ──┐
                                               ├──> /api/stocks/hot?market=il|us
Finnhub API (price, change%, volume)       ──┘        │
                                                       ├──> HotStocksWidget (homepage)
                                                       └──> HotPageClient (/hot page)
```

Cache: `export const revalidate = 120` (2-minute ISR on the API route)

---

## Scoring Algorithm

**Formula:** `hot_score = buzz_score + volatility_score + volume_score` (range: 0–100)

| Component | Weight | Formula |
|-----------|--------|---------|
| Community buzz | 40 pts | `min(40, mentions_24h × 4)` — 10 mentions = max 40 |
| Price volatility | 30 pts | `min(30, abs(change_pct) × 3)` — 10% move = max 30 |
| Volume anomaly | 30 pts | `min(30, (volume / avg_volume_30d) × 15)` — 2× avg = max 30 |

**Dominant reason label** (the component with highest score):
- `buzz_score` is highest → `"🔥 באזז חם"`
- `volatility_score` is highest → `"⚡ תנודה חדה"`
- `volume_score` is highest → `"📊 נפח חריג"`

If Finnhub volume data is unavailable, `volume_score = 0` (graceful degradation).

---

## API Route — `/api/stocks/hot`

**Query params:** `market=il` (default) | `market=us`

**Response:**
```typescript
{
  market: 'il' | 'us',
  updatedAt: string,        // ISO timestamp
  stocks: Array<{
    ticker: string,
    name: string,
    nameHe: string,
    exchange: string,
    rank: number,
    price: number | null,
    changePercent: number | null,
    volume: number | null,
    hotScore: number,         // 0–100
    buzzScore: number,
    volatilityScore: number,
    volumeScore: number,
    reason: string,           // dominant label
    mentions24h: number,
    sentiment: { bullish: number, bearish: number, neutral: number, total: number }
  }>
}
```

**Implementation steps:**
1. Load universe (hardcoded list of 30 IL / 50 US tickers)
2. Fetch all mentions counts from Supabase in a single `.select('stock_mentions')` query, then group by ticker
3. Fetch Finnhub quotes for each ticker (price, change%, volume, avgVolume)
4. Fetch sentiment from existing `/api/stocks/[ticker]/sentiment` logic (inline, not HTTP)
5. Compute scores, sort descending, attach ranks
6. Return top 30

---

## Stock Universe

### Israeli (IL) — 30 tickers
TEVA, NICE, CHKP, MNDY, WIX, GLBE, SMFR, FVRR, ICL, BNLI, LUMI, POLI, RBSN, SAAR, MGDL, AUDC, TSEM, TARO, BVS, CEVA, GILT, ESLT, SPNS, CMTL, DLEA, CLBT, RADG, NNDM, PTBL, INMD

### US (US) — 50 tickers
AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, NFLX, AMD, INTC, CRM, ORCL, UBER, LYFT, SNAP, TWTR, SHOP, SQ, PYPL, BABA, JNJ, JPM, GS, BAC, V, MA, BRK, XOM, CVX, WMT, HD, MCD, KO, PEP, DIS, BA, GE, F, GM, T, VZ, PLTR, RBLX, COIN, HOOD, SOFI, AFRM, RIVN, LCID, SPY

---

## UI — HotStocksWidget (Homepage)

**Location:** In `page.tsx`, inserted above `<MarketSummary />` in the main feed column.

**Layout:**
```
┌──────────────────────────────────────────────────┐
│ 🔥 מניות חמות היום        [ת"א] [ארה"ב]  ← כל המניות →│
├──────────────────────────────────────────────────┤
│ #1  [logo] טבע TEVA   $14.20  +3.2%  [🔥 באזז חם] │
│     ▁▂▄▆█▇▆  12 אזכורים · ██░░░ 60% שורי          │
├──────────────────────────────────────────────────┤
│ ...top 5 rows...                                  │
└──────────────────────────────────────────────────┘
```

**Specs:**
- Shows top 5 for the selected tab (ת"א default)
- Tabs switch market client-side (no refetch — both markets loaded)
- Each row: rank badge, logo (fallback = ticker initials), ticker, name, price, change%, hot score pill, reason badge, sparkline (7 bars), mention count, sentiment mini-bar
- Click row → navigate to `/he/stocks/[ticker]`
- Link "← כל המניות" → `/he/hot`
- Loading state: skeleton rows (3 bars animated)
- Uses CSS vars throughout (light/dark compatible)

---

## UI — Hot Page (`/hot`)

**Hero section:**
- Heading: `🔥 המניות הכי חמות היום`
- Subtitle: עדכון אחרון + זמן
- Search bar (filter by ticker or name, client-side)

**Tabs:** `ת"א` | `ארה"ב` (default ת"א)

**Table columns (desktop):**
```
# | Logo+Ticker+Name | מחיר | שינוי% | ציון חום | סיבה | אזכורים | Sentiment | Sparkline
```

**Mobile:**
- Stack into cards per stock: rank + name + price row, then score + reason + sentiment row
- No sparkline on mobile (save space)

**Sort:**
- Default: hot_score descending
- Clickable column headers: price, changePercent, hotScore, mentions24h
- Direction toggle (asc/desc)

**Empty state:** "אין מספיק נתונים להיום עדיין 🕐"

---

## Sparkline

**Implementation:** Pure SVG, inline — no external library.  
7 data points from Finnhub intraday (`/stock/candle?resolution=H&count=7`).  
Color: green (`var(--up)`) if latest > first, red (`var(--down)`) if not.

---

## Error Handling

- Finnhub quota exceeded → use cached data or show price as `—`
- Supabase query fails → buzz_score = 0, continue with volatility + volume
- No stocks pass minimum threshold (hotScore < 5) → show list anyway (sorted by whatever data is available)
- All API calls wrapped in try/catch, individual stock failures don't break the whole response

---

## Files to Create / Modify

| Action | File |
|--------|------|
| CREATE | `apps/web/src/app/api/stocks/hot/route.ts` |
| CREATE | `apps/web/src/components/stocks/HotStocksWidget.tsx` |
| CREATE | `apps/web/src/app/[locale]/hot/page.tsx` |
| CREATE | `apps/web/src/app/[locale]/hot/HotPageClient.tsx` |
| MODIFY | `apps/web/src/app/[locale]/page.tsx` — add `<HotStocksWidget />` above MarketSummary |
| MODIFY | `apps/web/src/components/layout/Sidebar.tsx` — add nav link to `/hot` |
| MODIFY | `apps/web/src/components/layout/BottomNav.tsx` — consider replacing leaderboard with hot in nav |

---

## Out of Scope (v1)

- Real-time WebSocket updates (use 2-min ISR instead)
- User-customizable universe
- Push notifications for sudden score spikes
- Historical "hot" rankings

# Hot Stocks Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "מניות חמות" feature — a scored, ranked list of stocks by community buzz + volatility + volume — shown as a homepage widget (top 5) and a dedicated `/hot` page (top 30), with Israeli and US market tabs.

**Architecture:** A shared `lib/hotStocks.ts` defines the stock universe, types, and scoring function. A new `/api/stocks/hot?market=il|us` route aggregates Supabase buzz data + Finnhub quotes and returns ranked stocks (ISR 2 min). A `HotStocksWidget` client component fetches both markets, shows top-5 with tab switcher on the homepage. A `/hot` page renders the full ranked table with sorting and search.

**Tech Stack:** Next.js 14 App Router, Supabase (server client), Finnhub REST API, React hooks, inline SVG sparklines, Tailwind + CSS vars.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| CREATE | `apps/web/src/lib/hotStocks.ts` | Universes, StockScore type, computeHotScore() |
| CREATE | `apps/web/src/app/api/stocks/hot/route.ts` | API: fetch buzz + quotes, score, rank, return |
| CREATE | `apps/web/src/components/stocks/HotStocksWidget.tsx` | Homepage widget — top-5, two tabs |
| CREATE | `apps/web/src/app/[locale]/hot/page.tsx` | Server page wrapper (metadata + layout) |
| CREATE | `apps/web/src/app/[locale]/hot/HotPageClient.tsx` | Client: full table, sort, search, tabs |
| MODIFY | `apps/web/src/app/[locale]/page.tsx` | Add `<HotStocksWidget />` above `<MarketSummary />` |
| MODIFY | `apps/web/src/components/layout/Sidebar.tsx` | Add 🔥 מניות חמות nav item after שווקים |

---

## Task 1 — Scoring Library (`lib/hotStocks.ts`)

**Files:**
- Create: `apps/web/src/lib/hotStocks.ts`

- [ ] **Step 1: Create the file**

```typescript
// apps/web/src/lib/hotStocks.ts

export interface UniverseStock {
  ticker: string;
  nameHe: string;
  nameEn: string;
  exchange: string;
}

export interface StockScore extends UniverseStock {
  rank: number;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  hotScore: number;
  buzzScore: number;
  volatilityScore: number;
  volumeScore: number;
  reason: string;
  mentions24h: number;
  sentiment: { bullish: number; bearish: number; neutral: number; total: number };
}

export const IL_UNIVERSE: UniverseStock[] = [
  { ticker: 'TEVA', nameHe: 'טבע',           nameEn: 'Teva',           exchange: 'NYSE'   },
  { ticker: 'NICE', nameHe: 'ניס',             nameEn: 'NICE',           exchange: 'NASDAQ' },
  { ticker: 'CHKP', nameHe: "צ'קפוינט",      nameEn: 'Check Point',    exchange: 'NASDAQ' },
  { ticker: 'MNDY', nameHe: 'מאנדיי',          nameEn: 'Monday.com',     exchange: 'NASDAQ' },
  { ticker: 'WIX',  nameHe: 'וויקס',           nameEn: 'Wix',            exchange: 'NASDAQ' },
  { ticker: 'GLBE', nameHe: 'גלובל-E',         nameEn: 'Global-E',       exchange: 'NASDAQ' },
  { ticker: 'FVRR', nameHe: 'פייבר',            nameEn: 'Fiverr',         exchange: 'NYSE'   },
  { ticker: 'CEVA', nameHe: 'סבה',              nameEn: 'CEVA',           exchange: 'NASDAQ' },
  { ticker: 'AUDC', nameHe: 'אודיו-קודס',     nameEn: 'AudioCodes',     exchange: 'NASDAQ' },
  { ticker: 'TSEM', nameHe: 'טאוור',            nameEn: 'Tower Semi',     exchange: 'NASDAQ' },
  { ticker: 'ESLT', nameHe: 'אלביט',            nameEn: 'Elbit Systems',  exchange: 'NASDAQ' },
  { ticker: 'NNDM', nameHe: 'ננו-דיימנשן',     nameEn: 'Nano Dimension', exchange: 'NASDAQ' },
  { ticker: 'INMD', nameHe: 'אינמד',            nameEn: 'InMode',         exchange: 'NASDAQ' },
  { ticker: 'SPNS', nameHe: 'ספיינס',           nameEn: 'Sapiens',        exchange: 'NASDAQ' },
  { ticker: 'CLBT', nameHe: 'סלברייט',          nameEn: 'Cellebrite',     exchange: 'NASDAQ' },
  { ticker: 'RDWR', nameHe: 'רדוור',            nameEn: 'Radware',        exchange: 'NASDAQ' },
  { ticker: 'CRNT', nameHe: 'סיירגון',          nameEn: 'Ceragon',        exchange: 'NASDAQ' },
  { ticker: 'GILT', nameHe: 'גילת',             nameEn: 'Gilat',          exchange: 'NASDAQ' },
  { ticker: 'BVS',  nameHe: 'ביקום',            nameEn: 'Bycom',          exchange: 'NYSE'   },
  { ticker: 'SMFR', nameHe: 'סמארטפרנד',       nameEn: 'SmartFriend',    exchange: 'NASDAQ' },
];

export const US_UNIVERSE: UniverseStock[] = [
  { ticker: 'AAPL', nameHe: 'אפל',             nameEn: 'Apple',          exchange: 'NASDAQ' },
  { ticker: 'MSFT', nameHe: 'מיקרוסופט',       nameEn: 'Microsoft',      exchange: 'NASDAQ' },
  { ticker: 'NVDA', nameHe: 'אנבידיה',         nameEn: 'NVIDIA',         exchange: 'NASDAQ' },
  { ticker: 'TSLA', nameHe: 'טסלה',             nameEn: 'Tesla',          exchange: 'NASDAQ' },
  { ticker: 'AMZN', nameHe: 'אמזון',            nameEn: 'Amazon',         exchange: 'NASDAQ' },
  { ticker: 'GOOGL',nameHe: 'גוגל',             nameEn: 'Alphabet',       exchange: 'NASDAQ' },
  { ticker: 'META', nameHe: 'מטא',              nameEn: 'Meta',           exchange: 'NASDAQ' },
  { ticker: 'NFLX', nameHe: 'נטפליקס',          nameEn: 'Netflix',        exchange: 'NASDAQ' },
  { ticker: 'AMD',  nameHe: 'AMD',              nameEn: 'AMD',            exchange: 'NASDAQ' },
  { ticker: 'INTC', nameHe: 'אינטל',            nameEn: 'Intel',          exchange: 'NASDAQ' },
  { ticker: 'CRM',  nameHe: 'סיילספורס',       nameEn: 'Salesforce',     exchange: 'NYSE'   },
  { ticker: 'UBER', nameHe: 'אובר',             nameEn: 'Uber',           exchange: 'NYSE'   },
  { ticker: 'SHOP', nameHe: 'שופיפיי',          nameEn: 'Shopify',        exchange: 'NYSE'   },
  { ticker: 'COIN', nameHe: 'קוינבייס',         nameEn: 'Coinbase',       exchange: 'NASDAQ' },
  { ticker: 'PLTR', nameHe: 'פאלנטיר',          nameEn: 'Palantir',       exchange: 'NYSE'   },
  { ticker: 'PYPL', nameHe: 'פייפאל',           nameEn: 'PayPal',         exchange: 'NASDAQ' },
  { ticker: 'SQ',   nameHe: 'בלוק',             nameEn: 'Block',          exchange: 'NYSE'   },
  { ticker: 'V',    nameHe: 'ויזה',              nameEn: 'Visa',           exchange: 'NYSE'   },
  { ticker: 'MA',   nameHe: 'מסטרקארד',        nameEn: 'Mastercard',     exchange: 'NYSE'   },
  { ticker: 'JPM',  nameHe: "ג'י-פי-מורגן",   nameEn: 'JPMorgan',       exchange: 'NYSE'   },
  { ticker: 'BAC',  nameHe: 'בנק אמריקה',      nameEn: 'Bank of America', exchange: 'NYSE'  },
  { ticker: 'XOM',  nameHe: 'אקסון',            nameEn: 'ExxonMobil',     exchange: 'NYSE'   },
  { ticker: 'WMT',  nameHe: 'וולמארט',          nameEn: 'Walmart',        exchange: 'NYSE'   },
  { ticker: 'DIS',  nameHe: 'דיסני',             nameEn: 'Disney',         exchange: 'NYSE'   },
  { ticker: 'RBLX', nameHe: 'רובלוקס',          nameEn: 'Roblox',         exchange: 'NYSE'   },
];

/**
 * Compute a hot score (0–100) from buzz, volatility, and relative volume rank.
 * @param mentions     Number of community posts mentioning this stock in last 24h
 * @param changePct    Absolute price change percent today (can be negative)
 * @param volumeRank   0-based rank by today's volume (0 = highest volume)
 * @param totalStocks  Total stocks in universe
 */
export function computeHotScore(
  mentions: number,
  changePct: number | null,
  volumeRank: number,
  totalStocks: number,
): { hotScore: number; buzzScore: number; volatilityScore: number; volumeScore: number; reason: string } {
  const buzzScore       = Math.min(40, mentions * 4);
  const volatilityScore = Math.min(30, Math.abs(changePct ?? 0) * 3);
  const volumeScore     = Math.round(((totalStocks - 1 - volumeRank) / Math.max(totalStocks - 1, 1)) * 30);
  const hotScore        = Math.round(buzzScore + volatilityScore + volumeScore);

  const reason =
    buzzScore >= volatilityScore && buzzScore >= volumeScore ? '🔥 באזז חם' :
    volatilityScore >= volumeScore                           ? '⚡ תנודה חדה' :
                                                               '📊 נפח חריג';

  return {
    hotScore,
    buzzScore:        Math.round(buzzScore),
    volatilityScore:  Math.round(volatilityScore),
    volumeScore,
    reason,
  };
}

/** Build sparkline points from Finnhub quote fields (no extra API call). */
export function buildSparklinePoints(
  prevClose: number | null,
  open: number | null,
  low: number | null,
  high: number | null,
  price: number | null,
): number[] {
  if (!prevClose || !open || !low || !high || !price) return [];
  const isUp = price >= prevClose;
  // Order: previous close → open → (low then high for bulls, high then low for bears) → current
  return isUp
    ? [prevClose, open, low,  high, price]
    : [prevClose, open, high, low,  price];
}
```

- [ ] **Step 2: Verify the file compiles (no errors)**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors from `src/lib/hotStocks.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/hotStocks.ts
git commit -m "feat: add hotStocks lib — universes, StockScore type, scoring function"
```

---

## Task 2 — API Route (`/api/stocks/hot`)

**Files:**
- Create: `apps/web/src/app/api/stocks/hot/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// apps/web/src/app/api/stocks/hot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  IL_UNIVERSE, US_UNIVERSE, computeHotScore, buildSparklinePoints,
  type UniverseStock, type StockScore,
} from '@/lib/hotStocks';

export const revalidate = 120; // 2-minute ISR cache

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface FinnhubQuote {
  c: number;   // current
  d: number;   // change
  dp: number;  // change %
  o: number;   // open
  h: number;   // high
  l: number;   // low
  pc: number;  // previous close
  v: number;   // volume
}

async function fetchQuote(ticker: string): Promise<FinnhubQuote | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    const q: FinnhubQuote = await res.json();
    return q.c && q.c !== 0 ? q : null;
  } catch {
    return null;
  }
}

function getSentiment(posts: { sentiment: string | null }[]) {
  const c = { bullish: 0, bearish: 0, neutral: 0 };
  for (const p of posts) {
    const s = (p.sentiment ?? 'neutral') as keyof typeof c;
    if (s in c) c[s]++; else c.neutral++;
  }
  const total = c.bullish + c.bearish + c.neutral;
  const bullish = total > 0 ? Math.round((c.bullish / total) * 100) : 0;
  const bearish = total > 0 ? Math.round((c.bearish / total) * 100) : 0;
  return { bullish, bearish, neutral: total > 0 ? 100 - bullish - bearish : 0, total };
}

export async function GET(req: NextRequest) {
  const market = (req.nextUrl.searchParams.get('market') ?? 'il') as 'il' | 'us';
  const universe: UniverseStock[] = market === 'il' ? IL_UNIVERSE : US_UNIVERSE;
  const tickers = universe.map(s => s.ticker);

  // ── 1. Fetch all relevant posts from Supabase in ONE query ──────────────
  const supabase = createClient();
  const h24ago = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await supabase
    .from('posts')
    .select('stock_mentions, sentiment')
    .gte('created_at', h24ago)
    .not('stock_mentions', 'is', null);

  // Count mentions + collect posts per ticker
  const mentionsMap: Record<string, { count: number; posts: { sentiment: string | null }[] }> = {};
  for (const t of tickers) mentionsMap[t] = { count: 0, posts: [] };
  for (const post of posts ?? []) {
    for (const raw of (post.stock_mentions ?? []) as string[]) {
      const t = raw.toUpperCase().replace('.TA', '');
      if (mentionsMap[t]) {
        mentionsMap[t].count++;
        mentionsMap[t].posts.push({ sentiment: post.sentiment });
      }
    }
  }

  // ── 2. Fetch Finnhub quotes in parallel ─────────────────────────────────
  const quotes = await Promise.all(tickers.map(t => fetchQuote(t)));

  // ── 3. Rank by volume (for volume_score) ────────────────────────────────
  const volumeRankMap: Record<string, number> = {};
  tickers
    .map((t, i) => ({ t, vol: quotes[i]?.v ?? 0 }))
    .sort((a, b) => b.vol - a.vol)
    .forEach(({ t }, rank) => { volumeRankMap[t] = rank; });

  // ── 4. Score every stock ─────────────────────────────────────────────────
  const now = new Date();
  const scored: StockScore[] = universe.map((stock, i) => {
    const q = quotes[i];
    const { count: mentions24h, posts: stockPosts } = mentionsMap[stock.ticker];
    const { hotScore, buzzScore, volatilityScore, volumeScore, reason } = computeHotScore(
      mentions24h,
      q?.dp ?? null,
      volumeRankMap[stock.ticker] ?? 0,
      universe.length,
    );
    return {
      ...stock,
      rank: 0, // assigned below
      price:         q?.c  ?? null,
      changePercent: q?.dp ?? null,
      volume:        q?.v  ?? null,
      open:          q?.o  ?? null,
      high:          q?.h  ?? null,
      low:           q?.l  ?? null,
      prevClose:     q?.pc ?? null,
      hotScore,
      buzzScore,
      volatilityScore,
      volumeScore,
      reason,
      mentions24h,
      sentiment: getSentiment(stockPosts),
    };
  });

  // ── 5. Sort and assign ranks ─────────────────────────────────────────────
  scored.sort((a, b) => b.hotScore - a.hotScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return NextResponse.json({ market, updatedAt: now.toISOString(), stocks: scored });
}
```

- [ ] **Step 2: Test the route locally**

```bash
# In a separate terminal, run dev server:
cd apps/web && npm run dev
# Then in another terminal:
curl "http://localhost:3000/api/stocks/hot?market=il" | head -c 500
```
Expected: JSON with `{ market: "il", updatedAt: "...", stocks: [...] }` and first stock has `hotScore`, `mentions24h`, `sentiment`.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "hot/route"
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/stocks/hot/route.ts
git commit -m "feat: add /api/stocks/hot route with buzz+volatility+volume scoring"
```

---

## Task 3 — HotStocksWidget Component

**Files:**
- Create: `apps/web/src/components/stocks/HotStocksWidget.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/stocks/HotStocksWidget.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { buildSparklinePoints, type StockScore } from '@/lib/hotStocks';

interface HotResponse {
  market: string;
  updatedAt: string;
  stocks: StockScore[];
}

// ── Inline SVG sparkline (5 points derived from quote — no extra API call) ──
function Sparkline({ stock }: { stock: StockScore }) {
  const pts = buildSparklinePoints(stock.prevClose, stock.open, stock.low, stock.high, stock.price);
  if (pts.length < 2) return <div className="w-14 h-6" />;

  const W = 56, H = 24;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 0.01;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - ((p - min) / range) * (H - 4) - 2);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const isUp = (stock.changePercent ?? 0) >= 0;
  const color = isUp ? '#00e5b0' : '#ff4d6a';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

// ── Sentiment mini-bar ────────────────────────────────────────────────────
function SentimentBar({ s }: { s: StockScore['sentiment'] }) {
  if (s.total === 0) return null;
  return (
    <div className="flex h-1 rounded-full overflow-hidden w-16" style={{ background: 'var(--border)' }}>
      <div style={{ width: `${s.bullish}%`, background: '#00e5b0' }} />
      <div style={{ width: `${s.bearish}%`, background: '#ff4d6a' }} />
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-xl animate-pulse shrink-0" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2.5 w-14 rounded animate-pulse" style={{ background: 'var(--border2)' }} />
      </div>
      <div className="space-y-1.5 items-end">
        <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-2.5 w-8 rounded animate-pulse ms-auto" style={{ background: 'var(--border2)' }} />
      </div>
    </div>
  );
}

// ── Stock row ──────────────────────────────────────────────────────────────
function HotRow({ stock }: { stock: StockScore }) {
  const locale  = useLocale();
  const isUp    = (stock.changePercent ?? 0) >= 0;
  const pctStr  = stock.changePercent != null
    ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%`
    : '—';

  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 active:scale-[0.98] group"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Rank badge */}
      <span
        className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
      >
        {stock.rank}
      </span>

      {/* Ticker initials avatar */}
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <SentimentBar s={stock.sentiment} />
          {stock.mentions24h > 0 && (
            <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>
              {stock.mentions24h} 💬
            </span>
          )}
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline stock={stock} />

      {/* Price + change */}
      <div className="text-end shrink-0 min-w-[52px]">
        <div
          className="text-xs font-black font-mono tabular-nums"
          style={{ color: 'var(--text)' }}
          dir="ltr"
        >
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
        <div
          className="text-[10px] font-bold tabular-nums"
          style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
          dir="ltr"
        >
          {pctStr}
        </div>
      </div>

      {/* Hot score pill */}
      <div
        className="text-[9px] font-black px-1.5 py-0.5 rounded-lg shrink-0"
        style={{
          background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--surface2)',
          color:      stock.hotScore >= 60 ? '#f58220'               : 'var(--muted)',
          border:    `1px solid ${stock.hotScore >= 60 ? 'rgba(245,130,32,0.25)' : 'var(--border)'}`,
        }}
      >
        🔥 {stock.hotScore}
      </div>
    </Link>
  );
}

// ── Main widget ─────────────────────────────────────────────────────────────
export function HotStocksWidget() {
  const locale = useLocale();
  const [market, setMarket]       = useState<'il' | 'us'>('il');
  const [dataIL, setDataIL]       = useState<StockScore[] | null>(null);
  const [dataUS, setDataUS]       = useState<StockScore[] | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [resIL, resUS] = await Promise.all([
          fetch('/api/stocks/hot?market=il'),
          fetch('/api/stocks/hot?market=us'),
        ]);
        const [jsonIL, jsonUS]: [HotResponse, HotResponse] = await Promise.all([
          resIL.json(), resUS.json(),
        ]);
        if (!cancelled) {
          setDataIL(jsonIL.stocks.slice(0, 5));
          setDataUS(jsonUS.stocks.slice(0, 5));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const stocks = market === 'il' ? dataIL : dataUS;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border2)' }}
        dir="rtl"
      >
        <span className="text-sm font-black" style={{ color: 'var(--text)' }}>
          🔥 מניות חמות
        </span>

        {/* Market tabs */}
        <div className="flex gap-1 me-auto">
          {(['il', 'us'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
              style={market === m
                ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }
                : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {m === 'il' ? 'ת"א' : 'ארה"ב'}
            </button>
          ))}
        </div>

        <Link
          href={`/${locale}/hot`}
          className="text-[10px] font-semibold transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          כל המניות ←
        </Link>
      </div>

      {/* Rows */}
      <div className="py-1">
        {loading || !stocks
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : stocks.map(stock => <HotRow key={stock.ticker} stock={stock} />)
        }
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "HotStocksWidget"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/stocks/HotStocksWidget.tsx
git commit -m "feat: add HotStocksWidget — top-5 with sparklines, sentiment bar, IL/US tabs"
```

---

## Task 4 — Wire Widget into Homepage

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`

- [ ] **Step 1: Add HotStocksWidget import and render**

In `apps/web/src/app/[locale]/page.tsx`, add the import at the top and render the widget above `<MarketSummary />`:

```tsx
// Add to imports at top of file:
import { HotStocksWidget } from '@/components/stocks/HotStocksWidget';

// In the JSX, replace:
//   <MarketSummary />
// with:
//   <HotStocksWidget />
//   <MarketSummary />
```

The full updated `<div className="flex-1 min-w-0 space-y-4">` block becomes:

```tsx
<div className="flex-1 min-w-0 space-y-4">
  <HotStocksWidget />
  <MarketSummary />
  <PostComposer />
  <FeedStream />
</div>
```

- [ ] **Step 2: Verify dev server renders without errors**

```bash
cd apps/web && npm run dev
# Open http://localhost:3000/he in browser
# Should see the HotStocksWidget above the market summary cards
```
Expected: Widget renders with skeleton rows, then loads real stock data.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/page.tsx
git commit -m "feat: add HotStocksWidget to homepage above MarketSummary"
```

---

## Task 5 — `/hot` Server Page

**Files:**
- Create: `apps/web/src/app/[locale]/hot/page.tsx`

- [ ] **Step 1: Create the server page**

```tsx
// apps/web/src/app/[locale]/hot/page.tsx
import type { Metadata } from 'next';
import { HotPageClient } from './HotPageClient';

export const metadata: Metadata = {
  title: 'מניות חמות',
  description: 'המניות הכי פעילות היום — לפי באזז קהילתי, תנודתיות ונפח מסחר',
};

export default function HotPage() {
  return <HotPageClient />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/[locale]/hot/page.tsx
git commit -m "feat: add /hot server page with metadata"
```

---

## Task 6 — HotPageClient (Full Table)

**Files:**
- Create: `apps/web/src/app/[locale]/hot/HotPageClient.tsx`

- [ ] **Step 1: Create the client component**

```tsx
// apps/web/src/app/[locale]/hot/HotPageClient.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { buildSparklinePoints, type StockScore } from '@/lib/hotStocks';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface HotResponse {
  market: string;
  updatedAt: string;
  stocks: StockScore[];
}

type SortKey = 'rank' | 'price' | 'changePercent' | 'hotScore' | 'mentions24h';

// ── Sparkline (same helper as widget) ────────────────────────────────────
function Sparkline({ stock }: { stock: StockScore }) {
  const pts = buildSparklinePoints(stock.prevClose, stock.open, stock.low, stock.high, stock.price);
  if (pts.length < 2) return <div className="w-14 h-6 hidden md:block" />;
  const W = 56, H = 24;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 0.01;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - ((p - min) / range) * (H - 4) - 2);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 hidden md:block">
      <path d={d} fill="none" stroke={isUp ? '#00e5b0' : '#ff4d6a'} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

// ── Sentiment bar ─────────────────────────────────────────────────────────
function SentimentBar({ s }: { s: StockScore['sentiment'] }) {
  if (s.total === 0) return <span className="text-[10px]" style={{ color: 'var(--muted)' }}>—</span>;
  return (
    <div className="flex flex-col gap-0.5 items-center">
      <div className="flex h-1.5 rounded-full overflow-hidden w-16" style={{ background: 'var(--border)' }}>
        <div style={{ width: `${s.bullish}%`, background: '#00e5b0' }} />
        <div style={{ width: `${s.bearish}%`, background: '#ff4d6a' }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>
        {s.bullish}% שורי
      </span>
    </div>
  );
}

// ── Sortable column header ────────────────────────────────────────────────
function SortHeader({ label, sortKey, current, dir, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
    >
      {label}
      {active
        ? dir === 'desc' ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />
        : <ChevronDownIcon className="w-3 h-3 opacity-30" />
      }
    </button>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────
function MobileCard({ stock, locale }: { stock: StockScore; locale: string }) {
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <span
        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
        style={{ background: 'var(--card)', color: 'var(--muted)' }}
      >
        {stock.rank}
      </span>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</span>
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
            style={{
              background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--card)',
              color: stock.hotScore >= 60 ? '#f58220' : 'var(--muted)',
            }}
          >
            🔥 {stock.hotScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }} dir="ltr">
            {stock.ticker}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{stock.reason}</span>
        </div>
      </div>
      <div className="text-end shrink-0">
        <div className="text-sm font-black font-mono tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
        <div
          className="text-[11px] font-bold tabular-nums"
          style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
          dir="ltr"
        >
          {stock.changePercent != null ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '—'}
        </div>
      </div>
    </Link>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────
function TableRow({ stock, locale }: { stock: StockScore; locale: string }) {
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.99]"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* # */}
      <span className="w-6 text-xs font-black text-center shrink-0" style={{ color: 'var(--muted)' }}>
        {stock.rank}
      </span>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      {/* Name */}
      <div className="w-32 shrink-0">
        <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</div>
        <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }} dir="ltr">{stock.ticker}</div>
      </div>
      {/* Price */}
      <div className="w-20 text-end shrink-0">
        <div className="text-sm font-black font-mono tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
      </div>
      {/* Change % */}
      <div className="w-16 text-end shrink-0">
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
          dir="ltr"
        >
          {stock.changePercent != null ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '—'}
        </span>
      </div>
      {/* Hot score */}
      <div className="w-16 flex items-center justify-end shrink-0">
        <span
          className="text-xs font-black px-2 py-0.5 rounded-lg"
          style={{
            background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--surface2)',
            color: stock.hotScore >= 60 ? '#f58220' : 'var(--muted)',
            border: `1px solid ${stock.hotScore >= 60 ? 'rgba(245,130,32,0.3)' : 'var(--border)'}`,
          }}
        >
          🔥 {stock.hotScore}
        </span>
      </div>
      {/* Reason */}
      <div className="w-24 shrink-0">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{stock.reason}</span>
      </div>
      {/* Mentions */}
      <div className="w-16 text-center shrink-0">
        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          {stock.mentions24h > 0 ? `${stock.mentions24h} 💬` : '—'}
        </span>
      </div>
      {/* Sentiment */}
      <div className="w-20 flex justify-center shrink-0">
        <SentimentBar s={stock.sentiment} />
      </div>
      {/* Sparkline */}
      <div className="w-14 shrink-0">
        <Sparkline stock={stock} />
      </div>
    </Link>
  );
}

// ── Main page client ──────────────────────────────────────────────────────
export function HotPageClient() {
  const locale = useLocale();
  const [market,  setMarket]  = useState<'il' | 'us'>('il');
  const [dataIL,  setDataIL]  = useState<StockScore[] | null>(null);
  const [dataUS,  setDataUS]  = useState<StockScore[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [resIL, resUS] = await Promise.all([
          fetch('/api/stocks/hot?market=il'),
          fetch('/api/stocks/hot?market=us'),
        ]);
        const [jIL, jUS]: [HotResponse, HotResponse] = await Promise.all([resIL.json(), resUS.json()]);
        if (!cancelled) {
          setDataIL(jIL.stocks);
          setDataUS(jUS.stocks);
          setUpdated(jIL.updatedAt);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rank' ? 'asc' : 'desc'); }
  }

  const rawStocks = market === 'il' ? dataIL : dataUS;

  const stocks = useMemo(() => {
    if (!rawStocks) return [];
    let s = rawStocks.filter(st =>
      !search || st.ticker.includes(search.toUpperCase()) || st.nameHe.includes(search) || st.nameEn.toLowerCase().includes(search.toLowerCase())
    );
    s = [...s].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return s;
  }, [rawStocks, search, sortKey, sortDir]);

  const updatedStr = updated
    ? new Date(updated).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>🔥 מניות חמות היום</h1>
        {updatedStr && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>עודכן לאחרונה: {updatedStr}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Market tabs */}
        <div className="flex gap-1.5">
          {(['il', 'us'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              style={market === m
                ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }
                : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {m === 'il' ? '🇮🇱 ת"א' : '🇺🇸 ארה"ב'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 max-w-xs"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="חיפוש מניה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted)]"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Table — desktop */}
      <div
        className="hidden md:block rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Column headers */}
        <div
          className="flex items-center gap-3 px-4 py-2.5"
          style={{ borderBottom: '1px solid var(--border2)' }}
        >
          <div className="w-6 shrink-0" />
          <div className="w-8 shrink-0" />
          <div className="w-32 shrink-0">
            <SortHeader label="מניה" sortKey="rank" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-20 text-end shrink-0">
            <SortHeader label="מחיר" sortKey="price" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-16 text-end shrink-0">
            <SortHeader label="שינוי%" sortKey="changePercent" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-16 text-end shrink-0">
            <SortHeader label="חום" sortKey="hotScore" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-24 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>סיבה</span>
          </div>
          <div className="w-16 text-center shrink-0">
            <SortHeader label="💬" sortKey="mentions24h" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>סנטימנט</span>
          </div>
          <div className="w-14 shrink-0" />
        </div>

        {/* Rows */}
        <div className="p-2 space-y-0.5">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  {[6, 8, 32, 20, 16, 16, 24, 16, 20, 14].map((w, j) => (
                    <div key={j} className={`h-4 w-${w} rounded animate-pulse shrink-0`} style={{ background: 'var(--border)' }} />
                  ))}
                </div>
              ))
            : stocks.length === 0
              ? <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>אין מספיק נתונים להיום עדיין 🕐</p>
              : stocks.map(s => <TableRow key={s.ticker} stock={s} locale={locale} />)
          }
        </div>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden space-y-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
            ))
          : stocks.length === 0
            ? <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>אין מספיק נתונים להיום עדיין 🕐</p>
            : stocks.map(s => <MobileCard key={s.ticker} stock={s} locale={locale} />)
        }
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "HotPageClient\|hot/page"
```
Expected: no errors.

- [ ] **Step 3: Test the page locally**

```bash
# Dev server running → open http://localhost:3000/he/hot
# Should see hero + tabs + table with ranked stocks
```
Expected: Page renders with skeletons → loads real data → table shows stocks sorted by hot score.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/hot/page.tsx apps/web/src/app/[locale]/hot/HotPageClient.tsx
git commit -m "feat: add /hot page with full ranked table, sort, search, mobile cards"
```

---

## Task 7 — Add to Sidebar Navigation

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add FireIcon imports**

In `apps/web/src/components/layout/Sidebar.tsx`, find the heroicons import block and add:

```typescript
// Add to the outline imports:
import { FireIcon, /* ...existing... */ } from '@heroicons/react/24/outline';
// Add to the solid imports:
import { FireIcon as FireIconSolid, /* ...existing... */ } from '@heroicons/react/24/solid';
```

- [ ] **Step 2: Add hot item to NAV_ITEMS array**

In the `NAV_ITEMS` array in Sidebar.tsx, add the hot entry after `markets`:

```typescript
const NAV_ITEMS = [
  { key: 'feed',        icon: HomeIcon,         iconActive: HomeIconSolid,         href: '',             label: 'פיד'          },
  { key: 'markets',     icon: ChartBarIcon,     iconActive: ChartBarIconSolid,     href: '/markets',     label: 'שווקים'       },
  { key: 'hot',         icon: FireIcon,         iconActive: FireIconSolid,         href: '/hot',         label: '🔥 חמות'      },
  { key: 'news',        icon: NewspaperIcon,    iconActive: NewspaperIconSolid,    href: '/news',        label: 'חדשות'        },
  // ...rest unchanged
] as const;
```

- [ ] **Step 3: Verify sidebar renders**

```bash
# With dev server running, open http://localhost:3000/he
# Sidebar should show "🔥 חמות" as a nav item
# Clicking it should navigate to /he/hot
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat: add 🔥 חמות nav item to sidebar"
```

---

## Task 8 — Push & Deploy

- [ ] **Step 1: Final TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 2: Build check**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully` and `/he/hot` appears in the route list.

- [ ] **Step 3: Push and deploy**

```bash
cd /c/Users/wave/Desktop/tsua
git push origin master
npx vercel --prod 2>&1 | tail -5
```
Expected: `Aliased: https://tsua-rho.vercel.app`

- [ ] **Step 4: Verify production API**

```bash
curl -s "https://tsua-rho.vercel.app/api/stocks/hot?market=il" | python -m json.tool | head -30
```
Expected: JSON with `stocks` array, first item has `hotScore > 0`, `ticker`, `mentions24h`, `sentiment`.

---

## Self-Review Checklist

- [x] **Spec coverage:** API ✓, Widget ✓, Page ✓, Scoring ✓, Sparkline ✓, Sentinel bar ✓, Sort ✓, Search ✓, Mobile ✓, Sidebar nav ✓
- [x] **No placeholders:** All steps contain actual code
- [x] **Type consistency:** `StockScore` defined in Task 1, imported identically in Tasks 2, 3, 6. `buildSparklinePoints` defined in Task 1, imported in Tasks 3 and 6. `HotResponse` is a local interface in Tasks 3 and 6 (intentional duplication, no shared dep needed).
- [x] **Graceful degradation:** Finnhub failures return null → scores based on buzz alone. Supabase failure → mentions=0 → score based on volatility+volume.

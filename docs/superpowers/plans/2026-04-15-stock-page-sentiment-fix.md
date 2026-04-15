# Stock Page — Sentiment Real Data + CSS Vars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SentimentMeter fake hash-based data with real Supabase post counts, and fix all hardcoded dark rgba values in stock page components so light mode works.

**Architecture:** New `/api/stocks/[ticker]/sentiment` route queries Supabase directly server-side, groups posts by sentiment in two 24h windows (current and previous), returns percentages + change. SentimentMeter fetches this endpoint client-side. CSS fixes are mechanical find-and-replace of rgba hardcodes with CSS variables.

**Tech Stack:** Next.js 14 App Router, Supabase SSR client (`@/lib/supabase/server`), CSS custom properties.

---

## Files

| Action | Path |
|--------|------|
| **Create** | `apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts` |
| **Modify** | `apps/web/src/components/stocks/SentimentMeter.tsx` |
| **Modify** | `apps/web/src/app/[locale]/stocks/[ticker]/StockPageClient.tsx` |
| **Modify** | `apps/web/src/components/stocks/StockNews.tsx` |
| **Modify** | `apps/web/src/components/stocks/KeyStats.tsx` |
| **Modify** | `apps/web/src/components/stocks/CompanyOverview.tsx` |

---

## Task 1 — Sentiment API Route

**Files:**
- Create: `apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
// apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 300; // 5-min cache

interface SentimentCounts {
  bullish: number;
  bearish: number;
  neutral: number;
}

function countBySentiment(posts: { sentiment: string | null }[]): SentimentCounts {
  const c: SentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const p of posts) {
    const s = (p.sentiment ?? 'neutral') as keyof SentimentCounts;
    if (s in c) c[s]++;
    else c.neutral++;
  }
  return c;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase().replace('$', '').replace('.TA', '');
  const supabase = createClient();

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [{ data: curr }, { data: prev }] = await Promise.all([
    supabase
      .from('posts')
      .select('sentiment')
      .contains('stock_mentions', [ticker])
      .gte('created_at', h24ago),
    supabase
      .from('posts')
      .select('sentiment')
      .contains('stock_mentions', [ticker])
      .gte('created_at', h48ago)
      .lt('created_at', h24ago),
  ]);

  const currCounts = countBySentiment(curr ?? []);
  const prevCounts = countBySentiment(prev ?? []);

  const total = currCounts.bullish + currCounts.bearish + currCounts.neutral;
  const prevTotal = prevCounts.bullish + prevCounts.bearish + prevCounts.neutral;

  const bullish  = total > 0 ? Math.round((currCounts.bullish  / total) * 100) : 0;
  const bearish  = total > 0 ? Math.round((currCounts.bearish  / total) * 100) : 0;
  const neutral  = total > 0 ? 100 - bullish - bearish : 0;

  const prevBullish = prevTotal > 0 ? Math.round((prevCounts.bullish / prevTotal) * 100) : 0;
  const change24h   = bullish - prevBullish;

  return NextResponse.json({ bullish, bearish, neutral, total, change24h });
}
```

- [ ] **Step 2: Smoke-test the endpoint**

With the dev server running (or in production), open:
```
https://tsua-rho.vercel.app/api/stocks/TEVA/sentiment
```
Expected response shape:
```json
{ "bullish": 60, "bearish": 20, "neutral": 20, "total": 5, "change24h": 0 }
```
If `total` is 0 that's fine — just confirms it's wired up correctly.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/wave/Desktop/tsua
git add apps/web/src/app/api/stocks/[ticker]/sentiment/route.ts
git commit -m "feat: add /api/stocks/[ticker]/sentiment with real Supabase data"
```

---

## Task 2 — Update SentimentMeter to use real data

**Files:**
- Modify: `apps/web/src/components/stocks/SentimentMeter.tsx`

- [ ] **Step 1: Replace the entire file contents**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface SentimentMeterProps {
  ticker: string;
}

interface SentimentData {
  bullish: number;
  bearish: number;
  neutral: number;
  total: number;
  change24h: number;
}

export function SentimentMeter({ ticker }: SentimentMeterProps) {
  const [data, setData]         = useState<SentimentData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setLoading(true);
    setAnimated(false);
    fetch(`/api/stocks/${ticker}/sentiment`)
      .then(r => r.json())
      .then((d: SentimentData) => {
        setData(d);
        setTimeout(() => setAnimated(true), 80);
      })
      .catch(() =>
        setData({ bullish: 0, bearish: 0, neutral: 0, total: 0, change24h: 0 })
      )
      .finally(() => setLoading(false));
  }, [ticker]);

  // Skeleton
  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 space-y-4 animate-pulse"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="h-4 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-8 w-24 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 rounded-full" style={{ background: 'var(--border)' }} />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl" style={{ background: 'var(--border)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.total === 0) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="text-2xl mb-2">📊</div>
        <div className="text-sm font-bold" style={{ color: 'var(--text2)' }}>
          אין מספיק נתונים
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          היה הראשון לדון ב-${ticker}
        </div>
      </div>
    );
  }

  const sentimentLabel =
    data.bullish >= 65 ? 'אופטימי מאוד' :
    data.bullish >= 55 ? 'אופטימי'      :
    data.bullish >= 45 ? 'ניטרלי'       :
    data.bullish >= 35 ? 'פסימי'        :
    'פסימי מאוד';

  const sentimentColor =
    data.bullish >= 60 ? '#00e5b0' :
    data.bullish >= 48 ? '#f5b942' :
    '#ff4d6a';

  const change24hPositive = data.change24h >= 0;

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          📊 סנטימנט קהילתי
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {data.total} פוסטים ב-24ש׳
          </span>
          {data.change24h !== 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={change24hPositive
                ? { background: 'rgba(0,229,176,0.12)', color: '#00e5b0' }
                : { background: 'rgba(255,77,106,0.12)', color: '#ff4d6a' }
              }
            >
              {change24hPositive ? '▲' : '▼'} {Math.abs(data.change24h)}% מאתמול
            </span>
          )}
        </div>
      </div>

      {/* Main label */}
      <div className="flex items-center justify-between">
        <span className="text-2xl font-black" style={{ color: sentimentColor }}>
          {sentimentLabel}
        </span>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: sentimentColor }}>
            {data.bullish}%
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>שוריים</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,77,106,0.2)' }}>
          <div className="absolute inset-0 rounded-full" style={{ background: 'rgba(255,77,106,0.3)' }} />
          <div
            className="absolute top-0 start-0 h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${data.bullish}%` : '0%',
              background: 'linear-gradient(90deg, #00e5b0, #00c49a)',
              boxShadow: '0 0 8px rgba(0,229,176,0.4)',
            }}
          />
          <div
            className="absolute top-0 h-full"
            style={{
              right: `${data.bearish}%`,
              width: `${data.neutral}%`,
              background: 'rgba(245,185,66,0.25)',
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span style={{ color: '#00e5b0' }}>▲ שוריים {data.bullish}%</span>
          <span style={{ color: '#f5b942' }}>ניטרלי {data.neutral}%</span>
          <span style={{ color: '#ff4d6a' }}>{data.bearish}% דוביים ▼</span>
        </div>
      </div>

      {/* Breakdown pills */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: '🐂 שוריים', value: data.bullish, color: '#00e5b0', bg: 'rgba(0,229,176,0.08)',  border: 'rgba(0,229,176,0.2)'  },
          { label: '➡️ ניטרלי', value: data.neutral, color: '#f5b942', bg: 'rgba(245,185,66,0.08)', border: 'rgba(245,185,66,0.2)' },
          { label: '🐻 דוביים', value: data.bearish, color: '#ff4d6a', bg: 'rgba(255,77,106,0.08)', border: 'rgba(255,77,106,0.2)' },
        ].map(item => (
          <div
            key={item.label}
            className="text-center rounded-xl py-2.5"
            style={{ background: item.bg, border: `1px solid ${item.border}` }}
          >
            <div className="text-lg font-black" style={{ color: item.color }}>{item.value}%</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
        מדד מבוסס פוסטים קהילתיים בלבד. אינו מהווה ייעוץ השקעות.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/stocks/SentimentMeter.tsx
git commit -m "feat: wire SentimentMeter to real Supabase sentiment data"
```

---

## Task 3 — CSS Vars: StockPageClient + StockNews

**Files:**
- Modify: `apps/web/src/app/[locale]/stocks/[ticker]/StockPageClient.tsx`
- Modify: `apps/web/src/components/stocks/StockNews.tsx`

- [ ] **Step 1: Fix StockPageClient hardcoded colors**

In `StockPageClient.tsx`, find the two inline styles and replace:

```tsx
// Tab switcher container — line ~76
// BEFORE:
style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}

// AFTER:
style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
```

```tsx
// Sidebar skeleton div — line ~53
// BEFORE:
style={{ height: 320, background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}

// AFTER:
style={{ height: 320, background: 'var(--card)', border: '1px solid var(--border)' }}
```

- [ ] **Step 2: Fix StockNews hardcoded colors**

In `StockNews.tsx`, three locations:

```tsx
// Outer container — replace:
// BEFORE:
style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}
// AFTER:
style={{ background: 'var(--card)', border: '1px solid var(--border)' }}

// Header border — replace:
// BEFORE:
style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
// AFTER:
style={{ borderBottom: '1px solid var(--border2)' }}

// NewsCard bottom border — replace:
// BEFORE:
style={{ borderBottom: '1px solid rgba(26,40,64,0.35)' }}
// AFTER:
style={{ borderBottom: '1px solid var(--border2)' }}
```

Skeleton backgrounds in `SkeletonNews` — replace all three rgba values:
```tsx
// BEFORE (3 occurrences):
style={{ background: 'rgba(26,40,64,0.5)' }}
style={{ background: 'rgba(26,40,64,0.4)' }}
style={{ background: 'rgba(26,40,64,0.3)' }}

// AFTER:
style={{ background: 'var(--border)' }}
style={{ background: 'var(--border2)' }}
style={{ background: 'var(--border2)' }}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/stocks/[ticker]/StockPageClient.tsx \
        apps/web/src/components/stocks/StockNews.tsx
git commit -m "fix: use CSS vars in StockPageClient and StockNews for light mode"
```

---

## Task 4 — CSS Vars: KeyStats + CompanyOverview

**Files:**
- Modify: `apps/web/src/components/stocks/KeyStats.tsx`
- Modify: `apps/web/src/components/stocks/CompanyOverview.tsx`

- [ ] **Step 1: Fix KeyStats**

Four locations in `KeyStats.tsx`:

```tsx
// Outer wrapper — replace:
// BEFORE:
style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}
// AFTER:
style={{ background: 'var(--card)', border: '1px solid var(--border)' }}

// Header border — replace:
// BEFORE:
style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
// AFTER:
style={{ borderBottom: '1px solid var(--border2)' }}

// StatRow bottom border — replace:
// BEFORE:
style={{ borderBottom: '1px solid rgba(26,40,64,0.35)' }}
// AFTER:
style={{ borderBottom: '1px solid var(--border2)' }}

// Section divider — replace:
// BEFORE:
style={si > 0 ? { borderTop: '1px solid rgba(26,40,64,0.5)' } : {}}
// AFTER:
style={si > 0 ? { borderTop: '1px solid var(--border)' } : {}}
```

- [ ] **Step 2: Fix CompanyOverview**

Four locations in `CompanyOverview.tsx`:

```tsx
// Outer wrapper — replace:
// BEFORE:
style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}
// AFTER:
style={{ background: 'var(--card)', border: '1px solid var(--border)' }}

// Company identity border-bottom — replace:
// BEFORE:
style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
// AFTER:
style={{ borderBottom: '1px solid var(--border2)' }}

// Grid fact items — replace:
// BEFORE:
style={{ background: 'rgba(10,16,28,0.6)', border: '1px solid rgba(26,40,64,0.5)' }}
// AFTER:
style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/stocks/KeyStats.tsx \
        apps/web/src/components/stocks/CompanyOverview.tsx
git commit -m "fix: use CSS vars in KeyStats and CompanyOverview for light mode"
```

---

## Task 5 — Push and verify

- [ ] **Step 1: Push all commits to trigger Vercel deploy**

```bash
git push origin master
```

- [ ] **Step 2: Verify sentiment endpoint in production**

```bash
curl https://tsua-rho.vercel.app/api/stocks/TEVA/sentiment
```

Expected: JSON with `bullish`, `bearish`, `neutral`, `total`, `change24h` — all numbers, `total` ≥ 0.

- [ ] **Step 3: Verify the stock page loads correctly**

Open `https://tsua-rho.vercel.app/he/stocks/TEVA` and confirm:
- SentimentMeter shows real % (not always the same value for every ticker)
- Toggle light mode — all stock components should render on cream background correctly
- Community feed tab shows posts mentioning `$TEVA`

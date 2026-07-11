# Rich Media Posts (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users attach up to 4 uploaded images OR one Giphy GIF (mutually exclusive) to a post, with a server-side Giphy proxy and imageUrls hardening — no DB change.

**Architecture:** Everything rides the existing `posts.image_urls text[]`. A GIF is one entry whose host is `giphy.com`; images are Supabase public URLs. Media state lives directly in `PostComposer` (the single composer — `MobileComposeSheet` just wraps it). Giphy search is proxied through a server route so the API key never reaches the client.

**Tech Stack:** Next.js 14 App Router, Supabase storage, Giphy Search API, Tailwind + tsua tokens.

**Spec:** `docs/superpowers/specs/2026-07-11-rich-media-posts-design.md`

**Deviations from spec (self-review):** (1) The spec proposed a shared `useComposerMedia` hook to dedupe two composers; there is only ONE composer (`MobileComposeSheet` renders `<PostComposer>`), so the hook is dropped — state stays in PostComposer. (2) `PostCard`'s grid already renders a single image full-width, so the GIF change is only `object-contain` + a badge.

**Testing note:** Repo has no test runner. "Verify" steps use `tsc`, browser `preview_eval`, and grep. Dev server: preview_start "Tsua Frontend (Next.js)" port 3000; get a fresh serverId (it dies often).

---

### Task 1: media helpers

**Files:**
- Create: `apps/web/src/lib/media.ts`

- [ ] **Step 1: Write the helper module**

```ts
// apps/web/src/lib/media.ts
/** Max uploaded images per post (Twitter-style). */
export const MAX_POST_IMAGES = 4;

/** Supabase project host that our uploads live on. */
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host; }
  catch { return ''; }
})();

/** A media URL is a GIF iff it is served from giphy.com. */
export function isGif(url: string): boolean {
  try { return new URL(url).host.endsWith('giphy.com'); }
  catch { return false; }
}

/**
 * Allow only our own storage or Giphy — blocks arbitrary third-party
 * hotlinks / tracking pixels injected via the imageUrls field.
 * Used server-side to filter, and client-side is not required.
 */
export function isAllowedMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return u.host.endsWith('giphy.com') || (SUPABASE_HOST !== '' && u.host === SUPABASE_HOST);
  } catch { return false; }
}
```

- [ ] **Step 2: Verify** — `cd apps/web && npx tsc --noEmit` → exit 0.
- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/media.ts
git commit -m "feat(media): url helpers (isGif, isAllowedMediaUrl, MAX_POST_IMAGES)"
```

---

### Task 2: harden /api/posts imageUrls

**Files:**
- Modify: `apps/web/src/app/api/posts/route.ts` (the POST handler, near the `cleanMentions` block ~line 135 and the `.insert({...})` ~line 145)

- [ ] **Step 1:** Add the import at the top of the file (with the other imports):

```ts
import { MAX_POST_IMAGES, isAllowedMediaUrl } from '@/lib/media';
```

- [ ] **Step 2:** Immediately AFTER the `cleanMentions` computation (the block that ends with `.slice(0, MAX_STOCK_MENTIONS)` and `: [];`), add:

```ts
  // Only keep media URLs we trust (our storage or Giphy); cap the count.
  // Filtering (not rejecting) means a partial client bug can't blank a post.
  const cleanImageUrls: string[] = Array.isArray(imageUrls)
    ? imageUrls
        .filter((u: unknown): u is string => typeof u === 'string' && isAllowedMediaUrl(u))
        .slice(0, MAX_POST_IMAGES)
    : [];
```

- [ ] **Step 3:** In the `.insert({ ... })` object, replace `image_urls: imageUrls ?? [],` with:

```ts
      image_urls: cleanImageUrls,
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → 0. Then with dev server, in preview_eval (logged-out is fine, expect 401 — proves route still parses):

```js
await fetch('/api/posts', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'x',imageUrls:['http://evil.com/x.png']})}).then(r=>r.status)
```

Expected: `401` (unauth) — not 500. (Full filter behavior is verified end-to-end in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/posts/route.ts
git commit -m "fix(posts): validate+allowlist imageUrls (cap 4, our-storage/giphy only)"
```

---

### Task 3: Giphy search proxy

**Files:**
- Create: `apps/web/src/app/api/giphy/search/route.ts`

- [ ] **Step 1: Write the route**

```ts
// apps/web/src/app/api/giphy/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GifResult { id: string; previewUrl: string; fullUrl: string }

// GET /api/giphy/search?q=...&limit=24
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 24, 40);
  const key = process.env.GIPHY_API_KEY;

  // Degrade gracefully to empty rather than 500 when unconfigured / empty query.
  if (!key) { console.warn('[giphy] GIPHY_API_KEY not set'); return NextResponse.json({ results: [] }); }
  if (!q) return NextResponse.json({ results: [] });

  const url = `https://api.giphy.com/v1/gifs/search?api_key=${key}`
    + `&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13&lang=he`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const results: GifResult[] = (data.data ?? []).map((g: any) => ({
      id: g.id,
      previewUrl: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url ?? '',
      fullUrl: g.images?.downsized_medium?.url ?? g.images?.original?.url ?? '',
    })).filter((g: GifResult) => g.previewUrl && g.fullUrl);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
```

- [ ] **Step 2: Verify key not bundled** — `npx tsc --noEmit` → 0. The key is read in a server route only; confirm no `NEXT_PUBLIC_GIPHY` anywhere: `grep -rn "GIPHY" apps/web/src | grep -i next_public` → no matches.
- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/giphy/search/route.ts
git commit -m "feat(giphy): server-side search proxy (key stays server-only)"
```

---

### Task 4: GifPicker modal

**Files:**
- Create: `apps/web/src/components/feed/GifPicker.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/components/feed/GifPicker.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface GifResult { id: string; previewUrl: string; fullUrl: string }

export function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/giphy/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [q]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,5,12,0.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col" dir="rtl"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '75vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3" style={{ borderBottom: '1px solid var(--border2)' }}>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="חפש GIF..."
            className="flex-1 bg-transparent focus:outline-none text-sm" style={{ color: 'var(--text)' }} />
          <button onClick={onClose} aria-label="סגור" className="p-1.5 rounded-lg" style={{ color: 'var(--muted)' }}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-2 overflow-y-auto">
          {results.map(g => (
            <button key={g.id} onClick={() => { onSelect(g.fullUrl); onClose(); }}
              className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity" style={{ aspectRatio: '1' }}>
              <img src={g.previewUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        {!loading && results.length === 0 && (
          <div className="py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
            {q ? 'אין תוצאות' : 'הקלד כדי לחפש'}
          </div>
        )}
        <div className="py-1.5 text-center text-[9px] tracking-wider" style={{ color: 'var(--muted)', borderTop: '1px solid var(--border2)' }}>
          POWERED BY GIPHY
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → 0.
- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/feed/GifPicker.tsx
git commit -m "feat(giphy): GifPicker modal with search + attribution"
```

---

### Task 5: PostComposer — multi-image state + GIF

**Files:**
- Modify: `apps/web/src/components/feed/PostComposer.tsx`

- [ ] **Step 1: State.** Replace the single-image state line (`const [imageUrl, setImageUrl] = useState<string | null>(null);`, ~line 50) with:

```tsx
  // Media: up to MAX_POST_IMAGES images XOR one gif (mutually exclusive)
  const [images, setImages] = useState<string[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const canAddImage = !gifUrl && images.length < MAX_POST_IMAGES;
  const canAddGif = images.length === 0 && !gifUrl;
```

Add imports at top: extend the heroicons import to include nothing new (PhotoIcon/XMarkIcon already imported); add:

```tsx
import { MAX_POST_IMAGES } from '@/lib/media';
import { GifPicker } from './GifPicker';
```

- [ ] **Step 2: Upload handler.** Replace `handleImageSelect` (~lines 143-165) with a multi-file version:

```tsx
  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const room = MAX_POST_IMAGES - images.length;
    setImageUploading(true);
    setError('');
    try {
      for (const file of files.slice(0, room)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', 'post-images');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'שגיאה בהעלאת התמונה'); }
        const { url } = await res.json();
        setImages(prev => [...prev, url]);
      }
    } catch (e: any) {
      setError(e.message ?? 'שגיאה בהעלאת התמונה');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }
```

- [ ] **Step 3: Post payload.** In `handlePost`, replace `imageUrls: imageUrl ? [imageUrl] : [],` (~line 184) with:

```tsx
          imageUrls: gifUrl ? [gifUrl] : images,
```

And in the success reset block, replace `setImageUrl(null);` with:

```tsx
      setImages([]);
      setGifUrl(null);
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → 0 (UI wired in Step-by-step Task 6; compile must pass now).
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/feed/PostComposer.tsx
git commit -m "feat(composer): multi-image + gif state (mutually exclusive)"
```

---

### Task 6: PostComposer — preview + toolbar UI

**Files:**
- Modify: `apps/web/src/components/feed/PostComposer.tsx`

- [ ] **Step 1: Media preview.** Replace the entire `{imageUrl && ( … )}` preview block (~lines 391-404) with:

```tsx
      {/* Media preview */}
      {(images.length > 0 || gifUrl) && (
        <div className="mx-4 mb-2">
          {gifUrl ? (
            <div className="relative rounded-xl overflow-hidden inline-block" style={{ maxHeight: 220, border: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
              <img src={gifUrl} alt="GIF" className="object-contain" style={{ maxHeight: 220 }} />
              <button type="button" onClick={() => setGifUrl(null)}
                className="absolute top-2 end-2 w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                style={{ background: 'rgb(var(--rgb-bg) / 0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <XMarkIcon className="w-3.5 h-3.5 text-tsua-muted" />
              </button>
            </div>
          ) : (
            <div className={`grid gap-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((url, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
                  <img src={url} alt="" className="w-full object-cover" style={{ maxHeight: images.length === 1 ? 200 : 120 }} />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                    style={{ background: 'rgb(var(--rgb-bg) / 0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    <XMarkIcon className="w-3.5 h-3.5 text-tsua-muted" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Image button.** Update the file input to allow multiple and the button's disabled logic. Replace the input+button (~lines 433-446): set the input to `multiple` and gate on `canAddImage`:

```tsx
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleImageSelect} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageUploading || !canAddImage}
          className="p-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40"
          style={{ color: images.length > 0 ? 'var(--accent)' : 'var(--muted)' }}
          title="הוסף תמונה"
        >
          {imageUploading
            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
            : <PhotoIcon className="w-4 h-4" />
          }
        </button>
```

- [ ] **Step 3: GIF button.** Immediately AFTER the image button, add:

```tsx
        <button
          type="button"
          onClick={() => setGifOpen(true)}
          disabled={!canAddGif}
          className="px-2 py-1 rounded-lg text-[11px] font-black transition-all hover:bg-white/5 disabled:opacity-40"
          style={{ color: gifUrl ? 'var(--accent)' : 'var(--muted)', border: '1px solid var(--border)' }}
          title="הוסף GIF"
        >
          GIF
        </button>
```

- [ ] **Step 4: Mount the picker.** Just before the component's final closing `</div>` of the root card (right after the toolbar block), add:

```tsx
      {gifOpen && <GifPicker onSelect={setGifUrl} onClose={() => setGifOpen(false)} />}
```

- [ ] **Step 5: Verify (browser).** `npx tsc --noEmit` → 0. Dev server, log in, open composer:
  - Add 4 images → 4 thumbnails, image button disables; remove one → 3, re-enables.
  - GIF button disabled while images present. Remove all images → GIF enabled.
  - Click GIF → picker opens; (with no key set, empty state shows "הקלד כדי לחפש"/"אין תוצאות" — expected until Task 9 env).
- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/feed/PostComposer.tsx
git commit -m "feat(composer): media preview grid + gif button + picker mount"
```

---

### Task 7: PostCard + PostDetail GIF rendering

**Files:**
- Modify: `apps/web/src/components/feed/PostCard.tsx:523-539`
- Modify: `apps/web/src/components/posts/PostDetailPage.tsx` (its post-images block — find `imageUrls` render; mirror the change)

- [ ] **Step 1: PostCard.** Replace the `{/* Post images */}` block (lines 523-539) with a GIF-aware version:

```tsx
            {/* Post media */}
            {post.imageUrls && post.imageUrls.length > 0 && (
              isGif(post.imageUrls[0]) && post.imageUrls.length === 1 ? (
                <div className="mt-3 relative rounded-lg overflow-hidden inline-block" style={{ border: '1px solid rgb(var(--rgb-border) / 0.5)' }}>
                  <img src={post.imageUrls[0]} alt="GIF" className="object-contain" style={{ maxHeight: 320 }} />
                  <span className="absolute bottom-1.5 end-1.5 text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--rgb-bg) / 0.75)', color: 'var(--text2)' }}>GIF</span>
                </div>
              ) : (
                <div
                  className={`mt-3 grid gap-1 overflow-hidden ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                  style={{ borderRadius: '8px', border: '1px solid rgb(var(--rgb-border) / 0.5)' }}
                >
                  {post.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full object-cover" style={{ maxHeight: post.imageUrls.length === 1 ? 320 : 180 }} />
                  ))}
                </div>
              )
            )}
```

Add import at top of PostCard.tsx: `import { isGif } from '@/lib/media';`

- [ ] **Step 2: PostDetailPage.** Open the file, locate its `imageUrls` rendering block (same grid pattern). Apply the identical GIF-aware conditional (copy Step 1's JSX, matching the local variable name the file uses for the post). Add `import { isGif } from '@/lib/media';`.

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → 0. (Full visual check in Task 8.)
- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/feed/PostCard.tsx apps/web/src/components/posts/PostDetailPage.tsx
git commit -m "feat(feed): render single Giphy GIF full-width with badge"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1:** `cd apps/web && npx tsc --noEmit` → 0.
- [ ] **Step 2: Bundle safety** — `grep -rn "GIPHY_API_KEY" apps/web/src` shows ONLY the server route; `grep -rni "next_public_giphy" apps/web` → nothing.
- [ ] **Step 3: Post-image round trip (logged in, dev):** upload 2 images, post; confirm the new post shows a 2-image grid in feed and on its `/posts/[id]` page (dark + light via `localStorage.setItem('tsua-theme', …)`).
- [ ] **Step 4: imageUrls filter** — via preview_eval as a logged-in user, POST a post with `imageUrls:['https://evil.example/x.png','<a real supabase url>']`; fetch it back and confirm only the Supabase URL persisted.
- [ ] **Step 5:** Run the **tsua-audit** skill scanner (contrast light+dark + console) on `/` and a post detail page → 0 low-contrast, 0 console errors.
- [ ] **Step 6:** Commit any fixes (`fix(media): …`).

---

### Task 9: Giphy key + deploy

- [ ] **Step 1 (owner):** Get a free key at developers.giphy.com → in repo root: `vercel env add GIPHY_API_KEY production` (paste key). Also add to `apps/web/.env.local` for local: `GIPHY_API_KEY="<key>"`.
- [ ] **Step 2:** Deploy via the **tsua-deploy** skill (push + `vercel --prod --yes` from repo root).
- [ ] **Step 3: Verify live:** on prod, open composer → GIF picker returns results for a query (e.g. "stonks"); post one → renders with badge. Confirm prod bundle has no key: fetch a `/_next/static/chunks/*.js` and grep for the key value → absent.

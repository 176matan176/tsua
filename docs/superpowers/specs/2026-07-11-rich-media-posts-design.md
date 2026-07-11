# Rich Media Posts (v1) — images + GIF picker

**Date:** 2026-07-11 · **Status:** Approved by owner.
**Scope:** v1 = up to 4 uploaded images OR one Giphy GIF per post, on top of
existing ticker tagging + bull/bear sentiment. Structured "analysis" posts
(price targets, confidence, timeframe) are a SEPARATE later sub-project.

## Goal

Let users attach visual context to posts — chart screenshots, memes, GIF
reactions — the way traders do on X/StockTwits.

## What already exists (do not rebuild)

- `POST /api/upload` → Supabase `post-images` bucket; gif is an allowed type;
  bucket allowlist + filename sanitization already added.
- `posts.image_urls` is a `text[]` column; `/api/posts` accepts `imageUrls`.
- `PostCard` renders `image_urls` in a responsive grid (1 image = full width,
  2+ = 2-col grid). `PostComposer` + `MobileComposeSheet` both post, but each
  currently sends at most ONE uploaded image and has no GIF path.

## Non-goals (YAGNI)

Image editing/cropping, alt-text, video, mixed images+GIF in one post,
reordering, and the structured-analysis post type.

## Architecture

**No DB migration.** Everything rides `image_urls: string[]`.
- Multiple images → the array holds N (≤4) Supabase public URLs.
- A GIF → the array holds exactly one Giphy URL.
- Display distinguishes a GIF by host: `isGif(url)` = URL host ends with
  `giphy.com`. Helper lives in `src/lib/media.ts` alongside a shared
  `MAX_POST_IMAGES = 4` constant.

**Shared composer logic.** Extract a `useComposerMedia` hook
(`src/hooks/useComposerMedia.ts`) holding `{ images, gifUrl, addImages,
removeImage, setGif, clearGif, reset, canAddImage, canAddGif }` so
`PostComposer.tsx` (desktop) and `MobileComposeSheet.tsx` (mobile) share one
implementation instead of duplicating it. Mutual exclusion (images XOR gif)
is enforced in the hook: `canAddImage = !gifUrl && images.length < 4`,
`canAddGif = images.length === 0`.

## Giphy integration (server-key, secure)

- New route `GET /api/giphy/search?q=<query>&limit=24` proxies to the Giphy
  Search API using a server-only `GIPHY_API_KEY` (NOT NEXT_PUBLIC — the
  Finnhub lesson). Returns a trimmed list: `{ id, previewUrl, fullUrl }`.
- `rating=pg-13` on the Giphy request. Query is `debounce`d ~350ms client-side.
- Missing key → route returns `{ results: [] }` with 200 and logs a warning,
  so the picker degrades to empty rather than 500ing. If key is absent the
  GIF button still renders but shows an "unavailable" empty state.
- New `GifPicker` modal component (`src/components/feed/GifPicker.tsx`):
  search input, results grid, "Powered by GIPHY" attribution (license
  requirement), click selects and closes. Reuses existing modal styling.

## Composer UX (both surfaces)

- Image button (existing 🖼️): now `multiple`; uploads each file via the
  existing `/api/upload`; shows thumbnails with an ✕ remove control; disabled
  when a GIF is selected or 4 images reached.
- GIF button (new): opens `GifPicker`; disabled when any image is selected.
- Selected media preview sits above the ticker/sentiment row. Posting sends
  `imageUrls` = images array, or `[gifUrl]`.

## Server hardening (fold into this work)

`/api/posts` currently trusts `imageUrls` blindly. Add validation:
- Must be an array of ≤ `MAX_POST_IMAGES` strings.
- Each URL must be HTTPS and its host must be either the Supabase project
  host (`<ref>.supabase.co`) or end with `giphy.com`. Anything else →
  dropped (not 400 — just filtered, so a partial client bug can't blank a
  post). Prevents arbitrary third-party hotlink/tracking-pixel injection.

## Display

- `PostCard` + `PostDetailPage`: keep the grid for images. For a GIF
  (`image_urls.length === 1 && isGif(url)`), render full-width with a small
  "GIF" corner badge. Everything else unchanged.

## Error handling

- Upload failure → inline error, keep other selected media.
- Giphy fetch failure → empty results + retry, never blocks composing.
- Post with 0 media → identical to today.

## Verification

1. `cd apps/web && npx tsc --noEmit`.
2. Desktop + mobile composer: add 4 images, remove one, post → grid renders
   in feed and post detail (dark + light).
3. GIF: open picker, search, select, post → full-width GIF + badge; image
   button was disabled while gif selected.
4. Security: confirm `GIPHY_API_KEY` absent from client bundle
   (`grep -r GIPHY_API_KEY .next/static` → nothing); `/api/posts` drops a
   non-allowlisted imageUrl.
5. tsua-audit (contrast/console) on feed + a stock page; tsua-deploy + prod
   verify.

## External dependency (owner action)

Requires a free Giphy API key (developers.giphy.com) → set `GIPHY_API_KEY`
in Vercel. Until set, the GIF picker shows an empty state; image upload works
regardless.

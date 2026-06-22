import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/news — Hebrew financial news aggregated from Israeli outlets.
 *
 * Strategy: hit Google News RSS with a Hebrew query targeting the Israeli
 * financial press. The result is an aggregated stream of articles from
 * TheMarker, כלכליסט, גלובס, BizPortal, Ynet כלכלה, מעריב עסקים etc. —
 * the same outlets that show up in `news.google.com` when you search those
 * terms in Hebrew.
 *
 * Pros of going through Google News rather than scraping each outlet:
 *   - one HTTP call instead of 5+ scrapes per minute
 *   - no per-site CSS selectors that break the moment they redesign
 *   - free, no API key, no per-source agreement
 *
 * Cons:
 *   - link URLs go through google.com first (redirect to actual article)
 *   - title format is "Article title - Source Name" — we split on the dash
 *
 * Query params:
 *   ?category = all | tase | us | macro | crypto | real-estate
 *   ?source   = all | themarker | calcalist | globes  (post-filter)
 *   ?page     = 1, 2, 3 (page size 25)
 */
export const dynamic = 'force-dynamic';

// Hebrew search queries per category — broad enough to surface relevant
// stories, narrow enough not to drown the feed in unrelated politics.
const CATEGORY_QUERIES: Record<string, string> = {
  all:           '("שוק ההון" OR "בורסה" OR "מניות") -ספורט',
  tase:          '("ת\\"א 35" OR "ת\\"א 125" OR "בורסת תל אביב" OR "בורסה תל אביב" OR "שוק ההון הישראלי")',
  us:            '("וול סטריט" OR "S&P 500" OR "נאסדק" OR "מניות אמריקאיות" OR "Wall Street")',
  macro:         '("אינפלציה" OR "ריבית בנק ישראל" OR "ריבית הפד" OR "צמיחה כלכלית" OR "מאקרו")',
  crypto:        '("ביטקוין" OR "קריפטו" OR "מטבעות דיגיטליים" OR "אתריום")',
  'real-estate': '("שוק הדיור" OR "מחירי דירות" OR "נדל\\"ן ישראל" OR "משכנתאות")',
};

/**
 * Per-outlet site: scopes. Combined with the active category query at
 * request time so the boost queries actually respect the user's filter —
 * the previous version ran them with a fixed "שוק ההון OR בורסה" suffix,
 * which meant clicking "ת"א" still pulled TheMarker articles about Wall
 * Street, etc.
 */
const OUTLET_BOOST_SITES: Record<string, string> = {
  themarker: 'site:themarker.com',
  ynet:      'site:ynet.co.il',
};

function buildBoostQuery(outletKey: string, category: string): string {
  const site = OUTLET_BOOST_SITES[outletKey];
  const categoryTerms = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all;
  return `${site} ${categoryTerms}`;
}

// Source filters — Hebrew outlet names that show up in Google News byline.
const SOURCE_PATTERNS: Record<string, RegExp> = {
  themarker:    /TheMarker|דה.מארקר|הארץ/i,
  calcalist:    /Calcalist|כלכליסט/i,
  globes:       /Globes|גלובס/i,
  bizportal:    /BizPortal|ביזפורטל/i,
  ynet:         /ynet|Ynet/i,
  maariv:       /מעריב/i,
};

interface ParsedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string | null;
  description: string;
}

/**
 * Minimal RSS parser tuned to Google News output. Google News RSS is small
 * and predictable — a regex parse is fine for our few fields and avoids
 * pulling in an XML library just for this.
 */
function parseGoogleNewsRss(xml: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  // <item>...</item> blocks
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of itemMatches) {
    const pick = (tag: string): string => {
      // CDATA-wrapped or plain. Capture either.
      const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`);
      const m = block.match(re);
      return m ? m[1].trim() : '';
    };

    const title = pick('title');
    const link = pick('link');
    const pubDate = pick('pubDate');
    const description = pick('description');
    const source = pick('source');

    if (!title || !link) continue;

    items.push({ title, link, pubDate, source: source || null, description });
  }
  return items;
}

/**
 * Google News titles are formatted "Article title - Source Name". Split off
 * the trailing source so the title in our UI is clean. If there's no dash
 * (rare), use the full title and leave source unchanged.
 */
function splitTitleAndSource(rawTitle: string, fallbackSource: string | null): { title: string; source: string } {
  // Use lastIndexOf so an article title containing " - " doesn't truncate
  // (the source suffix is always last).
  const idx = rawTitle.lastIndexOf(' - ');
  if (idx === -1) return { title: rawTitle.trim(), source: fallbackSource ?? 'Unknown' };
  return {
    title: rawTitle.slice(0, idx).trim(),
    source: rawTitle.slice(idx + 3).trim() || fallbackSource || 'Unknown',
  };
}

interface OutArticle {
  id: string;
  source: string;
  titleHe: string;
  titleEn: null;
  summaryHe: string | null;
  summaryEn: null;
  url: string;
  imageUrl: null;
  publishedAt: string | null;
  lang: 'he';
  stockTags: never[];
}

/**
 * Try to pull a real article summary from the destination page. Google News
 * RSS descriptions are useless — they're just `<a href="..">Title</a>` with
 * the source name, so users were seeing escaped HTML soup under each title
 * instead of an actual preview.
 *
 * Strategy: follow the Google News redirect to the real article, parse
 * `og:description` (or fallback to `<meta name="description">`) from the
 * head. Cached aggressively per URL — once we know an article's preview
 * text, it never changes. 24h cache amortises the cost across users.
 *
 * Failure modes:
 *   - paywall returns thin HTML — og:description usually still present
 *   - bot block — we return empty, UI falls back to no summary
 *   - timeout — same fallback
 */
async function fetchArticleSummary(googleNewsUrl: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(googleNewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.5',
      },
      // Follow the Google redirect to the actual outlet page.
      redirect: 'follow',
      signal: ctrl.signal,
      // 24h cache per URL — descriptions are immutable once published.
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const html = await r.text();
    // Look for og:description first (cleanest source), then plain description.
    // Outlet HTML can be huge — bail after 200KB so a single slow article
    // doesn't blow up the route's memory.
    const head = html.slice(0, 200_000);
    const og = head.match(/<meta\s+(?:property|name)\s*=\s*["']og:description["']\s+content\s*=\s*["']([^"']+)["']/i)
            ?? head.match(/<meta\s+content\s*=\s*["']([^"']+)["']\s+(?:property|name)\s*=\s*["']og:description["']/i)
            ?? head.match(/<meta\s+(?:property|name)\s*=\s*["']description["']\s+content\s*=\s*["']([^"']+)["']/i);
    if (!og?.[1]) return null;
    const raw = og[1].trim();
    // Decode common entities and clean up.
    const decoded = raw
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!decoded || decoded.length < 10) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Fire one Google News RSS query, parse it, and normalize to OutArticle. */
async function fetchGoogleNewsBatch(query: string): Promise<OutArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:14d')}&hl=he&gl=IL&ceid=IL:he`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      // 5-minute cache shared across users — Google publishes ~once a minute
      // anyway, and this caps the per-batch network cost.
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parseGoogleNewsRss(xml);
    return parsed.map((item, idx) => {
      const { title, source: parsedSource } = splitTitleAndSource(item.title, item.source);
      // Google News description is always `<a href="..">Title</a>...source.com`
      // — no actual prose. We populate summaryHe below by fetching each
      // article's og:description after dedupe+slice (cheaper than 100+ fetches).
      const published = item.pubDate ? new Date(item.pubDate) : null;
      return {
        id: `gnews-${idx}-${Buffer.from(item.link).toString('base64').slice(0, 10)}`,
        source: parsedSource,
        titleHe: title,
        titleEn: null,
        summaryHe: null,
        summaryEn: null,
        url: item.link,
        imageUrl: null,
        publishedAt: published?.toISOString() ?? null,
        lang: 'he' as const,
        stockTags: [],
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = (sp.get('category') ?? 'all').toLowerCase();
  const source = (sp.get('source') ?? 'all').toLowerCase();
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
  const PAGE_SIZE = 25;

  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all;

  try {
    // Fire all RSS calls in parallel. Main category query + per-outlet
    // boost queries that ALSO carry the category terms — without that,
    // clicking "ת"א" still pulled TheMarker's Wall Street headlines.
    const batches = await Promise.all([
      fetchGoogleNewsBatch(query),
      fetchGoogleNewsBatch(buildBoostQuery('themarker', category)),
      fetchGoogleNewsBatch(buildBoostQuery('ynet', category)),
    ]);

    // Merge + dedupe by URL. Articles with the same link from different
    // queries are the same article, so first-wins (keeps the category
    // query's article ID).
    const seen = new Set<string>();
    let articles: OutArticle[] = [];
    for (const batch of batches) {
      for (const a of batch) {
        if (seen.has(a.url)) continue;
        seen.add(a.url);
        articles.push(a);
      }
    }

    if (articles.length === 0) {
      return NextResponse.json(
        { articles: [], page, hasMore: false, error: 'upstream_empty' },
        { status: 502 },
      );
    }

    // Optional source filter — applied AFTER parsing so categories+sources
    // can be combined freely without doubling our query count.
    if (source !== 'all') {
      const pattern = SOURCE_PATTERNS[source];
      if (pattern) {
        articles = articles.filter(a => pattern.test(a.source));
      }
    }

    // Sort by publication time DESC (Google already does this per-batch
    // but the merge interleaves outlet orderings).
    articles.sort((a, b) => {
      const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bt - at;
    });

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const sliced = articles.slice(start, end);

    // Enrich each card with a real article preview via og:description.
    // Parallel fetches with per-URL 24h cache — first user pays once per
    // article, every subsequent user gets it instantly. Slow articles
    // (>3.5s) fall back to no summary rather than blocking the response.
    const enriched = await Promise.all(
      sliced.map(async (a) => ({
        ...a,
        summaryHe: await fetchArticleSummary(a.url),
      })),
    );

    return NextResponse.json({
      articles: enriched,
      page,
      hasMore: end < articles.length,
      totalAvailable: articles.length,
    });
  } catch (err) {
    return NextResponse.json(
      { articles: [], page, hasMore: false, error: err instanceof Error ? err.message : 'fetch_failed' },
      { status: 502 },
    );
  }
}

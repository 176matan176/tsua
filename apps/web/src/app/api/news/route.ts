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
 * Per-outlet queries that specifically scope to a single source. We run
 * these in PARALLEL with the main category query and merge by URL — Google
 * News's ranking for the general query happens to suppress TheMarker
 * almost entirely (probably because of their paywall), so without a
 * dedicated boost query they barely appear. Same insurance for Ynet's
 * business section.
 *
 * Each outlet gets a topic-flavored query so we pull *finance* coverage
 * specifically, not the general news front page.
 */
const OUTLET_BOOST_QUERIES: Record<string, string> = {
  themarker: 'site:themarker.com ("שוק ההון" OR "בורסה" OR "מניות" OR "כלכלה")',
  ynet:      'site:ynet.co.il ("שוק ההון" OR "בורסה" OR "מניות")',
};

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
  summaryHe: string;
  summaryEn: null;
  url: string;
  imageUrl: null;
  publishedAt: string | null;
  lang: 'he';
  stockTags: never[];
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
      const summary = item.description.replace(/<[^>]*>/g, '').trim();
      const published = item.pubDate ? new Date(item.pubDate) : null;
      return {
        id: `gnews-${idx}-${Buffer.from(item.link).toString('base64').slice(0, 10)}`,
        source: parsedSource,
        titleHe: title,
        titleEn: null,
        summaryHe: summary,
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
    // Fire all RSS calls in parallel. The main category query carries most
    // of the load; the per-outlet boost queries ensure TheMarker and Ynet
    // are represented (they barely show up in the general query because
    // Google News deprioritises paywalled / hard-to-crawl outlets).
    const batches = await Promise.all([
      fetchGoogleNewsBatch(query),
      fetchGoogleNewsBatch(OUTLET_BOOST_QUERIES.themarker),
      fetchGoogleNewsBatch(OUTLET_BOOST_QUERIES.ynet),
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

    return NextResponse.json({
      articles: sliced,
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

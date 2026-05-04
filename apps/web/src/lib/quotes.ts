/**
 * Unified quote fetcher with Finnhub primary + Yahoo Finance fallback.
 *
 * WHY: Finnhub's free tier caps at 60 req/min and intermittently 429s under load.
 * It also returns 0 for delisted/renamed tickers (e.g. SQ → XYZ). Yahoo's chart
 * API has no documented rate limit on the free `query1.finance.yahoo.com`
 * endpoint and covers a much wider symbol universe (TASE, delisted, ETFs,
 * forex, crypto). We try Finnhub first because it's faster and gives us volume,
 * then fall back to Yahoo whenever Finnhub returns nothing usable.
 *
 * All quote-serving routes (`/api/markets`, `/api/stocks/[ticker]`,
 * `/api/stocks/batch`, `/api/stocks/hot`, `/api/sectors`) should use this
 * instead of hitting Finnhub directly so the fallback is consistent.
 */

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

export interface Quote {
  c: number;   // current price
  d: number;   // change ($)
  dp: number;  // change percent
  o: number;   // open
  h: number;   // day high
  l: number;   // day low
  pc: number;  // previous close
  v: number;   // volume (best-effort; Yahoo provides regularMarketVolume)
}

const ZERO: Quote = { c: 0, d: 0, dp: 0, o: 0, h: 0, l: 0, pc: 0, v: 0 };

/**
 * Yahoo Finance chart endpoint — doesn't require an API key. Returns the same
 * shape we need (price, prev close, OHLC, volume) for almost any symbol.
 * Used as a fallback whenever Finnhub fails or returns 0.
 */
export async function fetchYahooQuote(symbol: string, revalidate = 60): Promise<Quote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate },
    });
    if (!r.ok) return ZERO;
    const data = await r.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return ZERO;

    const c  = Number(meta.regularMarketPrice) || 0;
    if (!c) return ZERO;
    const pc = Number(meta.chartPreviousClose ?? meta.previousClose ?? c) || c;
    const o  = Number(meta.regularMarketOpen ?? meta.open ?? c) || c;
    const h  = Number(meta.regularMarketDayHigh ?? meta.dayHigh ?? c) || c;
    const l  = Number(meta.regularMarketDayLow  ?? meta.dayLow  ?? c) || c;
    const v  = Number(meta.regularMarketVolume) || 0;
    const d  = c - pc;
    const dp = pc ? (d / pc) * 100 : 0;
    return { c, d, dp, o, h, l, pc, v };
  } catch {
    return ZERO;
  }
}

/**
 * Try Finnhub; return null if it 429s, errors, or returns an empty quote.
 * Caller decides whether to fall back.
 */
async function fetchFinnhubQuote(symbol: string, revalidate = 60): Promise<Quote | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { next: { revalidate } },
    );
    if (!r.ok) return null;        // covers 429s and 5xx
    const q = await r.json();
    if (!q.c || q.c === 0) return null; // unsupported symbol
    return {
      c: Number(q.c) || 0,
      d: Number(q.d) || 0,
      dp: Number(q.dp) || 0,
      o: Number(q.o) || 0,
      h: Number(q.h) || 0,
      l: Number(q.l) || 0,
      pc: Number(q.pc) || 0,
      v: Number(q.v) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * Primary entry point: fetch a quote with Finnhub → Yahoo fallback.
 * Always returns a Quote; check `c > 0` to know if we have valid data.
 */
export async function fetchQuote(symbol: string, revalidate = 60): Promise<Quote> {
  const finnhub = await fetchFinnhubQuote(symbol, revalidate);
  if (finnhub) return finnhub;
  return fetchYahooQuote(symbol, revalidate);
}

/**
 * Batch-fetch multiple symbols in parallel.
 * Settled-not-rejected: a single failing symbol won't sink the rest.
 */
export async function fetchQuotes(symbols: string[], revalidate = 60): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchQuote(s, revalidate)),
  );
  return results.map((r) => (r.status === 'fulfilled' ? r.value : ZERO));
}

/**
 * Yahoo `quoteSummary` returns derived metrics like trailing/forward PE,
 * dividend yield, EPS — which Finnhub's free tier does NOT expose for ETFs
 * (SPY/QQQ/DIA/EIS all come back empty). Used by the indices P/E widget.
 *
 * Yahoo gates this endpoint behind a "crumb" (anti-CSRF token) tied to a
 * session cookie. The flow is:
 *   1. GET https://fc.yahoo.com — returns a `A3=` Set-Cookie (used to be A1)
 *   2. GET /v1/test/getcrumb with that cookie — returns a short string crumb
 *   3. Call quoteSummary with `?crumb=` and the matching `Cookie:` header
 *
 * The cookie/crumb pair is valid for the lifetime of the cookie (~1 year)
 * but Yahoo will rotate it earlier under load, so we treat any 401 as "stale
 * crumb" and refresh once before giving up.
 *
 * Returns null when the symbol isn't covered or the request fails.
 */

// Browser-shaped UA — Yahoo will silently 401 some bot UAs even with a valid
// crumb. Matches what a Chrome desktop client sends.
const YAHOO_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Module-scope crumb cache. Survives across requests within a single Node
// runtime (Vercel keeps an instance warm for a while), so the typical PE
// fetch only pays the 2-extra-roundtrip cost once per cold start.
let crumbCache: { cookie: string; crumb: string; fetchedAt: number } | null = null;

async function getYahooCrumb(forceRefresh = false): Promise<{ cookie: string; crumb: string } | null> {
  if (!forceRefresh && crumbCache) return crumbCache;

  try {
    // Step 1: hit fc.yahoo.com to obtain a session cookie. Yahoo currently
    // sets `A3=` here (was `A1=` in older docs). We don't follow redirects —
    // the 404 is expected; we only need the Set-Cookie header.
    const r1 = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': YAHOO_UA },
      redirect: 'manual',
    });
    const setCookie = r1.headers.get('set-cookie');
    if (!setCookie) return null;
    // The header may contain multiple cookies separated by commas. Naive
    // split would break on Expires=Tue, ... — restrict to commas followed
    // by a `name=` token.
    const cookie = setCookie
      .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
    if (!cookie) return null;

    // Step 2: trade the cookie for a crumb.
    const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YAHOO_UA, Cookie: cookie },
    });
    if (!r2.ok) return null;
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length < 4 || crumb.includes('<')) return null;

    crumbCache = { cookie, crumb, fetchedAt: Date.now() };
    return crumbCache;
  } catch {
    return null;
  }
}

async function quoteSummaryRaw(
  symbol: string,
  auth: { cookie: string; crumb: string },
  revalidate: number,
): Promise<Response> {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=summaryDetail&crumb=${encodeURIComponent(auth.crumb)}`;
  return fetch(url, {
    headers: {
      'User-Agent': YAHOO_UA,
      Accept: 'application/json',
      Cookie: auth.cookie,
    },
    next: { revalidate },
  });
}

export async function fetchYahooPE(
  symbol: string,
  revalidate = 21600,
): Promise<{ trailingPE: number | null; forwardPE: number | null } | null> {
  try {
    let auth = await getYahooCrumb();
    if (!auth) return null;

    let r = await quoteSummaryRaw(symbol, auth, revalidate);
    // Stale crumb? Refresh once and retry.
    if (r.status === 401) {
      auth = await getYahooCrumb(true);
      if (!auth) return null;
      r = await quoteSummaryRaw(symbol, auth, revalidate);
    }
    if (!r.ok) return null;

    const json = await r.json();
    const detail = json?.quoteSummary?.result?.[0]?.summaryDetail;
    if (!detail) return null;
    const trailing = Number(detail.trailingPE?.raw);
    const forward = Number(detail.forwardPE?.raw);
    return {
      trailingPE: Number.isFinite(trailing) && trailing > 0 ? trailing : null,
      forwardPE: Number.isFinite(forward) && forward > 0 ? forward : null,
    };
  } catch {
    return null;
  }
}

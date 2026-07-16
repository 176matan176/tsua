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

// In-memory quote cache with an explicit TTL.
//
// We deliberately do NOT rely on Next.js's fetch Data Cache (`next:{revalidate}`)
// for live quotes. It is bypassed in `next dev` (so prices tick fresh every
// poll) but ACTIVE and aggressive in production builds / on Vercel, where it
// served the same quote far longer than the intended window — the client polled
// /api/stocks/batch every 2s but kept getting an identical price, so prices
// looked frozen and the green/red pulses never fired IN PRODUCTION ONLY. That's
// why the bug was invisible in dev.
//
// A module-scope TTL memo behaves identically in dev and prod, and still dedupes
// concurrent polls within a warm instance (one upstream hit per symbol per TTL).
// Same module-scope-cache pattern already used for `crumbCache` below.
const quoteMemo = new Map<string, { at: number; q: Quote }>();
function memoGet(key: string, ttlSeconds: number): Quote | null {
  const hit = quoteMemo.get(key);
  if (hit && Date.now() - hit.at < ttlSeconds * 1000) return hit.q;
  return null;
}
function memoSet(key: string, q: Quote): void {
  if (q.c > 0) quoteMemo.set(key, { at: Date.now(), q });
}

/**
 * Some symbols use a caret prefix on Yahoo to disambiguate the index from a
 * (delisted or hypothetical) equity of the same name. We accept the friendlier
 * un-prefixed form across the app (URLs, watchlist DB rows, market-bar config)
 * and translate at the network edge.
 *
 * Without this, `TA125.TA` 404s on Yahoo and the LiveMarketBar permanently
 * skeletons that cell.
 */
const YAHOO_SYMBOL_ALIASES: Record<string, string> = {
  'TA125.TA': '^TA125.TA',
  // Berkshire Hathaway B-shares: Finnhub uses BRK.B, Yahoo wants BRK-B.
  // Without this, BRK.B 404s on Yahoo and drops out of the sector map.
  'BRK.B': 'BRK-B',
  'BRK.A': 'BRK-A',
};

/**
 * Yahoo Finance chart endpoint — doesn't require an API key. Returns the same
 * shape we need (price, prev close, OHLC, volume) for almost any symbol.
 * Used as a fallback whenever Finnhub fails or returns 0.
 */
export async function fetchYahooQuote(symbol: string, revalidate = 60): Promise<Quote> {
  const memoKey = 'Y:' + symbol;
  const cached = memoGet(memoKey, revalidate);
  if (cached) return cached;
  try {
    const yahooSymbol = YAHOO_SYMBOL_ALIASES[symbol] ?? symbol;
    // range=1d so `chartPreviousClose` is YESTERDAY's close (the correct daily
    // reference). range=2d returned the close from TWO days ago, which inflated
    // the daily change % whenever Yahoo was the source (e.g. AAPL showed +5%
    // instead of +1%). We only read `meta.*` fields below, all present at 1d.
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        'Accept': 'application/json',
      },
      // TTL is enforced by the module-scope memo above, not Next's Data Cache.
      cache: 'no-store',
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
    const q: Quote = { c, d, dp, o, h, l, pc, v };
    memoSet(memoKey, q);
    return q;
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
      // Freshness is governed by fetchQuote's module-scope memo, not Next's cache.
      { cache: 'no-store' },
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
  const memoKey = 'Q:' + symbol;
  const cached = memoGet(memoKey, revalidate);
  if (cached) return cached;
  const finnhub = await fetchFinnhubQuote(symbol, revalidate);
  const q = finnhub ?? await fetchYahooQuote(symbol, revalidate);
  memoSet(memoKey, q);
  return q;
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
 * Yahoo-only batch fetch — used by the live-polling /api/stocks/batch route.
 *
 * WHY not the Finnhub-first fetchQuote(): Finnhub's FREE tier returns
 * stale/slowly-updating quotes (observed: NVDA frozen at one price for 12s+
 * while Yahoo's chart endpoint ticked in real time). Since production has a
 * Finnhub key it preferred that stale feed, so prices looked frozen on the
 * live site even though the client polled every 2s. Yahoo's chart endpoint is
 * genuinely live and covers the full symbol universe we poll (US equities,
 * ETFs, TASE via alias, ^VIX/^TNX indices, GC=F/CL=F futures), so the live
 * path uses it directly. Slower widgets (markets/hot/sectors) keep Finnhub
 * first for its volume data — they don't need sub-minute freshness.
 */
export async function fetchYahooQuotes(symbols: string[], revalidate = 60): Promise<Quote[]> {
  const results = await Promise.allSettled(
    symbols.map((s) => fetchYahooQuote(s, revalidate)),
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
  modules: string = 'summaryDetail',
): Promise<Response> {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
    `?modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(auth.crumb)}`;
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

/**
 * Extended-hours quote — pulls Yahoo's `v7/finance/quote` endpoint which
 * exposes the regular session price plus the pre-market and after-hours
 * prices (when applicable) and the current market state.
 *
 * Why we need this: the chart API (fetchYahooQuote) only returns the
 * regular-session number. From 04:00–09:30 ET and 16:00–20:00 ET US stocks
 * trade in extended hours and the regular price is stale — Yahoo Finance
 * shows the pre/post-market price as a sub-line under the headline number.
 * Mimicking that gives Israeli day-traders the same intra-session signal
 * (TASE morning hours overlap with US pre-market).
 *
 * marketState values: PRE | REGULAR | POST | POSTPOST | CLOSED | PREPRE
 *   PRE       — pre-market window active
 *   REGULAR   — normal session
 *   POST      — after-hours window active
 *   POSTPOST  — past after-hours but before next pre-market
 *   CLOSED    — overnight / weekend
 *   PREPRE    — between sessions in extended hours
 */
export interface ExtendedQuote {
  regularPrice: number;
  regularChange: number;
  regularChangePct: number;
  regularTime: number | null;
  marketState: string;
  preMarketPrice: number | null;
  preMarketChange: number | null;
  preMarketChangePct: number | null;
  preMarketTime: number | null;
  postMarketPrice: number | null;
  postMarketChange: number | null;
  postMarketChangePct: number | null;
  postMarketTime: number | null;
}

export async function fetchYahooExtendedQuote(
  symbol: string,
  revalidate = 60, // 1 min — pre/post-market prices tick in real time
): Promise<ExtendedQuote | null> {
  try {
    let auth = await getYahooCrumb();
    if (!auth) return null;

    const buildUrl = (crumb: string) =>
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&crumb=${encodeURIComponent(crumb)}`;

    let r = await fetch(buildUrl(auth.crumb), {
      headers: { 'User-Agent': YAHOO_UA, Accept: 'application/json', Cookie: auth.cookie },
      next: { revalidate },
    });
    // Stale-crumb retry, same pattern as fetchYahooPE.
    if (r.status === 401) {
      auth = await getYahooCrumb(true);
      if (!auth) return null;
      r = await fetch(buildUrl(auth.crumb), {
        headers: { 'User-Agent': YAHOO_UA, Accept: 'application/json', Cookie: auth.cookie },
        next: { revalidate },
      });
    }
    if (!r.ok) return null;

    const json = await r.json();
    const q = json?.quoteResponse?.result?.[0];
    if (!q) return null;

    const regularPrice = Number(q.regularMarketPrice);
    if (!Number.isFinite(regularPrice) || regularPrice <= 0) return null;

    const num = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const time = (v: unknown): number | null => {
      const n = Number(v);
      // Yahoo returns Unix seconds; convert to ms for JS Date consistency.
      return Number.isFinite(n) && n > 0 ? n * 1000 : null;
    };

    return {
      regularPrice,
      regularChange: num(q.regularMarketChange) ?? 0,
      regularChangePct: num(q.regularMarketChangePercent) ?? 0,
      regularTime: time(q.regularMarketTime),
      marketState: String(q.marketState ?? 'CLOSED'),
      preMarketPrice: num(q.preMarketPrice),
      preMarketChange: num(q.preMarketChange),
      preMarketChangePct: num(q.preMarketChangePercent),
      preMarketTime: time(q.preMarketTime),
      postMarketPrice: num(q.postMarketPrice),
      postMarketChange: num(q.postMarketChange),
      postMarketChangePct: num(q.postMarketChangePercent),
      postMarketTime: time(q.postMarketTime),
    };
  } catch {
    return null;
  }
}

/**
 * Ownership breakdown for an equity — pulls Yahoo's `majorHoldersBreakdown`
 * module which returns the same numbers users see on Yahoo Finance's
 * "Holders" tab. We use it to render the per-stock ownership pie.
 *
 *   - insiders:        officers, directors, employee shareholders (often <5%)
 *   - institutions:    mutual funds, ETFs, pension funds (Vanguard, BlackRock…)
 *   - public:          retail + everyone else (computed as 100 - other two)
 *
 * Yahoo doesn't expose this module for ETFs (SPY, QQQ, EIS) because the
 * concept doesn't apply — those holdings ARE the institutional structure.
 * Returns null in that case; the UI hides the widget gracefully.
 */
export interface OwnershipBreakdown {
  insidersPct: number;          // 0-100
  institutionsPct: number;      // 0-100
  publicPct: number;            // 0-100 (derived)
  institutionsFloatPct: number | null;
  institutionsCount: number | null;
}

export async function fetchYahooOwnership(
  symbol: string,
  revalidate = 21600, // 6h — ownership shifts slowly (13F filings are quarterly)
): Promise<OwnershipBreakdown | null> {
  try {
    let auth = await getYahooCrumb();
    if (!auth) return null;

    let r = await quoteSummaryRaw(symbol, auth, revalidate, 'majorHoldersBreakdown');
    if (r.status === 401) {
      auth = await getYahooCrumb(true);
      if (!auth) return null;
      r = await quoteSummaryRaw(symbol, auth, revalidate, 'majorHoldersBreakdown');
    }
    if (!r.ok) return null;

    const json = await r.json();
    const breakdown = json?.quoteSummary?.result?.[0]?.majorHoldersBreakdown;
    if (!breakdown) return null;

    const insidersRaw = Number(breakdown.insidersPercentHeld?.raw);
    const institutionsRaw = Number(breakdown.institutionsPercentHeld?.raw);
    const institutionsFloatRaw = Number(breakdown.institutionsFloatPercentHeld?.raw);
    const institutionsCount = Number(breakdown.institutionsCount?.raw);

    if (!Number.isFinite(insidersRaw) && !Number.isFinite(institutionsRaw)) {
      return null;
    }

    // Yahoo's numbers occasionally sum past 100% — happens for dual-listed
    // names like WIX (raw 152% institutional) where the same shares get
    // counted in two places (ADR conversions, ownership-of-ownership chains).
    // Clamp each segment so we always render a sane pie:
    //   insiders     ∈ [0, 100]
    //   institutions ∈ [0, 100 - insiders]   ← can't fill more than the rest
    //   public       ∈ [0, 100 - others]
    const rawInsiders = Number.isFinite(insidersRaw) ? insidersRaw * 100 : 0;
    const rawInstitutions = Number.isFinite(institutionsRaw) ? institutionsRaw * 100 : 0;
    const insidersPct = Math.max(0, Math.min(100, rawInsiders));
    const institutionsPct = Math.max(0, Math.min(100 - insidersPct, rawInstitutions));
    const publicPct = Math.max(0, 100 - insidersPct - institutionsPct);

    return {
      insidersPct,
      institutionsPct,
      publicPct,
      institutionsFloatPct: Number.isFinite(institutionsFloatRaw) ? institutionsFloatRaw * 100 : null,
      institutionsCount: Number.isFinite(institutionsCount) ? institutionsCount : null,
    };
  } catch {
    return null;
  }
}

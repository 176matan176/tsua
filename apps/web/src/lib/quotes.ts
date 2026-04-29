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
 * Returns null when the symbol isn't covered or the request fails.
 */
export async function fetchYahooPE(
  symbol: string,
  revalidate = 21600,
): Promise<{ trailingPE: number | null; forwardPE: number | null } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsuaBot/1.0; +https://tsua-rho.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate },
    });
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

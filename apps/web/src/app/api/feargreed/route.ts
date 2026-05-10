import { NextResponse } from 'next/server';

/**
 * Stock-market Fear & Greed proxy.
 *
 * We previously used alternative.me's FNG, but that's a *crypto* sentiment
 * index — wildly misleading on a stock-trading platform (it can read
 * "Extreme Fear" while equities are at all-time highs). CNN's index is the
 * de-facto standard for US equities and is sourced from seven equity-market
 * indicators (momentum, breadth, junk-bond demand, VIX, etc.).
 *
 * The dataviz endpoint isn't officially documented but is the same one
 * cnn.com itself calls. It refuses obvious bot traffic with 418, so we
 * spoof a real Chrome request and include the Referer/Origin headers it
 * looks for. The data returns ~once per market day.
 */
export const revalidate = 1800; // 30 min — CNN updates intraday but slowly

interface CNNPayload {
  fear_and_greed?: {
    score?: number;
    rating?: string;
    timestamp?: string;
    previous_close?: number;
    previous_1_week?: number;
    previous_1_month?: number;
    previous_1_year?: number;
  };
}

const RATING_TO_EN: Record<string, string> = {
  'extreme fear':  'Extreme Fear',
  'fear':          'Fear',
  'neutral':       'Neutral',
  'greed':         'Greed',
  'extreme greed': 'Extreme Greed',
};

export async function GET() {
  try {
    const r = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      headers: {
        // CNN's edge returns 418 to bot UAs. Pretend to be desktop Chrome
        // navigating from cnn.com's own fear-and-greed page.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://edition.cnn.com/markets/fear-and-greed',
        'Origin': 'https://edition.cnn.com',
      },
      next: { revalidate: 1800 },
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `upstream ${r.status}` }, { status: 502 });
    }
    const json = (await r.json()) as CNNPayload;
    const fg = json.fear_and_greed;
    const rawScore = Number(fg?.score);
    if (!fg || !Number.isFinite(rawScore)) {
      return NextResponse.json({ ok: false, error: 'no data' }, { status: 502 });
    }

    // Round score to nearest integer for the headline reading; keep the
    // exact value as `scoreExact` so we can plot the bar dot precisely.
    const value = Math.round(rawScore);
    const rating = (fg.rating ?? '').toLowerCase().trim();
    const classification = RATING_TO_EN[rating] ?? 'Neutral';

    return NextResponse.json({
      ok: true,
      value,
      scoreExact: rawScore,
      classification,
      previousClose: Number.isFinite(Number(fg.previous_close)) ? Math.round(Number(fg.previous_close)) : null,
      previousWeek:  Number.isFinite(Number(fg.previous_1_week))  ? Math.round(Number(fg.previous_1_week))  : null,
      previousMonth: Number.isFinite(Number(fg.previous_1_month)) ? Math.round(Number(fg.previous_1_month)) : null,
      updatedAt: fg.timestamp ? Date.parse(fg.timestamp) : Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 },
    );
  }
}

import { NextResponse } from 'next/server';

/**
 * Fear & Greed proxy.
 *
 * The route at the previous path `/api/markets/feargreed` was permanently
 * 404'd by Vercel's edge cache (10-day-old cached 404 even after the route
 * was committed and pushed). Moving to a fresh path bypasses that stuck
 * edge cache. We also dropped the `force-dynamic` + `revalidate` combo —
 * `revalidate` alone is sufficient and Next 14.2 sometimes mishandles the
 * combination during the route-manifest stage of a Vercel build.
 *
 * Why proxy at all (instead of fetching alternative.me from the browser):
 *   - Hides visitor IPs from a third party
 *   - Single shared cache across all clients
 *   - Honest `{ ok: false }` failure mode rather than fabricating data
 */
export const revalidate = 1800; // 30 min — FNG updates daily

interface FNGItem {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FNGPayload {
  data?: FNGItem[];
}

export async function GET() {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: { 'User-Agent': 'TsuaBot/1.0 (+https://tsua-rho.vercel.app)' },
      next: { revalidate: 1800 },
    });
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `upstream ${r.status}` }, { status: 502 });
    }
    const json = (await r.json()) as FNGPayload;
    const item = json.data?.[0];
    if (!item) {
      return NextResponse.json({ ok: false, error: 'no data' }, { status: 502 });
    }
    const value = Number(item.value);
    if (!Number.isFinite(value)) {
      return NextResponse.json({ ok: false, error: 'bad value' }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      value,
      classification: item.value_classification,
      updatedAt: Number(item.timestamp) * 1000,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 },
    );
  }
}

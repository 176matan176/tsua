import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// FNG updates daily — half-hour cache is plenty and saves us hammering
// alternative.me from every visitor.
export const revalidate = 1800;

interface FNGItem {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FNGPayload {
  data?: FNGItem[];
}

/**
 * GET /api/markets/feargreed
 *
 * Server-side proxy for the Alternative.me Fear & Greed index.
 *
 * Why proxy instead of the client hitting alternative.me directly:
 *   - Hides visitor IPs from a third party.
 *   - Single shared cache across all clients (revalidate above).
 *   - Lets us tighten `connect-src` in CSP later without breaking the widget.
 *   - Returns `{ ok: false }` honestly on failure rather than fabricating
 *     a "neutral 52" reading that misleads users.
 */
export async function GET() {
  try {
    const r = await fetch('https://api.alternative.me/fng/?limit=1', {
      headers: {
        'User-Agent': 'TsuaBot/1.0 (+https://tsua-rho.vercel.app)',
      },
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

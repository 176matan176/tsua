// apps/web/src/app/api/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IL_UNIVERSE, US_UNIVERSE, type UniverseStock } from '@/lib/hotStocks';

export const revalidate = 3600; // 1-hour ISR cache — earnings calendar rarely changes intraday

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

interface FinnhubEarning {
  date: string;           // YYYY-MM-DD
  symbol: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh' | '';  // before market open / after market close / during market hours
  quarter: number;
  year: number;
}

export interface EarningEntry extends FinnhubEarning {
  nameHe: string;
  nameEn: string;
  exchange: string;
  isIsraeli: boolean;
}

const UNIVERSE_MAP: Map<string, UniverseStock & { isIsraeli: boolean }> = new Map();
for (const s of IL_UNIVERSE) UNIVERSE_MAP.set(s.ticker, { ...s, isIsraeli: true });
for (const s of US_UNIVERSE) UNIVERSE_MAP.set(s.ticker, { ...s, isIsraeli: false });

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: 'Missing FINNHUB_API_KEY' }, { status: 500 });
  }

  const range = req.nextUrl.searchParams.get('range') ?? 'week'; // week | month
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all';   // all | il | us

  const now = new Date();
  const from = fmtDate(now);
  const toDate = new Date(now);
  toDate.setDate(toDate.getDate() + (range === 'month' ? 30 : 7));
  const to = fmtDate(toDate);

  try {
    const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'Finnhub fetch failed' }, { status: 502 });
    }
    const data = await res.json() as { earningsCalendar: FinnhubEarning[] };

    // Merge metadata, filter by universe
    const entries: EarningEntry[] = [];
    for (const e of data.earningsCalendar ?? []) {
      const meta = UNIVERSE_MAP.get(e.symbol);
      if (!meta) continue;
      if (filter === 'il' && !meta.isIsraeli) continue;
      if (filter === 'us' && meta.isIsraeli) continue;
      entries.push({
        ...e,
        nameHe: meta.nameHe,
        nameEn: meta.nameEn,
        exchange: meta.exchange,
        isIsraeli: meta.isIsraeli,
      });
    }

    // Sort chronologically, then by hour (bmo first, dmh, amc last)
    const hourRank = { bmo: 0, dmh: 1, '': 2, amc: 3 } as const;
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (hourRank[a.hour] ?? 2) - (hourRank[b.hour] ?? 2);
    });

    return NextResponse.json({
      from,
      to,
      filter,
      range,
      count: entries.length,
      entries,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch earnings', details: String(err) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { fetchAllMacro } from '@/lib/macroData';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour — these indicators update monthly

export async function GET() {
  try {
    const indicators = await fetchAllMacro();
    return NextResponse.json({
      indicators,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({
      indicators: [],
      error: 'fetch_failed',
    }, { status: 500 });
  }
}

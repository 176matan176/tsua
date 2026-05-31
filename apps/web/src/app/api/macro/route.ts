import { NextResponse } from 'next/server';
import { fetchAllMacro } from '@/lib/macroData';

// `force-dynamic` defeats ISR — use revalidate alone (indicators update monthly).
export const revalidate = 3600;

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

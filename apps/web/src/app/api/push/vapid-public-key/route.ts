import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/push/vapid-public-key — returns VAPID public key for client subscription
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_KEY;
  if (!key) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey: key });
}

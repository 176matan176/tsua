import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/profile/by-code?code=<referral_code>
// Used to display "you were invited by @username" banner on signup page
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const normalized = code.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('username, display_name')
      .eq('referral_code', normalized)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      username: data.username,
      displayName: data.display_name,
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rateLimit';

// Per-user authenticated mutation — never ISR-cached.
export const dynamic = 'force-dynamic';

function createSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
}

/**
 * POST /api/posts/[id]/report — file a moderation report for a post.
 *
 * Thin wrapper around the `report_post` RPC, which does the heavy lifting:
 *   - enforces the reason taxonomy
 *   - rejects self-reports
 *   - upserts so a re-report just refreshes the existing row
 *   - returns a structured envelope
 *
 * The RPC needs `reports_migration.sql` to be applied — until it lands on
 * the production DB this route returns 503 instead of pretending to work.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // 5 reports per minute per user — generous for a single person reviewing a
  // thread, tight enough that an account can't spray reports as harassment.
  const rl = rateLimit(req, { limit: 5, windowMs: 60 * 1000, identity: user.id });
  if (!rl.success) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const reason = typeof body.reason === 'string' ? body.reason : null;
  const details = typeof body.details === 'string' ? body.details.slice(0, 1000) : null;

  if (!reason) {
    return NextResponse.json({ error: 'reason_required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('report_post', {
    p_post_id: params.id,
    p_reason: reason,
    p_details: details,
  });

  if (error) {
    // The RPC may not be present yet (migration not applied). Surface a
    // distinct status so the client knows to not retry endlessly.
    if (/function .* does not exist/i.test(error.message)) {
      return NextResponse.json(
        { ok: false, error: 'reporting_unavailable' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // The RPC returns its own envelope { ok, error?, report_id? } — pass through.
  return NextResponse.json(data);
}

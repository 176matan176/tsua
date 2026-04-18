import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/referral — current user's code + stats
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, referral_credits')
    .eq('id', user.id)
    .single();

  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', user.id);

  return NextResponse.json({
    code: profile?.referral_code ?? null,
    credits: profile?.referral_credits ?? 0,
    invites: count ?? 0,
    link: profile?.referral_code ? `https://tsua.co/he/signup?ref=${profile.referral_code}` : null,
  });
}

// POST /api/referral — redeem a referral code (called on signup completion)
// body: { code: string }
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const normalized = code.trim().toLowerCase();

  // Use admin client to bypass RLS for lookup + insert
  const admin = createAdminClient();

  // Prevent self-referral
  const { data: me } = await admin
    .from('profiles')
    .select('id, referral_code, referred_by')
    .eq('id', user.id)
    .single();

  if (me?.referred_by) {
    return NextResponse.json({ ok: false, reason: 'already_referred' });
  }
  if (me?.referral_code === normalized) {
    return NextResponse.json({ ok: false, reason: 'self_referral' }, { status: 400 });
  }

  // Find referrer
  const { data: referrer } = await admin
    .from('profiles')
    .select('id, referral_code, username')
    .eq('referral_code', normalized)
    .single();

  if (!referrer) {
    return NextResponse.json({ ok: false, reason: 'invalid_code' }, { status: 404 });
  }

  // Link referred_by on user + insert referral row (trigger awards credit)
  const { error: updErr } = await admin
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', user.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const { error: insErr } = await admin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    code_used: normalized,
    credit_awarded: 1,
  });

  if (insErr && !insErr.message.includes('duplicate')) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, referrer: referrer.username });
}

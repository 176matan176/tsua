/**
 * GET /api/push/test — שולח התראת "חדשות מתפרצות" לדוגמה לכל המכשירים
 * הרשומים של המשתמש המחובר. משמש לבדיקת צינור ה-Web Push מקצה לקצה
 * לפני חיבור מנוע ה-AI האמיתי (/api/cron/breaking-news).
 *
 * שימוש: התחבר לאתר בנייד → הפעל התראות במסך ההתראות → גלוש לכתובת הזו.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/pushSender';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized — יש להתחבר קודם' }, { status: 401 });
  }

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'אין מנוי התראות למשתמש הזה במכשיר כלשהו',
        hint: 'פתח את מסך ההתראות (/he/alerts), הפעל "התראות בדפדפן", ונסה שוב',
      },
      { status: 404 },
    );
  }

  const payload = {
    title: '🚨 חדשות מתפרצות — בדיקה',
    body: 'טראמפ הכריז על מכסים חדשים על סין - המדדים מגיבים בירידות חדות. ($SPY, $QQQ)',
    url: '/he',
    tag: 'breaking-news-test',
  };

  const results = await Promise.allSettled(subs.map((s) => sendPushNotification(s, payload)));
  const outcomes = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { ok: false, error: String(r.reason) },
  );
  const delivered = outcomes.filter((o) => o.ok).length;

  return NextResponse.json({
    ok: delivered > 0,
    devices: subs.length,
    delivered,
    failures: outcomes.filter((o) => !o.ok),
  });
}

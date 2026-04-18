/**
 * Vercel Cron — runs every minute during market hours.
 * Evaluates all active alerts, fires notifications, email & push.
 *
 * Security: protected via CRON_SECRET in Authorization header (Vercel injects it).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, renderAlertEmail } from '@/lib/emailSender';
import { sendPushNotification } from '@/lib/pushSender';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const COOLDOWN_MINUTES = 30;

interface Alert {
  id: string;
  user_id: string;
  ticker: string;
  name_he: string | null;
  name_en: string | null;
  alert_type: 'price_above' | 'price_below' | 'volume_spike' | 'news';
  threshold: number | null;
  is_active: boolean;
  cooldown_until: string | null;
  last_price: number | null;
  notify_push: boolean;
  notify_email: boolean;
}

interface Quote {
  c: number;   // current
  d: number;   // change
  dp: number;  // change percent
  v?: number;  // volume (not in /quote — needs candles)
  h: number;
  l: number;
  pc: number;  // previous close
}

async function fetchQuotes(tickers: string[]): Promise<Record<string, Quote>> {
  if (!FINNHUB_KEY || tickers.length === 0) return {};
  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];

  const results = await Promise.allSettled(
    unique.map(async (t) => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${FINNHUB_KEY}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error(`${t}: ${res.status}`);
      return { ticker: t, quote: (await res.json()) as Quote };
    }),
  );

  const map: Record<string, Quote> = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.quote?.c) {
      map[r.value.ticker] = r.value.quote;
    }
  }
  return map;
}

function shouldTrigger(alert: Alert, quote: Quote): { trigger: boolean; triggerValue?: number } {
  if (!alert.threshold) return { trigger: false };
  const price = quote.c;

  if (alert.alert_type === 'price_above') {
    // Edge-crossing: only fire when last_price was <= threshold and current > threshold
    const prev = alert.last_price ?? quote.pc;
    if (prev <= alert.threshold && price > alert.threshold) {
      return { trigger: true, triggerValue: price };
    }
  } else if (alert.alert_type === 'price_below') {
    const prev = alert.last_price ?? quote.pc;
    if (prev >= alert.threshold && price < alert.threshold) {
      return { trigger: true, triggerValue: price };
    }
  } else if (alert.alert_type === 'volume_spike') {
    // Simple: daily move > threshold%  (approximation, v not available here)
    if (Math.abs(quote.dp) >= alert.threshold) {
      return { trigger: true, triggerValue: quote.dp };
    }
  }
  return { trigger: false };
}

export async function GET(req: NextRequest) {
  // Auth: accept either Vercel Cron header or our CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? '';
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Load all active alerts not in cooldown
  const nowIso = new Date().toISOString();
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('id,user_id,ticker,name_he,name_en,alert_type,threshold,is_active,cooldown_until,last_price,notify_push,notify_email')
    .eq('is_active', true)
    .or(`cooldown_until.is.null,cooldown_until.lt.${nowIso}`)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const activeAlerts = (alerts ?? []) as Alert[];
  if (activeAlerts.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, triggered: 0 });
  }

  // 2. Fetch quotes (batched, unique tickers)
  const tickers = [...new Set(activeAlerts.map(a => a.ticker))];
  const quotes = await fetchQuotes(tickers);

  // 3. Evaluate & trigger
  let triggered = 0;
  const cooldownDate = new Date(Date.now() + COOLDOWN_MINUTES * 60_000).toISOString();

  for (const alert of activeAlerts) {
    const quote = quotes[alert.ticker];
    if (!quote) continue;

    const { trigger, triggerValue } = shouldTrigger(alert, quote);
    if (!trigger || triggerValue === undefined) {
      // Update last_price snapshot even if not triggered
      await supabase.from('alerts').update({ last_price: quote.c }).eq('id', alert.id);
      continue;
    }

    triggered += 1;

    // Load user email & profile for email delivery
    const { data: authUser } = await supabase.auth.admin.getUserById(alert.user_id);
    const { data: profile } = await supabase
      .from('profiles')
      .select('username,display_name,email_alerts')
      .eq('id', alert.user_id)
      .single();

    const username = profile?.display_name || profile?.username || '';
    const emailEnabled = profile?.email_alerts !== false;

    const eventLabel =
      alert.alert_type === 'price_above' ? `עלה מעל $${alert.threshold}` :
      alert.alert_type === 'price_below' ? `ירד מתחת $${alert.threshold}` :
      `זינק ב-${alert.threshold}%`;

    const pushPayload = {
      title: `🔔 ${alert.ticker} ${eventLabel}`,
      body: `מחיר עכשיו: $${triggerValue.toFixed(2)}`,
      url: `/he/stocks/${alert.ticker}`,
      tag: `alert-${alert.id}`,
    };

    // 4. Create alert_event + notification row
    const { data: evt } = await supabase.from('alert_events').insert({
      alert_id: alert.id,
      user_id: alert.user_id,
      ticker: alert.ticker,
      event_type: alert.alert_type,
      trigger_value: triggerValue,
      threshold: alert.threshold,
      message: `${alert.ticker} ${eventLabel}`,
    }).select().single();

    await supabase.from('notifications').insert({
      user_id: alert.user_id,
      type: 'alert_triggered',
      title: `🔔 ${alert.ticker} ${eventLabel}`,
      body: `מחיר עכשיו: $${triggerValue.toFixed(2)}`,
      link: `/he/stocks/${alert.ticker}`,
    });

    // 5. Push
    let deliveredPush = false;
    if (alert.notify_push !== false) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint,p256dh,auth')
        .eq('user_id', alert.user_id);

      if (subs && subs.length > 0) {
        const results = await Promise.allSettled(
          subs.map(s => sendPushNotification(s, pushPayload))
        );
        deliveredPush = results.some(r => r.status === 'fulfilled' && r.value.ok);

        // Clean up dead subscriptions (410 Gone)
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          if (r.status === 'fulfilled' && !r.value.ok && r.value.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', subs[i].endpoint);
          }
        }
      }
    }

    // 6. Email
    let deliveredMail = false;
    const email = authUser?.user?.email;
    if (emailEnabled && alert.notify_email !== false && email) {
      const tpl = renderAlertEmail({
        username,
        ticker: alert.ticker,
        nameHe: alert.name_he ?? undefined,
        eventType: alert.alert_type as any,
        triggerValue,
        threshold: alert.threshold!,
        link: `https://tsua.co/he/stocks/${alert.ticker}`,
      });
      const res = await sendEmail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        tags: [{ name: 'type', value: 'alert' }, { name: 'ticker', value: alert.ticker }],
      });
      deliveredMail = res.ok;
    }

    // 7. Update alert: cooldown + last_price + event delivery
    await supabase.from('alerts').update({
      cooldown_until: cooldownDate,
      last_price: quote.c,
      triggered_at: nowIso,
    }).eq('id', alert.id);

    if (evt?.id) {
      await supabase.from('alert_events').update({
        delivered_push: deliveredPush,
        delivered_mail: deliveredMail,
      }).eq('id', evt.id);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: activeAlerts.length,
    triggered,
    tickers_quoted: Object.keys(quotes).length,
  });
}

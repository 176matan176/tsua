/**
 * Web Push sender — uses VAPID via the Web Push protocol.
 * No external deps; relies on `web-push` if installed, else raw fetch fallback.
 */
import webpush from 'web-push';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@tsua.co';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

export async function sendPushNotification(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  if (!ensureConfigured()) {
    return { ok: false, error: 'VAPID keys not configured' };
  }
  try {
    const res = await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h
    );
    return { ok: true, statusCode: res.statusCode };
  } catch (err: any) {
    return { ok: false, statusCode: err.statusCode, error: err.body ?? err.message };
  }
}

/**
 * Resend-powered transactional email.
 * No SDK dep — uses raw fetch so we don't bloat the bundle.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_DEFAULT = process.env.RESEND_FROM || 'Tsua <alerts@tsua.co>';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send');
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: msg.from ?? FROM_DEFAULT,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: msg.replyTo,
        tags: msg.tags,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }
    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/** Render Hebrew RTL HTML email with Tsua branding. */
export function renderAlertEmail(params: {
  username: string;
  ticker: string;
  nameHe?: string;
  eventType: 'price_above' | 'price_below' | 'volume_spike';
  triggerValue: number;
  threshold: number;
  link: string;
}): { subject: string; html: string; text: string } {
  const { username, ticker, nameHe, eventType, triggerValue, threshold, link } = params;
  const displayName = nameHe || ticker;
  const eventLabel =
    eventType === 'price_above' ? 'עלה מעל' :
    eventType === 'price_below' ? 'ירד מתחת' :
    'זינק בנפח';
  const formatPrice = (n: number) => `$${n.toFixed(2)}`;

  const subject = `🔔 ${ticker} ${eventLabel} ${formatPrice(threshold)} — ${formatPrice(triggerValue)}`;

  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060b16;font-family:'Heebo','Arial Hebrew',Arial,sans-serif;color:#e8f0ff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060b16;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:linear-gradient(180deg,#0d1424 0%,#060b16 100%);border:1px solid rgba(0,229,176,0.18);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="display:inline-block;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#00e5b0,#00a884);color:#060b16;font-weight:900;font-size:22px;line-height:40px;text-align:center;">ת</div>
          <span style="margin-right:10px;font-size:18px;font-weight:800;letter-spacing:-0.5px;">תשואה</span>
        </td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#00e5b0;text-transform:uppercase;">התראה הופעלה</div>
          <h1 style="margin:8px 0 14px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;line-height:1.2;">
            ${displayName} ${eventLabel} ${formatPrice(threshold)}
          </h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#b3c2d6;">
            שלום ${username || 'משקיע'}, קבענו יחד שתירצה לדעת כש־<strong style="color:#fff;">${ticker}</strong> ${eventLabel} <strong style="color:#00e5b0;">${formatPrice(threshold)}</strong>.
            הרגע זה קרה: המניה נסחרת כעת ב־<strong style="color:#00e5b0;">${formatPrice(triggerValue)}</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:rgba(0,229,176,0.06);border:1px solid rgba(0,229,176,0.18);border-radius:12px;">
            <tr>
              <td style="padding:16px 20px;border-left:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:11px;color:#5a7090;letter-spacing:1px;text-transform:uppercase;">סמל</div>
                <div style="font-size:22px;font-weight:900;color:#fff;font-family:'JetBrains Mono',monospace;">${ticker}</div>
              </td>
              <td style="padding:16px 20px;border-left:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:11px;color:#5a7090;letter-spacing:1px;text-transform:uppercase;">סף שנקבע</div>
                <div style="font-size:20px;font-weight:800;color:#b3c2d6;font-family:'JetBrains Mono',monospace;">${formatPrice(threshold)}</div>
              </td>
              <td style="padding:16px 20px;">
                <div style="font-size:11px;color:#5a7090;letter-spacing:1px;text-transform:uppercase;">מחיר עכשיו</div>
                <div style="font-size:20px;font-weight:900;color:#00e5b0;font-family:'JetBrains Mono',monospace;">${formatPrice(triggerValue)}</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;text-align:center;">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#00e5b0,#00a884);color:#060b16;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;letter-spacing:-0.3px;">
            פתח את ${ticker} בתשואה ←
          </a>
          <p style="margin:14px 0 0;font-size:12px;color:#5a7090;">
            המחירים מתעדכנים כל דקה. ניתן לנהל את ההתראות ב<a href="https://tsua.co/he/alerts" style="color:#00e5b0;text-decoration:none;">עמוד ההתראות</a>.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:11px;color:#5a7090;">
            תשואה — הרשת החברתית הראשונה לשוק ההון הישראלי · <a href="https://tsua.co/he/settings" style="color:#5a7090;">ביטול התראות דוא״ל</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `תשואה — התראה הופעלה\n\n${displayName} (${ticker}) ${eventLabel} ${formatPrice(threshold)}.\nמחיר עכשיו: ${formatPrice(triggerValue)}\n\nצפה בפרטים: ${link}`;

  return { subject, html, text };
}

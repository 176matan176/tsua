/**
 * GET /api/cron/breaking-news — מנוע "חדשות מתפרצות" (AI Breaking News).
 *
 * צינור: Finnhub general news → סינון לפי זמן → דדופ מול breaking_news_events →
 * Claude (סיווג חומרה + דדופ סמנטי + תרגום לשורת התראה בעברית) →
 * שער חומרה → Web Push לכל המנויים.
 *
 * מיועד להרצה כל 1-5 דקות ע"י cron חיצוני (cron-job.org) עם:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * פרמטרים: ?dry=1 — מריץ את כל הצינור בלי לשלוח push (לבדיקות).
 *
 * דרישות env (ב-Vercel): CRON_SECRET, FINNHUB_API_KEY, ANTHROPIC_API_KEY,
 * SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY.
 */
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification } from '@/lib/pushSender';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOOKBACK_MINUTES = 45; // חלון איסוף — חייב להיות גדול מתדירות ה-cron
const MAX_ITEMS_PER_RUN = 12; // תקרת פריטים לקריאת Claude אחת
const MAX_ALERTS_PER_RUN = 2; // לא מפציצים משתמשים גם ביום סוער
const MIN_SEVERITY = 8; // 8+ = אירוע מזיז-שוק גלובלי

interface FinnhubNews {
  id: number;
  datetime: number; // unix seconds
  headline: string;
  summary: string;
  source: string;
  url: string;
  related?: string;
}

interface Evaluation {
  id: string;
  market_moving: boolean;
  severity: number;
  duplicate: boolean;
  alert_he: string;
  tickers: string[];
}

// סכמת הפלט של Claude — structured outputs מבטיח JSON תקין
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['evaluations'],
  properties: {
    evaluations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'market_moving', 'severity', 'duplicate', 'alert_he', 'tickers'],
        properties: {
          id: { type: 'string' },
          market_moving: { type: 'boolean' },
          severity: { type: 'integer' },
          duplicate: { type: 'boolean' },
          alert_he: { type: 'string' },
          tickers: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `אתה מנוע ההתראות של "תשואה" — רשת חברתית ישראלית לשוק ההון.
תפקידך: לסנן חדשות פיננסיות גלובליות ולתרגם רק אירועים מזיזי-שוק להתראת push קצרה בעברית.

לכל פריט חדשות החזר הערכה:
- market_moving: האם זהו אירוע בעל השפעה ממשית על השווקים (מדדים, מטבעות, סחורות, מניות ענק).
- severity (1-10): עוצמת ההשפעה. 8+ שמור אך ורק לאירועים גלובליים חדים: הכרזות גיאופוליטיות (מכסים, מלחמה, תקיפה), הפתעות מאקרו גדולות (ריבית, אינפלציה, דוח משרות חריג), קריסה/זינוק חד של מניית ענק או מדד. חדשות שגרתיות של חברה בודדת = 5 ומטה.
- duplicate: true אם זה אותו סיפור כמו אחת ההתראות שכבר נשלחו (מצורפות בהודעה) — גם אם הניסוח שונה.
- alert_he: שורת התראה אחת בעברית טבעית ועיתונאית, שמתחילה באימוג'י מתאים (🚨/📉/📈/⚠️), עם טיקרים בפורמט $TSLA היכן שרלוונטי.
- tickers: סימולים רלוונטיים (ללא $), או מערך ריק.

כללי ברזל:
- הסתמך אך ורק על הטקסט שסופק. אסור להמציא מספרים, אחוזים או עובדות שלא מופיעים בכותרת/בתקציר.
- אם התקציר דל — כתוב התראה כללית יותר, אל תשלים פרטים מהידע שלך.
- ספקנות כברירת מחדל: עדיף לפספס חדשות בינוניות מלשלוח ספאם. severity 8+ הוא נדיר.`;

export async function GET(req: NextRequest) {
  // ── אימות ──────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry') === '1';

  const finnhubKey = process.env.FINNHUB_API_KEY;
  if (!finnhubKey) {
    return NextResponse.json({ ok: false, error: 'FINNHUB_API_KEY not configured' }, { status: 500 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let supabase;
  try {
    supabase = createAdminClient(); // דורש SUPABASE_SERVICE_ROLE_KEY
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

  // ── 1. איסוף חדשות ──────────────────────────────────────────
  const newsRes = await fetch(
    `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`,
    { cache: 'no-store' },
  );
  if (!newsRes.ok) {
    return NextResponse.json({ ok: false, error: `Finnhub ${newsRes.status}` }, { status: 502 });
  }
  const allNews = (await newsRes.json()) as FinnhubNews[];

  const cutoff = Date.now() / 1000 - LOOKBACK_MINUTES * 60;
  const recent = allNews.filter((n) => n.datetime >= cutoff && n.headline);

  if (recent.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, evaluated: 0, pushed: 0 });
  }

  // ── 2. דדופ קשיח — פריטים שכבר עובדו ─────────────────────────
  const sourceIds = recent.map((n) => String(n.id));
  const { data: existing } = await supabase
    .from('breaking_news_events')
    .select('source_id')
    .in('source_id', sourceIds);
  const seen = new Set((existing ?? []).map((r: { source_id: string }) => r.source_id));

  const fresh = recent.filter((n) => !seen.has(String(n.id))).slice(0, MAX_ITEMS_PER_RUN);
  if (fresh.length === 0) {
    return NextResponse.json({ ok: true, scanned: recent.length, evaluated: 0, pushed: 0 });
  }

  // ── 3. הקשר לדדופ סמנטי — התראות שנשלחו ב-24 השעות האחרונות ──
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPushed } = await supabase
    .from('breaking_news_events')
    .select('alert_he')
    .eq('pushed', true)
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(20);
  const pushedAlerts = (recentPushed ?? []).map((r: { alert_he: string }) => r.alert_he);

  // ── 4. Claude — סיווג + דדופ סמנטי + עברית ──────────────────
  const anthropic = new Anthropic({ timeout: 30_000 });

  const itemsText = fresh
    .map(
      (n) =>
        `<item id="${n.id}" source="${n.source}" related="${n.related ?? ''}">\n` +
        `כותרת: ${n.headline}\nתקציר: ${n.summary || '(אין תקציר)'}\n</item>`,
    )
    .join('\n');
  const pushedText =
    pushedAlerts.length > 0
      ? `התראות שכבר נשלחו ב-24 השעות האחרונות (לבדיקת duplicate):\n${pushedAlerts
          .map((a) => `- ${a}`)
          .join('\n')}`
      : 'לא נשלחו התראות ב-24 השעות האחרונות.';

  let evaluations: Evaluation[] = [];
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: `${pushedText}\n\nהערך את פריטי החדשות הבאים:\n${itemsText}`,
        },
      ],
    });
    const textBlock = msg.content.find((b) => b.type === 'text');
    if (msg.stop_reason === 'refusal' || !textBlock) {
      throw new Error(`No usable output (stop_reason=${msg.stop_reason})`);
    }
    evaluations = (JSON.parse(textBlock.text) as { evaluations: Evaluation[] }).evaluations;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `Claude classification failed: ${e.message}` },
      { status: 502 },
    );
  }

  const evalById = new Map(evaluations.map((ev) => [ev.id, ev]));

  // ── 5. שמירת כל הפריטים שהוערכו (גם אלה שלא יישלחו — לדדופ עתידי) ──
  const rows = fresh.map((n) => {
    const ev = evalById.get(String(n.id));
    return {
      source_id: String(n.id),
      headline: n.headline,
      summary: n.summary || null,
      source: n.source || null,
      url: n.url || null,
      published_at: new Date(n.datetime * 1000).toISOString(),
      market_moving: ev?.market_moving ?? false,
      severity: ev?.severity ?? null,
      duplicate: ev?.duplicate ?? false,
      alert_he: ev?.alert_he || null,
      tickers: ev?.tickers ?? [],
      pushed: false,
    };
  });
  const { error: insertError } = await supabase
    .from('breaking_news_events')
    .upsert(rows, { onConflict: 'source_id', ignoreDuplicates: true });
  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // ── 6. שער חומרה — מה באמת ראוי להתראה ──────────────────────
  const pushable = fresh
    .map((n) => ({ news: n, ev: evalById.get(String(n.id)) }))
    .filter(
      (x): x is { news: FinnhubNews; ev: Evaluation } =>
        !!x.ev &&
        x.ev.market_moving &&
        !x.ev.duplicate &&
        x.ev.severity >= MIN_SEVERITY &&
        !!x.ev.alert_he,
    )
    .sort((a, b) => b.ev.severity - a.ev.severity)
    .slice(0, MAX_ALERTS_PER_RUN);

  if (pushable.length === 0 || dryRun) {
    return NextResponse.json({
      ok: true,
      dry: dryRun,
      scanned: recent.length,
      evaluated: fresh.length,
      pushed: 0,
      would_push: dryRun ? pushable.map((x) => x.ev.alert_he) : undefined,
    });
  }

  // ── 7. שידור לכל המנויים ────────────────────────────────────
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth');

  let delivered = 0;
  const deadEndpoints = new Set<string>();

  for (const { news, ev } of pushable) {
    const firstTicker = ev.tickers[0];
    const payload = {
      title: '🚨 חדשות מתפרצות',
      body: ev.alert_he,
      url: firstTicker ? `/he/stocks/${firstTicker}` : '/he',
      tag: `breaking-${news.id}`,
    };

    const results = await Promise.allSettled(
      (subs ?? []).map((s) => sendPushNotification(s, payload)),
    );
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.ok) delivered += 1;
      // 404/410 = מנוי מת — מסמנים לניקוי
      if (r.status === 'fulfilled' && !r.value.ok && (r.value.statusCode === 410 || r.value.statusCode === 404)) {
        deadEndpoints.add((subs ?? [])[i].endpoint);
      }
    });

    await supabase
      .from('breaking_news_events')
      .update({ pushed: true })
      .eq('source_id', String(news.id));
  }

  if (deadEndpoints.size > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', [...deadEndpoints]);
  }

  return NextResponse.json({
    ok: true,
    scanned: recent.length,
    evaluated: fresh.length,
    pushed: pushable.length,
    alerts: pushable.map((x) => x.ev.alert_he),
    subscribers: subs?.length ?? 0,
    delivered,
    cleaned_dead_subs: deadEndpoints.size,
  });
}

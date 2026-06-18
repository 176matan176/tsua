import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'הצהרת נגישות',
  description: 'הצהרת הנגישות של תשואה — רמת התאמה, יצירת קשר לפניות נגישות ומגבלות ידועות.',
};

/**
 * Accessibility statement page — legally required in Israel under תקנות שוויון
 * זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), 2013, סעיף 35.
 *
 * Must include:
 *   1. Conformance level (WCAG 2.0 AA target)
 *   2. Name + phone + email of accessibility coordinator
 *   3. Date last updated
 *   4. Known accessibility limitations (be honest — Israeli regulators
 *      have penalised vague boilerplate)
 *
 * The contact details below are PLACEHOLDERS — replace with the real
 * coordinator before launch. Without them the page is not compliant.
 */
export default function AccessibilityPage({ params }: { params: { locale: string } }) {
  const isHebrew = params.locale === 'he';
  const lastUpdated = '2026-06-01';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-black text-tsua-text mb-2">הצהרת נגישות</h1>
      <p className="text-sm text-tsua-muted mb-6">
        עודכן לאחרונה: <time dateTime={lastUpdated}>{lastUpdated}</time>
      </p>

      <section className="space-y-6 text-tsua-text leading-relaxed">
        <div>
          <h2 className="text-lg font-bold mb-2">המחויבות שלנו</h2>
          <p>
            תשואה מחויבת לאפשר לכל אדם, ללא תלות במוגבלות, להשתמש בשירות באופן עצמאי, שוויוני
            ובטיחותי. אנחנו פועלים לפי תקני הנגישות הבינלאומיים <strong>WCAG 2.0 AA</strong>
            ועומדים בדרישות חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998 ותקנותיו.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">התאמות שביצענו</h2>
          <ul className="list-disc ps-6 space-y-1.5">
            <li>תמיכה מלאה ב־RTL לקוראי מסך בעברית</li>
            <li>קישור "דלג לתוכן הראשי" בראש כל עמוד</li>
            <li>ניווט מלא במקלדת (Tab / Shift+Tab / Enter / Esc)</li>
            <li>תוויות ARIA על כפתורי אייקון ללא טקסט נראה</li>
            <li>אפשרות החלפת ערכת צבעים (בהיר/כהה) שעוברת את יחס הניגודיות הנדרש</li>
            <li>טקסט חלופי לתמונות בעלות משמעות תוכנית</li>
            <li>מבנה כותרות סמנטי (h1, h2, h3) על כל עמוד</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">מגבלות ידועות</h2>
          <p className="mb-2">
            אנחנו עובדים על שיפור התחומים הבאים:
          </p>
          <ul className="list-disc ps-6 space-y-1.5">
            <li>גרף המסחר של TradingView הוא רכיב צד שלישי — חלקים בו אינם נגישים במלואם בקוראי מסך.</li>
            <li>חלק מההתראות בזמן אמת אינן מוקראות אוטומטית; אנחנו מוסיפים שדות aria-live בהדרגה.</li>
            <li>חלק מהאייקונים בעמודי דיון אינם מתויגים עדיין — בעבודה.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">איך לפנות אלינו</h2>
          <p className="mb-3">
            נתקלת בקושי? יש לך הצעה לשיפור? נשמח לשמוע. רכז/ת הנגישות שלנו זמין/ה לקבל פניות
            בכל אחת מהדרכים הבאות:
          </p>
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            <div>
              <span className="font-bold">שם רכז/ת הנגישות:</span>{' '}
              <span className="text-tsua-muted">[שם — להזין לפני השקה]</span>
            </div>
            <div>
              <span className="font-bold">טלפון:</span>{' '}
              <span className="text-tsua-muted">[מספר — להזין לפני השקה]</span>
            </div>
            <div>
              <span className="font-bold">דוא"ל:</span>{' '}
              <a href="mailto:accessibility@tsua.app" className="text-tsua-accent underline">
                accessibility@tsua.app
              </a>
            </div>
            <div>
              <span className="font-bold">שעות מענה:</span>{' '}
              <span className="text-tsua-muted">ימים א'-ה', 09:00-17:00</span>
            </div>
          </div>
          <p className="text-xs text-tsua-muted mt-3">
            אנחנו מתחייבים להגיב לפניית נגישות בתוך 14 ימי עבודה. במקרה של תקלה דחופה — אנא צרו
            קשר טלפוני.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-2">חוות דעת חיצונית</h2>
          <p className="text-sm text-tsua-muted">
            הבדיקות והשיפורים מתבצעים באופן שוטף בידי הצוות הטכני, על בסיס תקני WCAG 2.0 AA
            ובדיקות עם קוראי מסך מובילים (NVDA, VoiceOver, TalkBack). חוות דעת מקצועית עצמאית
            תופק בעת השקה רחבה של השירות.
          </p>
        </div>
      </section>

      {!isHebrew && (
        <p className="mt-8 text-xs text-tsua-muted">
          This page is presented in Hebrew because Israeli accessibility regulations require the
          statement to be available in the official language of the service.
        </p>
      )}
    </div>
  );
}

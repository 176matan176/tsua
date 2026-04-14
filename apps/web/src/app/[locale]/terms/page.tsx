import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'תנאי שימוש | תשואה',
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4" dir="rtl">
      <div
        className="rounded-2xl p-8 space-y-6"
        style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.6)' }}
      >
        <h1 className="text-2xl font-black text-tsua-text">תנאי שימוש</h1>
        <p className="text-tsua-muted text-sm">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">1. קבלת התנאים</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            השימוש בפלטפורמת תשואה מהווה הסכמה לתנאים אלו. אם אינך מסכים לתנאים, אנא הפסק את השימוש בשירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">2. תיאור השירות</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            תשואה היא פלטפורמה חברתית לשוק ההון המאפשרת למשתמשים לשתף ניתוחים, רעיונות השקעה ועדכונים על מניות.
            המידע המוצג באתר הוא למטרות מידע בלבד ואינו מהווה ייעוץ השקעות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">3. אחריות המשתמש</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            המשתמש אחראי לכל התוכן שהוא מפרסם. אין לפרסם תוכן מטעה, שקרי, פוגעני או העלול לגרום נזק.
            תשואה שומרת לעצמה את הזכות להסיר כל תוכן ולהשעות חשבונות שמפרים את התנאים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">4. אחריות מוגבלת</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            תשואה אינה אחראית להחלטות השקעה שנעשו על בסיס תוכן המופיע בפלטפורמה.
            כל ההשקעות כרוכות בסיכון ועלולות לגרום להפסד של הקרן המושקעת.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">5. קניין רוחני</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            כל הזכויות על עיצוב ופיתוח הפלטפורמה שמורות לתשואה. התוכן שמשתמשים מפרסמים נשאר בבעלות המשתמש,
            אך הם מעניקים לתשואה רישיון להציגו בפלטפורמה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">6. יצירת קשר</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            לשאלות בנושא תנאי השימוש, ניתן לפנות אלינו בכתובת: support@tsua.co
          </p>
        </section>
      </div>
    </div>
  );
}

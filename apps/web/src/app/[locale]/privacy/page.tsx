import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות | תשואה',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4" dir="rtl">
      <div
        className="rounded-2xl p-8 space-y-6"
        style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.6)' }}
      >
        <h1 className="text-2xl font-black text-tsua-text">מדיניות פרטיות</h1>
        <p className="text-tsua-muted text-sm">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">1. מידע שאנו אוספים</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            אנו אוספים מידע שאתה מספק ישירות: אימייל, שם משתמש, תמונת פרופיל ותוכן שאתה מפרסם.
            בנוסף, אנו אוספים נתוני שימוש כלליים (דפים שנצפו, זמן שהייה) לצורך שיפור השירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">2. שימוש במידע</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            המידע משמש לספק ולשפר את השירות, לשלוח התראות רלוונטיות ולאמת את זהות המשתמשים.
            אנו לא מוכרים מידע אישי לצדדים שלישיים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">3. אבטחת מידע</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            אנו משתמשים בסופאבייס (Supabase) לאחסון הנתונים עם הצפנה מלאה. סיסמאות מוצפנות ואינן נשמרות בטקסט גלוי.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">4. קובצי Cookie</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            אנו משתמשים ב-cookies לצורך שמירת מצב הכניסה בלבד. לא נעשה שימוש ב-cookies לצרכי פרסום.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">5. זכויותיך</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            יש לך זכות לעיין, לתקן ולמחוק את המידע שלך בכל עת דרך הגדרות החשבון.
            למחיקת חשבון מלאה, פנה אלינו בדוא"ל.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-tsua-text">6. יצירת קשר</h2>
          <p className="text-tsua-muted text-sm leading-relaxed">
            לשאלות בנושא פרטיות: support@tsua.co
          </p>
        </section>
      </div>
    </div>
  );
}

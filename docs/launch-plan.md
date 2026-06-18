# תשואה — תכנית השקה

> מסמך עבודה. צ'קליסט שלם מהיום ועד שתשואה בכל טלפון של ישראלי שסוחר.
> סדר הסעיפים = סדר הביצוע. אל תקפצו קדימה לפני שמה שלפניכם מסומן ✓.

**תאריך**: 2026-06
**מצב**: בקוד, לא בייצור־מסחרי. דומיין: `tsua-rho.vercel.app` (זמני).
**המטרה**: השקה ציבורית מבוקרת ב־8-10 שבועות מהיום.

---

## הגדרת "השקה"

**"השקנו" משמעו 4 דברים בו־זמנית:**
1. דומיין קבוע + iOS Add-to-Home-Screen + Android PWA install עובדים end-to-end
2. כיסוי משפטי מלא לפי דין ישראלי (ייעוץ פיננסי, פרטיות, נגישות)
3. לפחות 3 ערוצי acquisition פעילים (Hebrew SEO + influencer + WhatsApp seeding)
4. ניטור מלא — אם משהו נשבר ב־03:00 אנחנו יודעים

לא עוזב את "השקה" עד שכל 4 דורגו ✓.

---

## הצירים — היתרון התחרותי שלנו

על שלושת אלה כל החלטה נשענת. כל פיצ'ר שלא משרת אחד מאלה — לא נכנס בסיבוב הראשון.

**P1 — דירוג עברית אורגני** ("מניית טבע" → תוצאה ראשונה תשואה)
**P2 — נגישות אמיתית** (WCAG 2.0 AA — שמשתמש עיוור באמת יוכל להשתמש)
**P3 — קהילה רצינית למסחר** (לא טוקבקים, דיון מקצועי עם רטינג)

---

## A — חוסמי השקה (לא פותחים בלי כל ✓ פה)

### A1. משפטי + רגולציה

- [ ] פגישה ראשונית עם עו"ד פינטק ישראלי (מ. פירון / גנדל / שיבולת). תקציב: ₪10K-15K לחוות דעת.
  - שאלות מפתח: "פוסט קהילתי על מניה — אנחנו פלטפורמה או משווקים?" "מה גבולות 'תיק וירטואלי תחרותי'?" "מתי 'לידרבורד עם פרסים' הופך להגרלה?"
- [ ] תקנון משתמש מקצועי בעברית (לא תרגום אוטומטי) — ב־`/he/terms`
- [ ] מסמך פרטיות מותאם ל־חוק הגנת הפרטיות + GDPR-like
- [ ] גילוי נאות **בכל מסך** שזה תיק וירטואלי + "אינו מהווה ייעוץ השקעות"
- [ ] תהליך מחיקת חשבון מלא + עמידה ב־"זכות להישכח" — ב־`/he/settings`
- [ ] תהליך דיווח על תוכן (Report) על כל פוסט + email לשירות לקוחות
- [ ] רישום עוסק / חברה — שם שאפשר לרשום לפי אפליקציה

### A2. אבטחה — תיקנו את הקריטי, לסיים את היתר

- [x] portfolio price manipulation (נסגר 2026-06)
- [x] watchlist silent failures (נסגר)
- [ ] Rate limiting על POST endpoints — בעיקר `/api/portfolio`, `/api/posts`, `/api/auth/*`. הצעה: Upstash Redis + middleware.
- [ ] CAPTCHA על signup/login — Cloudflare Turnstile (חינם, RTL OK).
- [ ] Security headers — CSP, HSTS, X-Frame-Options. ב־`next.config.js` או middleware.
- [ ] Supabase RLS audit — לוודא שכל טבלה עם `user_id` יש לה policy שמונע קריאה של משתמש אחר.
- [ ] Service-role key audit — שלא נדלף ל־client bundle.
- [ ] HTTPS-only cookies, SameSite=Lax.

### A3. דומיין + זהות חזותית

- [ ] רישום `tsua.app` או `tsua.co.il` (₪50-300/שנה). ההצעה שלי: שניהם, ה־app הוא הראשי.
- [ ] DNS ב־Vercel + redirect מ־`tsua-rho.vercel.app`
- [ ] לוגו וקטור מקצועי (לא הכפתור הנוכחי). מעצב פרילנס: $300-800.
- [ ] Icon set מלא: 8 גדלי iOS (`apple-touch-icon-*.png`) + 5 Android
- [ ] Favicon לכל הגדלים (16, 32, 96, 192, 512)
- [ ] Splash screens iOS (12 גדלים — לפי כל מודל iPhone)
- [ ] OG image template — קיים `/api/og`, לבדוק שמייצר תמונה איכותית לכל ticker / post

### A4. נתונים — סגירת חוב מהאודיטים

- [ ] **Currency mixing ב־PortfolioPage** (`#3` מאודיט portfolio) — `totalValue` מחבר ₪ + $ כאילו זהה. **משתמש רואה שווי שגוי.** תיקון: FX conversion דרך `/api/fx` או שני subtotals.
- [ ] **Atomic trades** — SQL function `execute_trade(...)` ב־Supabase במקום compensating actions. אני אכתוב migration, אתה תריץ.
- [ ] **SLOTS=20 cap** ב־`useLivePortfolioTotals` — משתמש עם 21 פוזיציות מקבל סיכום שגוי בשקט.
- [ ] **N+1 ב־WatchlistRow** — כל שורה subscription נפרד. עם 50 מניות = 50 streams. החלפה ל־batch fetch.
- [ ] אודיט feed/posts (לא נעשה)
- [ ] אודיט alerts/notifications (לא נעשה)
- [ ] אודיט auth flow (לא נעשה)

### A5. ניטור + תפעול

- [ ] **Sentry** — חינם עד 5K events/חודש. סינכרון עם Next.js: 15 דקות התקנה.
- [ ] **Vercel Analytics + Speed Insights** — מופעל ב־dashboard. ידיעה איזה דפים איטיים במובייל.
- [ ] **Better Uptime / Pingdom** — uptime monitor + alerts ל־WhatsApp/email
- [ ] **Status page** ציבורי (`status.tsua.app`) — Better Stack חינם
- [ ] **GitHub auto-deploy** — לסדר את ה־integration ב־Vercel. שבור 10 ימים, deploys ידניים זה לא בר־קיימא.
- [ ] **ניקוי Vercel project כפול** — `tsua` ו־`web` יחד מבלבלים. למחוק את שלא בשימוש.

---

## P1 — דירוג עברית אורגני

### תשתית SEO

- [ ] Audit נוכחי: לחפש ב־Google `מניית טבע`, `S&P 500 מחיר`, `אינפלציה ישראל` — איפה אנחנו? כנראה לא בעמוד הראשון בכלל.
- [ ] `next-sitemap` או custom — לוודא ש־sitemap.xml מכיל את כל הדפים הציבוריים (כל ticker, כל פוסט פתוח, כל מגזר)
- [ ] robots.txt — לאשר את כל `/he/*` ולחסום `/api/*`
- [ ] hreflang tags על כל דף `[locale]` — `he` + `en` + `x-default`
- [ ] Canonical URLs — למנוע duplicate content

### Meta על כל דף ציבורי

- [ ] **כל `/he/stocks/[ticker]`**: title = `מניית X — מחיר, ניתוח ודיון | תשואה`, description עברית של 150 תווים
- [ ] **JSON-LD Schema.org** על דפי מניה: `FinancialProduct`, `Organization`, `BreadcrumbList`
- [ ] **דפי מגזר** (`/he/sectors/...`): כתבה עברית רצינית של 300+ מילים על המגזר
- [ ] **דף מקצועי לכל ticker** — לא רק "חדשות מ־Finnhub". תיאור חברה בעברית, הסבר עסקי, מיקומה במדד.

### תוכן עברי

- [ ] בלוג `/he/blog` (לא קיים — צריך לבנות)
- [ ] 20 כתבות פתיחה: "מה זה P/E", "איך לקרוא דוח רווח־הפסד", "מתי לקנות ETF", "ETF ישראלי vs אמריקאי", "מס רווחי הון בישראל 2026"
- [ ] **Daily morning briefing אוטומטי** — `/he/blog/daily/YYYY-MM-DD` נוצר ב־09:00 ירושלים, מסכם בעברית: TASE פתיחה, MAcro update, top movers. AI-generated OK בסיבוב ראשון (Claude API), עם editor review ידני.
- [ ] **Evening recap אוטומטי** — אותו עיקרון ב־19:00.

### Performance — קריטי ל־SEO

- [ ] Lighthouse score 90+ במובייל על דפי מניה
- [ ] Core Web Vitals ירוקים
- [ ] תמונות `next/image` עם blur placeholder
- [ ] Code splitting — TradingView chart lazy load

---

## P2 — נגישות (חוק שוויון זכויות + WCAG 2.0 AA)

### Audit + תיקון

- [ ] הרצת `axe-core` על כל מסך — להפיק רשימת violations
- [ ] Color contrast audit — `tsua-muted` (#5a7090) על dark — לבדוק יחס ניגודיות AA
- [ ] ARIA labels על כל interactive element ללא טקסט (icon-only buttons)
- [ ] Skip-to-content link מעל ה־header
- [ ] Focus visible על כל אינטראקטיב (✓ עשינו ל־theme-aware ring)
- [ ] Keyboard navigation: tab order סביר, shortcuts (`/` לחיפוש, `g+h` לבית)
- [ ] Screen reader test: VoiceOver iOS, NVDA Windows, TalkBack Android
- [ ] Heading hierarchy נכון (אין דילוג מ־h2 ל־h5)
- [ ] Form labels מפורשים, לא רק placeholder

### RTL מלא

- [ ] בדיקה ידנית של כל מסך ב־RTL
- [ ] Mixed-direction handling — מספרים LTR בתוך משפט עברי, סימני מטבע, ticker symbols
- [ ] Date formats: `he-IL` consistent
- [ ] Number formats: עברית עם פסיק כמפריד אלפים

### גילוי נאות נגישות

- [ ] דף `/he/accessibility` עם הצהרה לפי תקנות 2017
- [ ] טלפון + email לפניות נגישות
- [ ] תאריך עדכון אחרון של ההצהרה

---

## P3 — קהילה רצינית

### Moderation infrastructure

- [ ] כפתור **Report** על כל פוסט + reply + פרופיל
- [ ] Admin dashboard ב־`/he/admin` (קיים? לבדוק) — תור reports
- [ ] Auto-flag heuristics: לינקים חיצוניים מרובים, שמות חברות לא־ידועות, anti-shilling patterns
- [ ] Block + Mute לכל משתמש
- [ ] תקנון קהילה (`/he/community-guidelines`) — אילו פוסטים מותרים, מה אסור

### Verified / KOL system

- [ ] שדה `verified: boolean` בטבלת `profiles` (אם לא קיים)
- [ ] תהליך verification ידני — form ב־`/he/apply-verified`
- [ ] Badge ויזואלי בולט (לא טריוויאלי לזייף)
- [ ] תכנית onboarding ל־10-15 KOLs ראשונים — Early Access + Verified Badge + פגישה אישית

### Onboarding משתמש חדש

- [ ] Welcome flow: מהי תשואה, איך משתמשים
- [ ] Suggest watchlist ראשון לפי תיק קיים בקלסר ("יש לך גרסה דמה של ת"א-35?")
- [ ] Suggest people to follow — 10 KOLs מהבית
- [ ] First-post nudge: "פרסם פוסט ראשון על מניה שאתה עוקב אחריה"

### תוכן חי

- [ ] Real-time presence per stock page — "1.4K צופים ב־$TEVA כעת"
- [ ] Trending widget — מניות שמדוברות הכי הרבה ב־24h
- [ ] "תגובות אחרונות" בדף הבית — מי דיבר על מה
- [ ] Streak system — "12 ימים ברצף שבדקת את התיק"

---

## B — PWA → אפליקציה אמיתית

### תשתית PWA

- [ ] Manifest מלא + תקין (`/manifest.json`)
- [ ] Service Worker מתעדכן בלי לשבור (✓ ראיתי `sw.js`)
- [ ] Offline fallback — דף "אין חיבור" יפה
- [ ] Add to Home Screen prompt — לא ה־default. trigger אחרי 3 ביקורים או 5 דקות זמן.
- [ ] iOS A2HS dialog ידני — Safari לא מציע, אנחנו צריכים מסך הסבר

### Push notifications end-to-end

- [ ] **בדיקה שעובד באמת מהתחלה לסוף**: `/api/cron/alerts` → Web Push → מתקבל בטלפון
- [ ] Permission request flow: בקשה רק אחרי שהמשתמש קבע alert ראשונה
- [ ] iOS Safari 16.4+ test (עובד רק כש־PWA מותקן)
- [ ] התראות שעבורן יש opt-in נפרד:
  - Price alerts (כבר קיים)
  - Mentions/replies
  - תזכורת פתיחת מסחר ב־09:30
  - Daily digest 19:00
  - Earnings calls של מניות ב־watchlist
- [ ] תיעוד subscription failures ב־Sentry

### App Store submission

- [ ] **Apple Developer account** — $99/שנה. דרוש בית עסק רשום.
- [ ] **Google Play Developer account** — $25 חד־פעמי.
- [ ] **PWABuilder** או **Capacitor** — נחליט. PWABuilder = פחות עבודה, Capacitor = שליטה טובה יותר.
- [ ] Screenshots — 8 מסכים לכל פלטפורמה (iPhone 6.7", iPhone 6.1", iPad 12.9", Android phone/tablet)
- [ ] App preview video (15-30 שניות, mute-by-default)
- [ ] Privacy policy URL (חובת App Store)
- [ ] Support URL
- [ ] App description עברית 4K תווים + אנגלית
- [ ] Keywords (App Store) — כסת"ח SEO סודי
- [ ] Apple App Review — 1-2 שבועות, יכול להיתקע על חששות פיננסיים. צריך להיות מוכן לערעור.

---

## C — Distribution day-1

### Hebrew SEO seeding

- [ ] Submit sitemap ל־Google Search Console + Bing Webmaster
- [ ] 20 כתבות בלוג ראשונות online לפני שיוצאים החוצה
- [ ] Backlinks: בקשת mention מ־TheMarker / כלכליסט (לא אקטיבי, אבל לפתוח דיאלוג)
- [ ] רשומות Wikipedia עברית של ETFs ישראליים — מי שאפשר, להוסיף לינק

### Influencer outreach

- [ ] רשימה של 15-20 משפיענים פיננסיים ישראליים:
  - YouTube: ערוץ "מבחן בורסה", "אמיר ברנע", "סטוקסטור"
  - TikTok: חפש hashtag #מניות #השקעות #בורסה
  - X/Twitter: @hagaisl, @kanchan_ofer (לבדוק)
  - בלוגרים פיננסיים: דרור פויר, יואב גולן
- [ ] חבילה אישית לכל אחד: Early Access + Verified Badge + revshare 10% על משתמשים שהביאו
- [ ] לאחר launch — לפחות 3 משפיענים מפרסמים באותה שעה

### WhatsApp seeding

- [ ] כפתור "שתף בווצאפ" בכל פוסט + דף מניה + leaderboard
- [ ] Deep links עובדים: WhatsApp link → פתיחה באפליקציה אם מותקנת
- [ ] **Referral system**: "תזמן חבר וקבל ₪10,000 במזומן וירטואלי נוסף לתיק"
  - tracking link ייחודי לכל משתמש
  - bonus קופץ רק כשהחבר מבצע 3 עסקאות
- [ ] קמפיין seeding ידני: 20 קבוצות מסחר פעילות, שיתוף ידני באמצעות KOL או מהמייסדים

### Press kit

- [ ] Logo בכל הפורמטים (SVG, PNG 512/1024/2048)
- [ ] Screenshots עברית של dashboard, stock page, portfolio
- [ ] One-pager PDF — מה זה, למה זה, מי המייסדים
- [ ] Email טמפלייטים מוכנים לעיתונאים
- [ ] רשימת 10 עיתונאים פיננסיים בארץ + 5 כלכליים בינלאומיים

---

## D — Day-1 features שחייבים לעבוד 100%

לפני שאומרים פאבליקלי "תשואה חיה", **כל אחד** מאלה חייב להיות בדוק ידנית:

- [ ] Signup עם Google OAuth — תוך 10 שניות
- [ ] Signup עם email/password — אימות + welcome flow
- [ ] Login + logout + password recovery
- [ ] חיפוש מניה — תוצאות תוך שניה
- [ ] Stock page — מחיר נטען, גרף נטען, sentiment + news + community
- [ ] פוסט בקהילה + תגובה + לייק + reply chain
- [ ] Watchlist add/remove + live prices
- [ ] Portfolio buy/sell + הצגת P&L (✓ נסגר)
- [ ] Leaderboard view (✓ קיים)
- [ ] Alerts: יצירה + טריגר + push notification
- [ ] Theme toggle (✓ עשינו)
- [ ] Mobile view — RTL, no overflow, no broken layouts
- [ ] Slow 3G test (Chrome devtools) — דף נטען תוך 4 שניות

---

## E — Monetization מוכן ל־day-1

לפחות אחד מאלה פעיל ביום ההשקה:

- [ ] **Broker affiliate** — פגישה ראשונית עם משווקים של מיטב-דש, אקסלנס, אינטראקטיב ברוקרס. שאלה: "אם נביא לכם משתמשים, מה ה־commission?"
- [ ] **Pro tier preview** — דף `/he/pro` עם רשימת היכולות + "מצטרפים לרשימת המתנה"
- [ ] **Sponsored placement** API ראשון — תכלית או קסם, ETF israel sponsored row

---

## F — Risk register

| סיכון | חומרה | הסתברות | פעולת מנע |
|------|--------|---------|-----------|
| רשות ני"ע פותחת חקירה | 🔴 קריטי | 🟡 בינוני | חוות דעת עו"ד לפני launch |
| CNN חוסם את הסקרייפ של FNG | 🟡 בינוני | 🟢 נמוך | snapshot יומי ב־Supabase כ־cache |
| Finnhub rate limit חוסם trading | 🟡 בינוני | 🟡 בינוני | Yahoo fallback (✓ קיים) |
| Apple דוחים את האפליקציה | 🟡 בינוני | 🔴 גבוה | להיות מוכן ל־2-3 סבבי ערעור |
| משתמש מוצא vulnerability ועושה הצפה | 🔴 קריטי | 🟡 בינוני | Bug bounty / Penetration test לפני launch |
| Supabase downtime | 🟡 בינוני | 🟢 נמוך | Status page + email update למשתמשים |
| Leaderboard fraud (יד שניה לאחר תיקון אבטחה) | 🟡 בינוני | 🟡 בינוני | המסחר בעצם תיק וירטואלי — monitoring אנומליות |

---

## G — Timeline מוצע (8 שבועות)

### שבוע 1 — תשתיות
- פגישת עו"ד פינטק
- רישום דומיין + DNS
- Sentry install
- Vercel project cleanup
- GitHub auto-deploy מתוקן
- מעצב לוגו מתחיל

### שבוע 2 — נתונים + a11y
- סגירת currency mixing ב־portfolio
- SQL migration ל־atomic trades
- axe audit + תיקון violations
- Hebrew SEO meta על כל ticker page

### שבוע 3 — תוכן + PWA
- 20 כתבות בלוג עברית first batch
- Daily/evening briefing automation
- PWA install flow + iOS A2HS dialog
- Icon set + splash screens

### שבוע 4 — קהילה
- Moderation tools (report, admin queue)
- Verified badge system
- Onboarding flow למשתמש חדש
- Welcome push notification

### שבוע 5 — Distribution prep
- Press kit מוכן
- Influencer outreach — 20 פניות אישיות
- App Store submission
- Affiliate negotiations

### שבוע 6 — Soft launch
- 100 משתמשים מוזמנים אישית
- Bug-fixing cycle על feedback אמיתי
- ניטור load / performance

### שבוע 7 — Final polish
- App Store approval (אם לא כבר)
- Press kit לעיתונות
- Final security pass
- Status page live

### שבוע 8 — Public launch
- ProductHunt (אם רלוונטי לישראלי)
- 3 משפיענים מפרסמים באותה שעה
- WhatsApp seeding active
- מעקב 24/7 על Sentry/uptime ל־72 שעות

---

## H — מי עושה מה

### רק אתה יכול
- ייעוץ משפטי + רישום עוסק
- חתימה על שותפויות / affiliate
- החלטות מוצר על monetization
- ניהול קשרים עם משפיענים
- App Store / Google Play accounts
- Domain registration + payment
- Marketing budget allocation

### אני יכול לקדם (קוד)
- כל הסעיפים תחת A2/A4 (אבטחה + נתונים)
- כל ה־SEO meta + JSON-LD
- a11y תיקונים אחרי axe audit
- Moderation/admin UI
- PWA install flow + push wiring
- Sentry integration
- Performance optimization
- API improvements
- Tests

### צריך שירות חיצוני
- מעצב לוגו (פרילנס $300-800)
- עו"ד פינטק (₪10K-15K)
- צילומי מסך מקצועיים (אם רוצים יוקרה — $500)
- a11y consultant (אופציונלי, $1K-3K)

---

## I — KPIs להשקה

עוקבים אחרי 4 מספרים בשבועיים הראשונים:

1. **D1 retention**: כמה אחוז מהמשתמשים החדשים חוזרים יום אחרי. יעד: 40%+.
2. **WAU/MAU**: יעד 50%+ בחודש שני.
3. **Posts per active user**: כמה פוסטים בממוצע ליום־פעיל. יעד: 0.3+.
4. **K-factor**: כל משתמש חדש כמה משתמשים נוספים מביא דרך referral. יעד: 0.5+.

אם D1 < 25% — צריך לעצור ולהבין למה.

---

## J — מה לא נכנס ל־v1

לוודא שלא מתפתים לבנות עכשיו:
- ❌ Crypto trading (יש endpoint, אבל לא ממוקד)
- ❌ Options / Futures
- ❌ Real money trading via broker API
- ❌ Web 3 / wallet integration
- ❌ AI chatbot לייעוץ
- ❌ Localization מעבר ל־he/en
- ❌ Tablet-specific UI
- ❌ Desktop native app

כל אלה אחרי 10K משתמשים פעילים.

---

## הצעד הבא — היום

קח את הסעיפים תחת **A1** + **A3** (משפטי + דומיין) ותשלח אותם **היום**:
1. אימייל לעו"ד פינטק — בקש פגישה השבוע
2. רישום `tsua.app` ב־Cloudflare/Namecheap — 15 דקות
3. הזמנת מעצב לוגו ב־Upwork / Fiverr — 30 דקות

כל היתר אני יכול להתחיל לעבוד עליו במקביל בקוד. **נעדכן את ה־checkbox ✓ פה כל פעם שמשהו מסתיים.**

---

*עודכן לאחרונה: 2026-06 · גרסה 1.0*

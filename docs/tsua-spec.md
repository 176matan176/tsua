# תשואה — מסמך אפיון מוצר

**גרסה:** 1.0
**תאריך:** אפריל 2026
**סטטוס:** גרסת Production חיה בכתובת [tsua-rho.vercel.app](https://tsua-rho.vercel.app)

---

## תוכן עניינים

1. [תקציר מנהלים](#1-תקציר-מנהלים)
2. [חזון, מטרות וייחוד](#2-חזון-מטרות-וייחוד)
3. [קהל היעד והפרסונות](#3-קהל-היעד-והפרסונות)
4. [ניתוח השוק והמתחרים](#4-ניתוח-השוק-והמתחרים)
5. [היקף המוצר ופירוט מודולים](#5-היקף-המוצר-ופירוט-מודולים)
6. [ארכיטקטורה טכנית](#6-ארכיטקטורה-טכנית)
7. [מודל הנתונים](#7-מודל-הנתונים)
8. [שכבת ה-API והאינטגרציות](#8-שכבת-ה-api-והאינטגרציות)
9. [עיצוב, שפה חזותית ו-RTL](#9-עיצוב-שפה-חזותית-ו-rtl)
10. [i18n, נגישות וחוויית משתמש בעברית](#10-i18n-נגישות-וחוויית-משתמש-בעברית)
11. [אבטחה, פרטיות ו-Row Level Security](#11-אבטחה-פרטיות-ו-row-level-security)
12. [ביצועים, קאשינג ו-Edge](#12-ביצועים-קאשינג-ו-edge)
13. [DevOps, פריסה וסביבות](#13-devops-פריסה-וסביבות)
14. [מדדי הצלחה (KPIs)](#14-מדדי-הצלחה-kpis)
15. [מפת דרכים — גלי פיתוח](#15-מפת-דרכים--גלי-פיתוח)
16. [סיכונים וצמצומים](#16-סיכונים-וצמצומים)
17. [נספחים](#17-נספחים)

---

## 1. תקציר מנהלים

**תשואה** היא פלטפורמה חברתית ישראלית למשקיעים, שמאחדת לתוך מוצר אחד ארבעה שירותים שהמשקיע הישראלי צורך היום בנפרד: Twitter/X למעקב אחרי סנטימנט, TradingView/Yahoo לנתוני שוק, חברי Telegram/WhatsApp לדיון, ו-Bizportal לחדשות. הכל בעברית רהוטה, מתאים למסחר בארה"ב ובתל אביב, ומכוון למשקיע הקמעונאי (Retail) שאין לו זמן או רקע פיננסי מקצועי.

**המוצר חי בפרודקשן** עם 27 עמודים פעילים, 26 API endpoints, 11 טבלאות במסד הנתונים, ואינטגרציה חיה עם חמישה שירותים חיצוניים (Finnhub, CoinGecko, FRED, בנק ישראל, Socket.io). הפלטפורמה בנויה Hebrew-first: כל המחרוזות, המילון הפיננסי, השמות והתיאורים — בעברית טבעית, עם תמיכת RTL מלאה.

**הגרסה הנוכחית** כוללת פיד סנטימנט קהילתי חי, 20 מניות ישראליות + 25 אמריקאיות במעקב, מפת חום לפי ענפים (11 סקטורי GICS), לוח דוחות רבעוניים, כלי השוואה עד 4 מניות זו לצד זו, מסך קריפטו עם 20 מטבעות, תיק השקעות וירטואלי, חדרי צ׳אט בזמן אמת, ומילון פיננסי מובנה של 30+ מונחים עם Tooltips הסבר בעברית.

**הכיוון הבא** (גל 4): הפעלה וצמיחה — מנוע התראות חכם מבוסס cron, התראות בדוא"ל ו-Push, כרטיסי שיתוף דינמיים ברשתות חברתיות, וויג׳טים להטמעה באתרי תוכן פיננסי, ותוכנית הפניות.

---

## 2. חזון, מטרות וייחוד

### 2.1 חזון

להיות **ה-feed** של המשקיע הקמעונאי הישראלי — המקום הראשון שנפתח בבוקר, והאחרון שנסגר בלילה. לא עוד אפליקציית מסחר, לא עוד אתר חדשות, אלא **שכבת תובנה חברתית בעברית** שמחברת בין נתוני שוק חיים, דעות קהילה, והדיון המתרחש עכשיו.

### 2.2 מטרות מרכזיות

| # | מטרה | מדד הצלחה |
|---|------|-----------|
| 1 | להפוך דיון על מניות לנגיש בעברית | Posts in Hebrew / total posts |
| 2 | לספק סנטימנט קהילתי בזמן אמת עבור כל מניה | % מניות עם sentiment data ב-24 שעות |
| 3 | להחליף לקהל הישראלי את Twitter + TradingView + WhatsApp | DAU/MAU ratio, session length |
| 4 | להיות נגיש למתחיל שלא מבין "P/E" ו"בטא" | Tooltip engagement rate |
| 5 | להוות פלטפורמת מסחר וירטואלית (ללא סיכון) ללימוד | Portfolio creation rate, trades/user |

### 2.3 עקרונות מנחים

1. **עברית ראשונה, לא מתורגמת.** כל מונח, תיאור וכפתור נולד בעברית. אנגלית מופיעה רק איפה שחייבים (tickers, currencies).
2. **RTL נכון.** שימוש ב-logical properties (`start/end`, לא `left/right`), פונט Heebo, ו-`dir="rtl"` ברמת ה-HTML.
3. **Freemium חסר חיכוך.** כל התוכן הליבה חינם; אין paywall לפני שהמשתמש רואה ערך.
4. **Real data, אל ייצור.** נתוני שוק אמיתיים מ-Finnhub/CoinGecko — לא דמו, לא mock.
5. **Progressive Disclosure.** מתחיל רואה מספר. מתקדם רואה Tooltip. מומחה רואה הקשר מלא.
6. **Fast by default.** ISR + Edge caching — דף נטען ב-<1.5s.

### 2.4 הבידול התחרותי (מה שמחשב לנו הצלחה)

| יריב | חולשה מרכזית | התשובה של תשואה |
|------|--------------|------------------|
| Twitter/X | אין נתוני שוק משולבים, ספאם, הרבה סקאם | מניה לצד פוסט, sentiment מסווג |
| TradingView | חוויה לא-עברית, פחות חברתי | עברית ראשונה, פיד חברתי מובנה |
| Yahoo Finance | פחות רלוונטי לישראלי, חדשות מוגבלות | TEVA/NICE/CHKP + בנק ישראל + FRED |
| בלוגים פיננסיים ישראלים (Bizportal, Globes) | חדשות בלי דיון | דיון + חדשות + נתונים במקום אחד |
| Telegram/WhatsApp | אין ארגון, אין היסטוריה, אי אפשר לחפש | פיד מאורגן, פרופילים, דירוג אנליסטים |

---

## 3. קהל היעד והפרסונות

### 3.1 מעגלים

- **Core (שנה 1):** ישראלים בני 25–45 שסוחרים באופן עצמאי במניות ישראליות וארה"ב (בלאומי/פועלים/מזרחי טריידר, אינטראקטיב ברוקרס, טרייד סטיישן). אומדן: 250–400 אלף.
- **Secondary (שנה 2):** חיילים משוחררים ואקדמאים שזה עתה התחילו להשקיע בקרנות אינדקס וב-ETFs. אומדן: 600 אלף+.
- **Long-tail (שנה 3+):** ישראלים דוברי אנגלית בחו"ל (תעופת return), משקיעים ערביים-ישראלים (דרישה לערבית בהמשך).

### 3.2 פרסונות

#### פרסונה א׳ — "אלון, 34, מפתח תוכנה בתל אביב"
- תיק של ₪350K, 60% קרנות מחקות, 40% מניות בודדות
- עוקב אחרי @israeltrader ו-@naftali בטוויטר, חבר ב-3 קבוצות WhatsApp
- Pain: מפוזר בין 5 אפליקציות, מפספס עדכונים מהירים, לא יודע מה הקהילה חושבת על טבע עכשיו
- מה תשואה נותנת: פיד אחד, sentiment מיידי, התראות כשטבע זזה 5%+

#### פרסונה ב׳ — "מיכל, 28, עו"ד, בתחילת הדרך"
- חוסכת ₪80K, פתחה חשבון השקעות לאחרונה
- נרתעת ממונחים כמו "מכפיל רווח" — הגוגל לא עוזר בעברית
- Pain: אין מקום שמסביר מושגים ומראה לה דוגמאות רלוונטיות
- מה תשואה נותנת: Tooltips בעברית, תיק וירטואלי להתאמן, מילון מובנה

#### פרסונה ג׳ — "אורי, 51, בעל עסק, משקיע כבד"
- תיק ₪2.3M, עוקב אחרי 15 מניות ישראליות + קרנות נאמנות
- קורא את Globes/TheMarker ביום, אבל חסר לו מקום לבדוק **תחושה** — מה אחרים חושבים
- Pain: מקבל עשרות הודעות ב-WhatsApp, כל אחד עם דעה, אין דרך לסנן או לדרג
- מה תשואה נותנת: לידרבורד אנליסטים, דירוג קרדיבילי, תיק פומבי שניתן לעקוב

### 3.3 התנהגות מצופה

| פעולה | תדירות מצופה (power user) |
|-------|--------------------------|
| פתיחת האפליקציה | 4–8 פעמים ביום |
| קריאת פיד | 3–10 דקות בפעם |
| כתיבת פוסט | פעמיים בשבוע |
| בדיקת מניה ספציפית | 2–5 פעמים ביום |
| פעולת מסחר וירטואלי | פעם בשבוע |
| כניסה לחדר צ׳אט | 1–2 בשבוע |

---

## 4. ניתוח השוק והמתחרים

### 4.1 גודל השוק

- **TAM (ישראל):** 1.8 מיליון בעלי תיק השקעות פעיל בבורסה ובחו"ל
- **SAM:** 400 אלף משקיעים קמעונאיים שסוחרים באופן עצמאי ונמצאים online
- **SOM (שנה 1):** 30–50 אלף משתמשים רשומים

### 4.2 מתחרים

| שכבה | שחקנים | עוצמה | חולשה | התמצוב שלנו |
|------|---------|-------|--------|-------------|
| חדשות פיננסיות | Bizportal, TheMarker, Globes | SEO חזק, brand | חד-כיווני, אין קהילה | מוסיפים לחדשות ממד דיון |
| מסחר בפועל | IBI, בלאומי, Interactive Brokers | ביצוע עסקאות | UI כבד, לא חברתי | לא מתחרים — משלימים |
| פיד חברתי גלובלי | StockTwits, eToro, Commonstock | מוניטין, משתמשים | אנגלית, פחות רלוונטי | עברית + TA במקור אחד |
| מסנג׳רים | Telegram, WhatsApp, Discord | נוכחות יומית | ספאם, אין היסטוריה, לא ניתן לחיפוש | פיד מאורגן עם דירוג |

### 4.3 הקרב על הלב של המשתמש

אין בישראל פלטפורמה חברתית פיננסית עברית בסדר גודל ציבורי. תשואה מנצלת חלון הזדמנות של 3–4 שנים, לפני שאחד הבנקים או שחקן גלובלי (eToro) יחליטו להיכנס ברצינות לשוק העברי.

---

## 5. היקף המוצר ופירוט מודולים

### 5.1 מבט-על

המוצר בנוי מ-**7 מודולים עיקריים**, כל אחד עומד בפני עצמו אך מתחבר לאחרים:

```
┌─────────────────┬─────────────────┬─────────────────┐
│  1. Social Feed │  2. Markets     │  3. Stocks      │
│  פיד + פוסטים    │  מדדים + סקטור  │  דף מניה        │
├─────────────────┼─────────────────┼─────────────────┤
│  4. Portfolio   │  5. Crypto      │  6. Tools       │
│  תיק וירטואלי    │  קריפטו         │  Compare, Earn. │
├─────────────────┴─────────────────┴─────────────────┤
│  7. Community — Rooms, Profiles, Leaderboard        │
└─────────────────────────────────────────────────────┘
```

### 5.2 מודול 1 — הפיד החברתי (Social Feed)

**מטרה:** להפוך דיון על מניות לחוויה זורמת, חיה ומאורגנת — בעברית.

**פיצ׳רים:**
- **פיד ראשי** (`/`) — פוסטים ממוינים chronologically; stock mentions (`$TEVA`) הופכים ל-chips עם ticker clickable
- **Composer** — שדה יצירה עם:
  - זיהוי אוטומטי של tickers (`$TEVA` → מוסיף ל-stock_mentions)
  - סיווג sentiment ידני: 🟢 Bullish / 🔴 Bearish / ⚪️ Neutral
  - העלאת תמונות (עד 4 תמונות, 5MB לתמונה)
  - אכיפת עברית (regex ברמת ה-lint — 80%+ תווים בעברית)
- **Post Interactions** — Like, Reply (תגובות), Repost, Bookmark
- **Threads** — כל פוסט יכול לפתוח שרשור (parent_id)
- **Rate limiting** — 10 פוסטים בדקה למשתמש

**כיצד זה חיבב (Technical):**
- טבלת `posts` ב-Supabase עם triggers שמעדכנים אוטומטית `like_count`, `reply_count`, `repost_count`
- RLS: כולם רואים; רק המחבר מוחק
- Realtime subscriptions דרך Supabase Realtime — פוסט חדש מופיע מיד בפיד של מי שצופה

### 5.3 מודול 2 — שווקים (Markets)

**מטרה:** מראה כולל של השוק — מדדים, ענפים, מאקרו, מט"ח — במבט אחד.

**פיצ׳רים:**
- **`/markets`** — דשבורד ראשי עם:
  - מדדים: SPY, QQQ, DIA, IWM + בחירה של תא"א 35
  - Gainers/Losers של היום (top 5)
  - מט"ח: USD/ILS, EUR/ILS, GBP/ILS, BTC/USD
  - **Sector Heatmap** (compact) — 11 סקטורים, GICS, מדורגים לפי שינוי יומי
  - **Macro Widget** — ריבית בנק ישראל, ריבית FED, CPI ישראל, CPI ארה"ב, אבטלה
- **`/sectors`** — מפת חום מלאה, דירוג חי של 11 סקטורי GICS דרך SPDR ETFs:
  - XLK (טכנולוגיה), XLV (בריאות), XLF (פיננסים), XLY (צרכנות מחזורית), XLP (צריכה בסיסית), XLE (אנרגיה), XLI (תעשייה), XLB (חומרים), XLRE (נדל"ן), XLU (תשתיות), XLC (תקשורת)
- **`/sectors/[key]`** (SSG) — עמוד סקטור ספציפי: תיאור עברי, ETF ראשי, 5–8 מניות מובילות עם quotes חיים

**נתונים:** Finnhub API (quotes), FRED (US macro), Bank of Israel PublicApi (IL interest), frankfurter.app (FX)

### 5.4 מודול 3 — דף מניה (Stock Detail)

**המודול הכי עמוק במוצר.** כל מניה מקבלת דף עשיר:

- **`/stocks/[ticker]`** (Dynamic) — מבנה:
  1. **Header** — לוגו, שם חברה עברי + אנגלי, ticker, מחיר חי, שינוי יומי, שורת stats (פתיחה/שיא/שפל/שווי שוק) עם Tooltips
  2. **Key Stats** — מכפיל רווח (P/E), Forward P/E, P/B, EPS, ROE, Beta, Dividend Yield
  3. **Company Overview** — ענף, תעשייה, עובדים, IPO, כתובת — עם Tooltips לכל שדה
  4. **Chart** — lightweight-charts (TradingView), OHLC candles
  5. **News** — 8 חדשות אחרונות (7 ימים) מ-Finnhub
  6. **Community Sentiment** — bullish/bearish/neutral אחוזים ב-24 שעות, delta מאתמול
  7. **Discussion** — שרשור פוסטים שמזכירים את הטיקר הזה

**אינטגרציית Tooltips:**
כל מדד (P/E, ROE, Beta...) משויך ל-`DictEntry` מהמילון המרכזי (`financialDictionary.ts`). בלחיצה/hover — נפתח Tooltip עם:
- כותרת (ירוק) — המונח
- סיכום קצר (bold) — הגדרה
- תיאור מלא — הסבר בהקשר ישראלי
- דוגמה — לעיתים, מקומית ("אם טבע נסחרת במכפיל 25...")

### 5.5 מודול 4 — תיק השקעות וירטואלי (Portfolio)

**מטרה:** ללמד ולעקוב — ללא סיכון כלכלי.

**פיצ׳רים:**
- **`/portfolio`** (מוגן באוטנטיקציה) — מציג:
  - מזומן וירטואלי (כל משתמש מקבל ₪100,000 wired במעמד הרישום)
  - Holdings — מניות שמוחזקות, shares, avg_price, P&L לכל פוזיציה
  - Transactions — היסטוריית קנייה/מכירה (top 50)
  - כפתור Buy/Sell — פותח modal עם quote חי; בעת Buy — מפחית מזומן, מוסיף/מעדכן position (עם average cost rebalancing); בעת Sell — מוסיף מזומן חזרה
- **`/watchlist`** — רשימת מעקב נפרדת (לא מחייב holdings)
- **`/reports`** — ניתוח ביצועים (placeholder למנוע רפורטינג עתידי)

**Schema:**
- `portfolio_holdings` — unique per (user_id, ticker); מעודכן atomically עם buy/sell
- `portfolio_transactions` — generated column `total = shares × price`
- `profiles.virtual_cash` — מתעדכן ב-transaction כדי למנוע race conditions

### 5.6 מודול 5 — קריפטו (Crypto)

**מטרה:** להכניס את 24/7 הדוגלים הנגזרים של שנות ה-2020 לפלטפורמה, בלי לסבך.

**פיצ׳רים:**
- **`/crypto`** — רשת (grid) של 20 המטבעות הגדולים (market cap), עם ריענון אוטומטי כל דקה
- **`/crypto/[id]`** (SSG) — עמוד מטבע: לוגו, תיאור עברי, מחיר חי, סרגל 24h range, **Sparkline SVG של 7 ימים** (ללא תלות בספריית charts!), כרטיסי ביצועים (24h/7d/30d), grid נתונים של 9 מטריקות (market cap, volume, supply, ATH, מרחק מ-ATH)

**נתונים:** CoinGecko Public API (ללא authentication, 30 req/min, מספיק עבור 20 מטבעות)

### 5.7 מודול 6 — כלים (Tools)

#### כלי השוואה — `/compare`
עד 4 מניות זו לצד זו, URL-synced (`?t=AAPL,NVDA,TEVA`):
- 15 מדדים ב-4 קטגוריות: שווי (marketCap, P/E, Forward P/E, P/B, EPS), ביצועים (ROE, revenue growth, dividend, beta), מחיר (52w range, volume), חברה (sector, industry, exchange)
- **הדגשה אוטומטית של ה"זוכה"** בכל שורה — אלגוריתם `higherBetter` מסמן 🏆 על הערך הטוב ביותר (למשל: P/E נמוך = זוכה; ROE גבוה = זוכה)
- InfoTooltip על כל שורה מקושר למילון
- צ׳יפים של מניות פופולריות (10 ברירות מחדל: AAPL, NVDA, MSFT, GOOGL, AMZN, META, TSLA, TEVA, NICE, CHKP)

#### לוח דוחות — `/earnings`
- הדוחות הרבעוניים הצפויים ב-7 או 30 ימים קדימה
- סינון: הכל / 🇮🇱 ישראליות / 🇺🇸 אמריקאיות
- מוצג לכל דוח: EPS Estimate, EPS Actual (אם פורסם), Revenue Estimate/Actual, **beat/miss badge** — ✓ הפתיע לטובה (>+2%), = בקו (±2%), ✗ אכזב (<-2%)
- סיווג זמן: 🌅 לפני פתיחה / ☀️ במהלך / 🌙 אחרי סגירה
- קיבוץ לפי יום עם תוויות יחסיות (היום, מחר, יום שני, 23 אפר)
- היום המסומן ב-glow ירוק

### 5.8 מודול 7 — קהילה (Community)

#### חדרים — `/rooms`, `/rooms/[slug]`
- צ׳אט חי בזמן אמת לפי טופיק (תשואה, ארה"ב, מאקרו, קריפטו)
- Socket.io עם fallback polling
- הודעות מתארכות ב-Supabase לצפיות עתידיות

#### פרופיל — `/profile/[username]`
- תמונה, ביו, שם תצוגה
- עוקבים/עוקב (follow/unfollow מ-UI)
- פוסטים היסטוריים
- **דירוג אנליסט** (`rating` 0–10) — יוצג בתג ליד השם עבור משתמשים מדורגים

#### לידרבורד — `/leaderboard`
- דירוג הקהילה לפי: rating, followers, post_count, P&L (וירטואלי)
- Tabs: top analysts / most followed / most active / best performing portfolio

#### Notifications — `/api/notifications`, dropdown בנavbar
- התראות Real-time (Supabase Realtime subscription):
  - עוקב חדש
  - לייק על פוסט שלך
  - תגובה על פוסט שלך
  - mention של ה-username שלך
  - alert הופעל (רק אחרי גל 4)

---

## 6. ארכיטקטורה טכנית

### 6.1 מבט-על

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│  Next.js RSC + Tailwind + next-intl (RTL) + SWR         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│              Vercel Edge Network (CDN)                   │
│  - ISR caching (60s–3600s per route)                     │
│  - Middleware: locale redirect, auth session             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Next.js 14 Server (Node, serverless)          │
│  App Router, Server Components, API Routes (26)          │
└─┬──────────────┬──────────────┬──────────────┬──────────┘
  │              │              │              │
  ▼              ▼              ▼              ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌─────────────┐
│Supabase│  │Finnhub │  │CoinGcko│  │FRED + BOI   │
│Postgres│  │(stocks)│  │(crypto)│  │(macro data) │
│+ Auth  │  │        │  │        │  │             │
│+ Storag│  │        │  │        │  │             │
│+ Realt.│  │        │  │        │  │             │
└────────┘  └────────┘  └────────┘  └─────────────┘
     ▲
     │ Socket.io (live chat)
     └── (Socket server — dedicated instance)
```

### 6.2 Stack

| שכבה | טכנולוגיה | גרסה | הערות |
|------|------------|-------|--------|
| Framework | Next.js | 14.2 | App Router, RSC, Turbopack |
| Language | TypeScript | 5.4 | strict mode |
| Rendering | React | 18.3 | Server Components primarily |
| Styling | Tailwind CSS | 3.4 | + CSS custom properties לערכות נושא |
| i18n | next-intl | 3.14 | server-side translations |
| Database | PostgreSQL (Supabase) | 15 | 11 טבלאות, RLS מלא |
| Auth | Supabase Auth | — | email + password, JWT בcookies |
| Storage | Supabase Storage | — | bucket `post-images`, 5MB/file |
| Realtime | Supabase Realtime + Socket.io | 4.8 | Realtime ל-posts/notifications; Socket.io לחדרי צ׳אט |
| Charts | lightweight-charts (TradingView) | 4.1 | ביצועי-על, bundle קל |
| Client data | SWR | 2.2 | stale-while-revalidate |
| State | Zustand | 4.5 | שימוש נקודתי (תיק, notifications) |
| Build | Turbo (monorepo) | 2.0 | apps/web + apps/api (WS server) |
| Hosting | Vercel | — | Edge network + serverless functions |

### 6.3 מבנה המונוריפו

```
tsua/
├── apps/
│   ├── web/                     # Next.js app (main)
│   │   ├── src/
│   │   │   ├── app/[locale]/    # כל הדפים
│   │   │   ├── app/api/         # API routes
│   │   │   ├── components/      # React components (21 dirs)
│   │   │   ├── lib/             # libs (crypto, sectors, dictionary, …)
│   │   │   ├── i18n/            # next-intl config + messages
│   │   │   └── contexts/        # AuthContext, ThemeContext
│   │   ├── supabase/
│   │   │   └── migrations/      # DB migrations
│   │   └── public/              # PWA manifest, icons
│   └── api/                     # Socket.io WS server (live chat)
├── docs/                        # מסמכי אפיון ו-planning
└── package.json                 # turbo root
```

### 6.4 דפוסי Rendering

- **SSG (Static Site Generation)** — לעמודים עם `generateStaticParams`:
  - `/crypto/[id]` — 20 מטבעות, נבנים בזמן build
  - `/sectors/[key]` — 11 סקטורים, נבנים בזמן build
- **ISR (Incremental Static Regeneration)** — רוב ה-API routes עם `revalidate`:
  - stocks/[ticker] quote: 60s | profile: 3600s
  - /api/markets: 60s
  - /api/sectors: 60s
  - /api/crypto: 60s
  - /api/earnings: 3600s
  - /api/macro: 3600s
- **Dynamic (force-dynamic)** — רק לדפים שחייבים session:
  - /portfolio, /watchlist, /alerts, /bookmarks
  - /api/posts, /api/likes, /api/follows
- **SSR per-request** — `/stocks/[ticker]` (quote משתנה במהירות, אך profile נשמר ב-cache)

---

## 7. מודל הנתונים

### 7.1 מפת ERD (טקסטואלית)

```
auth.users (Supabase)
    │
    │ 1:1
    ▼
profiles ─────────────────┐
    │                     │
    │ 1:N (author_id)     │ 1:N (various FK)
    ▼                     ▼
 posts ◄───────────┬── likes
    │              ├── follows  (self-join on profiles)
    │ 1:N          ├── reposts
    │ (parent_id)  ├── bookmarks
    │              ├── watchlist
    ▼              ├── portfolio_holdings
 posts (replies)   ├── portfolio_transactions
                   ├── alerts
                   └── notifications (actor_id FK)
```

### 7.2 טבלאות מרכזיות (11)

**profiles** — מראה של `auth.users` + שדות אפליקציה (username ייחודי, display_name, avatar_url, bio, is_verified, rating, followers, following, post_count, virtual_cash). יצירה אוטומטית דרך trigger `handle_new_user()`.

**posts** — body (500 תווים), lang (he/en), sentiment (bullish/bearish/neutral), stock_mentions (text[]), image_urls (text[]), counters (like_count, reply_count, repost_count) ו-parent_id לשרשורים. אינדקס GIN על stock_mentions למהירות חיפוש לפי ticker.

**likes** — (user_id, post_id) composite PK; trigger מעלה/מוריד מונה בטבלת posts.

**follows** — (follower_id, following_id) composite PK; check follower ≠ following; trigger מעדכן מונים ויוצר notification.

**reposts, bookmarks** — לוגיקה דומה ל-likes.

**watchlist** — (user_id, ticker) unique; שומר גם name_he, name_en, exchange, logo כדי להציג מהר בלי fetch נוסף.

**portfolio_holdings** — (user_id, ticker) unique; shares, avg_price (מחושב מחדש ב-buy).

**portfolio_transactions** — type (buy/sell), shares, price; generated column `total = shares * price`.

**alerts** — ticker, alert_type (price_above/price_below/volume_spike/news), threshold, is_active, triggered_at.

**notifications** — type (new_follower/post_liked/post_reply/alert_triggered/mention), title, body, link, actor_id, is_read; partial index על (user_id, is_read) לפיד unread מהיר.

### 7.3 מדיניות RLS (דוגמאות)

```sql
-- posts: כולם רואים, רק המחבר מוחק
create policy "posts_select" on posts for select using (true);
create policy "posts_insert" on posts for insert with check (auth.uid() = author_id);
create policy "posts_delete" on posts for delete using (auth.uid() = author_id);

-- bookmarks: רק המשתמש עצמו
create policy "bookmarks_all" on bookmarks
  for all using (auth.uid() = user_id);

-- watchlist: רק המשתמש עצמו
create policy "watchlist_all" on watchlist
  for all using (auth.uid() = user_id);
```

### 7.4 Triggers אוטומטיים

- `handle_new_user()` — יוצר profile ברגע שנוצר auth.users חדש
- `handle_like_change()`, `handle_reply_change()`, `handle_repost_change()` — מעדכנים מונים ב-posts
- `handle_follow_change()` — מעדכן followers/following + יוצר notification
- `handle_new_follow_notification()` — יוצר notification type=new_follower

---

## 8. שכבת ה-API והאינטגרציות

### 8.1 אינטגרציות חיצוניות

| שירות | שימוש | Auth | Rate Limit | Caching |
|-------|--------|------|-----------|---------|
| **Finnhub** | Quotes, news, fundamentals, earnings calendar | API Key (server-only) | 60 req/min (free tier) | 60s-3600s ISR |
| **CoinGecko** | Crypto prices, sparklines | ללא | 30 req/min (free) | 60s-300s ISR |
| **FRED** | US CPI, unemployment, Fed rate | ללא (CSV endpoint) | נדיב | 3600s ISR |
| **Bank of Israel PublicApi** | ריבית בנק ישראל, CPI ישראל | ללא | נדיב | 3600s ISR |
| **frankfurter.app** | FX rates (USD/ILS, EUR/ILS, …) | ללא | נדיב | 60s ISR |
| **Supabase** | DB, Auth, Storage, Realtime | service key | N/A | — |

### 8.2 מפת API (26 נקודות)

**נתוני מניות (5):**
`GET /api/stocks/[ticker]`, `GET /api/stocks/batch`, `GET /api/stocks/hot`, `GET /api/stocks/[ticker]/news`, `GET /api/stocks/[ticker]/sentiment`

**שוק ומאקרו (3):**
`GET /api/markets`, `GET /api/macro`, `GET /api/sectors`

**קריפטו (2):**
`GET /api/crypto`, `GET /api/crypto/[id]`

**דוחות (1):**
`GET /api/earnings`

**חברתי (6):**
`POST/GET /api/posts`, `GET /api/posts/[id]/replies`, `POST /api/posts/[id]/like`, `POST /api/reposts`, `GET/POST /api/bookmarks`, `GET/PATCH /api/notifications`

**משתמשים (3):**
`PATCH /api/profile/me`, `GET/POST /api/profile/[username]`, `GET /api/search`

**תיק + מעקב (5):**
`GET/POST /api/watchlist`, `GET/DELETE /api/watchlist/[ticker]`, `GET/POST /api/portfolio`, `GET/POST /api/alerts`, `DELETE/PATCH /api/alerts/[id]`

**אחר (1):**
`POST /api/upload`

### 8.3 דפוס חשוב — Rate Limiting

`/api/posts`, `/api/search`, `/api/posts/[id]/like` משתמשים ב-`rateLimit(req, path, limit, window)` — limiter בזיכרון לפי IP+path (10 req/min לפוסטים, 30 req/min לחיפוש ולייקים). הגנה בסיסית נגד abuse בלי Redis.

---

## 9. עיצוב, שפה חזותית ו-RTL

### 9.1 פלטת צבעים

```css
:root {
  --text:    #e8f0ff;     /* primary text */
  --text2:   #c8d8f0;     /* secondary text */
  --muted:   #8a9cb8;     /* tertiary/labels */
  --muted2:  #5a7090;     /* footer, captions */
  --card:    rgba(12,20,35,0.6);
  --surface2:rgba(26,40,64,0.4);
  --border:  rgba(90,112,144,0.15);
  --border2: rgba(26,40,64,0.6);

  /* Brand */
  --tsua-accent:  #00e5b0;  /* ירוק טורקיז — accent */
  --tsua-up:      #00e5b0;
  --tsua-down:    #ff4d6a;
  --tsua-warn:    #ffa94d;
  --tsua-info:    #8b8cf7;
}
```

**Dark mode** — ברירת מחדל. **Light mode** — קיים, metadata-friendly. הערכה עתידית: Sepia mode לקריאות לילה.

### 9.2 טיפוגרפיה

- **עברית:** Heebo (Google Fonts) — 400/500/600/700/900
- **מונו / numbers / tickers:** JetBrains Mono / ui-monospace — כל המספרים ב-`dir="ltr"`
- **גדלים:** 10px (labels), 11–13px (body), 14–16px (headlines), 24–32px (hero)

### 9.3 דפוס — Header Card

כל עמוד ראשי פותח ב-Hero Card זהה:
- Rounded corners (rounded-2xl, 16px)
- Background: gradient עדין מה-accent הרלוונטי + `var(--card)`
- Border: 1px `var(--border)`
- כותרת בעברית + emoji ראשי (⚖️, 📅, 🗺️, ₿)
- תיאור 1–2 שורות
- לעיתים: LIVE badge בפינה (pulsing green dot)

### 9.4 RTL — עקרונות

1. **Logical properties** — `ms-auto` במקום `ml-auto`, `start-0` במקום `left-0`, `text-end` במקום `text-right`
2. **כיוון פריימי מחיר** — תמיד `dir="ltr"` עבור מספרים, tickers, אחוזים. העברית סביב — RTL. נותן: "מחיר: $193.52" נקרא נכון.
3. **אייקוני חץ** — הופכים כיוון: ←/→ שורש RTL
4. **Keyboard navigation** — Tab order הולך מימין לשמאל בעברית

### 9.5 קומפוננטה מרכזית — `<InfoTooltip>`

- נגיש (ARIA role="tooltip", aria-describedby)
- Trigger: hover בדסקטופ, tap במובייל
- סגירה: ESC key, click outside, click על הכפתור שוב
- תוכן: term header (ירוק) + short (bold) + text + example (מסגרת עליונה)
- placement: top/bottom/left/right
- מכיל עד כה 30+ מונחים פיננסיים:
  P/E, Forward P/E, P/B, EPS, Beta, Dividend Yield, ROE, Revenue Growth, Market Cap, 52-week Range, Volume, Previous Close, Open, High, Low, Sector, Industry, Employees, IPO, Inflation, Interest Rate, Unemployment, GDP, Short Interest, Spread, ועוד.

---

## 10. i18n, נגישות וחוויית משתמש בעברית

### 10.1 next-intl — הקמה

- `i18n/config.ts` — `locales = ['he']`, `defaultLocale = 'he'`
- `i18n/messages/he.json` — מפתחות תרגום (כיום מינימלי; רוב הטקסטים inline כי הכל בעברית)
- Routing דרך `middleware.ts` — כל URL עם `/{locale}` prefix
- `<html dir="rtl" lang="he">` מוגדר בlayout.tsx

### 10.2 נגישות

- **Semantic HTML** — `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`
- **ARIA labels** — על כל icon-only button (`aria-label="סגור"`)
- **Focus states** — outline ירוק (`--tsua-accent`) גלוי
- **Color contrast** — AAA על טקסט ראשי, AA על משני
- **Keyboard** — כל פעולה זמינה ב-Tab + Enter/Space; ESC סוגר modals
- **prefers-reduced-motion** — אנימציות נכבות במערכות שביקשו

### 10.3 אכיפת עברית בפוסטים

Composer מריץ בדיקה לפני submit: `/^[\u0590-\u05FF\s\d\p{P}\$\w]*$/` — נדרש 80%+ תווים בעברית או פיסוק/מספרים. מונע זיהום של הפיד בספאם באנגלית.

---

## 11. אבטחה, פרטיות ו-Row Level Security

### 11.1 אבטחה בשכבת האפליקציה

- **כל secrets ב-server only** — `FINNHUB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` לא נחשפות ל-client
- **API routes מאמתים session** — `createClient()` עם cookies; מחזיר 401 אם אין user
- **CSRF** — Next.js mitigates by default (POST חייב origin-match)
- **XSS** — React escapes by default; כל `dangerouslySetInnerHTML` מתוחם ונמצא בקוד בדיקה ידנית
- **SQL injection** — Supabase מונע דרך parametrized queries
- **Upload filtering** — בדיקת MIME type + size (5MB max), שם קובץ מוגרל (UUID)

### 11.2 RLS (Row-Level Security)

כל טבלה עם RLS מופעל. דוגמאות:
- `watchlist`, `bookmarks`, `portfolio_*`, `alerts` — visible/editable only to owner
- `posts`, `likes`, `follows` — readable to all, writable by owner
- `notifications` — visible only to recipient

### 11.3 פרטיות

- אין אחסון של CC / אמצעי תשלום (אין monetization עדיין)
- Logs של Vercel — 30 יום retention
- אפשרות למחיקת חשבון דרך support (עדיין לא עצמאי — טוב-ל-Do)
- מדיניות פרטיות קיימת `/privacy` + תנאי שימוש `/terms`

---

## 12. ביצועים, קאשינג ו-Edge

### 12.1 מדדי ביצועים יעד (Lighthouse)

| מדד | יעד | נוכחי |
|-----|-----|-------|
| LCP | <2.0s | ~1.4s |
| CLS | <0.1 | ~0.02 |
| TBT | <200ms | ~80ms |
| First Byte | <400ms (Vercel Edge) | ~180ms |

### 12.2 אסטרטגיית קאשינג

**שכבה 1 — Vercel Edge Cache:** כל route עם `revalidate` מקבל cache בדירת Edge בכל מדינה.

**שכבה 2 — ISR (Next.js):** page refresh שקוף למשתמש; הגרסה הישנה נשרתת עד שה-revalidate יסתיים.

**שכבה 3 — Browser SWR:** בדפי portfolio/watchlist המשתמש רואה את הגרסה האחרונה מיד, וב-background הדף רענן.

**שכבה 4 — API response caching (External):** Finnhub מגיבים עם cache-control headers — לא dual-fetching.

### 12.3 Bundle size (nominal First Load JS)

- Shared JS chunks: **86.9 KB** gzipped
- דף מניה (`/stocks/[ticker]`): **13.3 KB** route-specific
- עמוד compare: **7.4 KB**
- עמוד crypto/[id]: **1.65 KB** (SSG)

### 12.4 Service Worker ו-PWA

- `apps/web/public/manifest.json` — icon, display=standalone, theme_color
- `public/sw.js` — offline fallback לעמוד ראשי
- הרשמה ב-`ServiceWorkerRegister.tsx`

---

## 13. DevOps, פריסה וסביבות

### 13.1 סביבות

- **Production:** `tsua-rho.vercel.app`, Vercel main branch
- **Preview:** כל PR מקבל URL יעודי (automatic)
- **Local:** `npm run dev` עם `.env.local`

### 13.2 `vercel.json`

```json
{
  "buildCommand": "cd apps/web && npm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "cd apps/web && npm install",
  "framework": "nextjs"
}
```

### 13.3 משתני סביבה

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only
FINNHUB_API_KEY=             # server-only
NEXT_PUBLIC_APP_URL=https://tsua-rho.vercel.app
NEXT_PUBLIC_WS_URL=wss://…   # Socket.io server
```

### 13.4 CI/CD

Vercel auto-deploys on push-to-main. Pre-merge checks:
- `npx tsc --noEmit` (strict type checking)
- `npm run build` (Next.js build success)
- `npm run lint` (ESLint)

בעתיד (גל 5+): GitHub Actions עם בדיקות E2E ב-Playwright.

---

## 14. מדדי הצלחה (KPIs)

### 14.1 KPIs מוצריים

| קטגוריה | מדד | יעד שנה 1 |
|---------|------|-----------|
| Growth | רישום משתמשים | 30,000 |
| Engagement | DAU / MAU | 35% |
| Retention | D1 / D7 / D30 | 40% / 20% / 10% |
| Social | פוסטים ביום | 500+ |
| Social | סנטימנט — % פוסטים מסווגים | >60% |
| Product | תיקים וירטואליים שנוצרו | 15,000 |
| Product | זמן ממוצע בסשן | 7 דק׳ |

### 14.2 KPIs עסקיים (פוסט-Monetization בגל 6+)

- Pro conversion rate — יעד 3–5%
- ARPU — יעד ₪25/חודש
- NPS — יעד >50

---

## 15. מפת דרכים — גלי פיתוח

### ✅ גל 1 — בסיס (הושלם)

Auth, פיד ראשי, Composer, מדפי מניה, חיפוש, Watchlist, Portfolio וירטואלי, חדרי צ׳אט, Notifications.

### ✅ גל 2 — מילון + מאקרו + סקטורים (הושלם)

- מילון פיננסי מרכזי (30+ מונחים)
- `<InfoTooltip>` — קומפוננטה נגישה בכל המוצר
- Sector Heatmap — 11 סקטורי GICS דרך SPDR ETFs
- Macro Widget — ריבית IL/US, CPI, אבטלה

### ✅ גל 3 — השלמה פיננסית (הושלם)

- עמוד קריפטו + 20 מטבעות + SSG detail pages
- כלי השוואה עד 4 מניות
- לוח דוחות רבעוניים

### 🔜 גל 4 — הפעלה והפצה (הבא)

**מטרה:** להפוך משתמש שנרשם למשתמש שחוזר כל יום.

1. **מנוע התראות חכם**
   - Cron Job ב-Vercel (every 5 min)
   - קורא את כל ה-alerts הפעילים
   - Fetch quotes ב-batch מ-Finnhub
   - השוואה מול thresholds
   - יוצר notification + מסמן alert כ-triggered

2. **התראות בדוא"ל**
   - אינטגרציה עם Resend
   - Transactional email על כל alert
   - Daily digest — תיק + watchlist של המשתמש פעם ביום

3. **Web Push Notifications**
   - רישום ב-PWA Service Worker
   - VAPID keys
   - Subscription table ב-Supabase
   - Push payload עם deep link

4. **OG Images דינמיים**
   - `@vercel/og`
   - `/api/og?type=stock&ticker=TEVA`
   - תמונה 1200×630 עם לוגו חברה, שם, מחיר, שינוי
   - שיתוף ל-WhatsApp/Twitter/Facebook עם preview

5. **Widgets להטמעה**
   - `/embed/stocks/[ticker]` — iframe responsive
   - `/embed/markets` — מדדים ישראליים
   - `/embed/hot` — המניות החמות היום
   - בלוגרים פיננסיים ישראלים (Ynet Money, TheMarker) — קהל יעד

6. **תוכנית הפניות**
   - קוד הפניה לכל משתמש
   - בונוס ₪25,000 לתיק הוירטואלי למזמין + מוזמן
   - דירוג — חודש חינם של Pro (גל 6)

### גל 5 — חוכמת קהל (Future)

- Consensus rating — הסכמת קהל על מניה (+- 1 כוכב)
- Expert verification process — עיתונאי פיננסי / מייעץ מוסמך
- Analyst reports — אנליסטים פנימיים כותבים קצר
- Polls — "מה תעשה עם TEVA היום?"

### גל 6 — Monetization (Future)

- **Tsua Pro** (₪29/חודש):
  - Alerts ללא הגבלה (כיום 10)
  - Advanced screener
  - Portfolio analytics + דוחות חודשיים
  - API access
  - Ad-free
- **Sponsored posts** — disclosure ברור, מוגבל
- **Affiliate** — קישורים לברוקרים עם revenue share

### גל 7 — שוק ישראלי מלא (Future)

- TASE real-time (לא delayed) דרך ספק נתונים ישראלי
- אג"ח ממשלתיות + קונצרניות
- קרנות סל ישראליות
- מדד מחירי הדירות (LAMAS)

### גל 8 — Mobile Native (Future)

- React Native (Expo) app
- Share extension (iOS) — "Add to Tsua"
- Apple Watch complication (price ticker)
- Push via APNs/FCM native

---

## 16. סיכונים וצמצומים

| סיכון | חומרה | הסתברות | צמצום |
|-------|-------|---------|--------|
| Finnhub rate limits (60/min free) | גבוה | גבוה | Migration ל-Finnhub Premium ($50/חודש) כש-MAU עובר 5K |
| ייעוץ השקעות בלתי-מורשה | גבוה מאוד | בינוני | Disclaimer ברור, Terms, חסימת המלצות פרטיות (אופציונלי) |
| CoinGecko rate limit | בינוני | נמוך | Migration ל-API Pro אם נצרך |
| עומס DB (Supabase Free → Pro) | בינוני | גבוה (עד Q3) | Pro tier $25/חודש, אח"כ Dedicated |
| GDPR / חוק הגנת הפרטיות | בינוני | נמוך | אין processing של data sensitive; cookies בסיסיות בלבד |
| תחרות מ-eToro Social | גבוה | בינוני | First-mover בעברית; ESP רגולטורי eToro |
| Dependence על ספק שוק יחיד | גבוה | בינוני | Yahoo Finance fallback (נמצא ב-dependencies), multi-provider config |
| צמיחה ללא retention | גבוה | בינוני | גל 4 מתמקד בשימור — alerts + email |
| מודל הפצה — קשה להגיע למשתמש ראשון | גבוה | גבוה | גל 4 כולל Widgets + OG images + Referrals |

---

## 17. נספחים

### 17.1 מבנה קבצים — apps/web

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (home, feed)
│   │   ├── markets/, sectors/[key]/
│   │   ├── stocks/[ticker]/
│   │   ├── crypto/, crypto/[id]/
│   │   ├── compare/, earnings/
│   │   ├── portfolio/, watchlist/, alerts/, bookmarks/
│   │   ├── rooms/, rooms/[slug]/
│   │   ├── leaderboard/, profile/[username]/
│   │   ├── news/, reports/
│   │   ├── settings/, login/, signup/, …
│   └── api/
│       ├── stocks/[ticker]/, stocks/batch/, stocks/hot/
│       ├── markets/, macro/, sectors/
│       ├── crypto/, crypto/[id]/, earnings/
│       ├── posts/, reposts/, bookmarks/, notifications/
│       ├── profile/me/, profile/[username]/, search/
│       ├── watchlist/, portfolio/, alerts/
│       └── upload/
├── components/ (21 תיקיות, 60+ רכיבים)
├── lib/ (8 קבצים — crypto, sectors, macroData, hotStocks, rateLimit, socket, financialDictionary, supabase/)
├── contexts/ (Auth, Theme)
├── i18n/
└── middleware.ts
```

### 17.2 אוצר מילים פיננסי (מילון — דוגמה)

```ts
pe: {
  term: 'מכפיל רווח (P/E)',
  short: 'כמה שנים יחזירו הרווחים של החברה את מחיר המניה.',
  text: 'P/E = מחיר מניה / רווח למניה. מכפיל 15 נחשב ממוצע. מכפיל גבוה מ-30 מרמז ציפיות גבוהות לצמיחה.',
  example: 'אם מחיר המניה ₪100 והרווח השנתי למניה ₪5, מכפיל הרווח הוא 20.',
}
```

### 17.3 Roadmap — לוח זמנים מוערך

| גל | משך | מטרה עיקרית |
|----|------|------------|
| גל 4 | 3 שבועות | Retention — alerts + push + sharing |
| גל 5 | 4 שבועות | Community depth — polls, verified experts |
| גל 6 | 3 שבועות | Monetization — Pro tier |
| גל 7 | 6 שבועות | TASE full integration |
| גל 8 | 12 שבועות | Mobile native apps |

---

**סוף מסמך האפיון**

עודכן לאחרונה: אפריל 2026 · גרסה 1.0 · [tsua-rho.vercel.app](https://tsua-rho.vercel.app)

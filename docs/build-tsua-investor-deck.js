/* מצגת-תשואה-משקיעים.pptx — investor pitch (17 slides) from tsua-investor-deck.md.
   Brand-matched to docs/pdf-style-deck.css: light, Heebo, teal #00A884 / dark-green #003D2E. Hebrew RTL. */
const pptxgen = require("pptxgenjs");
const path = require("path");
const C = {
  ink:"003D2E", teal:"00A884", tealDeep:"006B52", mint:"E8F5F0", mint2:"F4FAF8", pale:"C8FFE5",
  blue:"1A9EFF", purple:"8B5CF6", amber:"F59E0B", amberBg:"FFF9E8", amberInk:"B45309",
  red:"EF4444", redBg:"FFF5F5", border:"C0DACE", muted:"2A4D3E", white:"FFFFFF", gray:"8A9CB8"
};
const F = "Heebo";
const p = new pptxgen();
p.defineLayout({ name:"W", width:13.333, height:7.5 }); p.layout = "W";
p.author = "תשואה"; p.company = "Tsua";
const PW = 13.333, PH = 7.5;

const T = (s, t, o) => s.addText(t, Object.assign({ fontFace:F, rtlMode:true, align:"right", color:C.ink, valign:"top" }, o));
const rect = (s, o) => s.addShape(p.ShapeType.rect, o);
const rrect = (s, o) => s.addShape(p.ShapeType.roundRect, Object.assign({ rectRadius:0.08 }, o));
const ell = (s, o) => s.addShape(p.ShapeType.ellipse, o);
const base = (bg) => { const s = p.addSlide(); s.background = { color: bg || C.white }; return s; };

function logo(s, x, y, h, onDark){
  // 3 ascending bars + wordmark "תשואה"
  const u = h/3.4;
  const cols = onDark ? [C.pale, C.pale, C.white] : [C.tealDeep, C.teal, C.teal];
  [0,1,2].forEach(i => rect(s, { x:x+i*(u*0.62), y:y+h-(u*(i+1.2)), w:u*0.5, h:u*(i+1.2), fill:{ color:cols[i] }, line:{type:"none"} }));
  T(s, "תשואה", { x:x-h*2.9, y:y-h*0.12, w:h*2.7, h:h*1.25, fontFace:F, align:"left", valign:"middle", bold:true, fontSize:h*46, color: onDark?C.white:C.ink });
}
function foot(s, n){
  rect(s, { x:0, y:PH-0.34, w:PW, h:0.34, fill:{ color:C.mint2 } });
  T(s, "תשואה · מצגת משקיעים · יולי 2026", { x:0.4, y:PH-0.34, w:6, h:0.34, fontSize:8.5, color:C.muted, align:"right", valign:"middle" });
  T(s, "tsua-rho.vercel.app", { x:PW-3.6, y:PH-0.34, w:2.6, h:0.34, fontSize:8.5, color:C.tealDeep, align:"left", valign:"middle" });
  T(s, String(n), { x:PW-0.8, y:PH-0.34, w:0.45, h:0.34, fontSize:9, bold:true, color:C.teal, align:"center", valign:"middle" });
}
function head(s, eyebrow, title, titleColor){
  T(s, eyebrow.toUpperCase(), { x:PW-9.7, y:0.5, w:9.1, h:0.34, fontSize:12, bold:true, color:C.teal, charSpacing:3, align:"right" });
  T(s, title, { x:PW-12, y:0.86, w:11.4, h:0.95, fontSize:27, bold:true, color: titleColor||C.ink, align:"right" });
}
const bullets = (items, o={}) => items.map((it, i, arr) => ({ text: typeof it==="string"?it:it.t,
  options: Object.assign({ bullet:{ code:"2022", indent:13 }, color:C.muted, paraSpaceAfter:6, fontSize:12.5, breakLine: i < arr.length-1 }, o, (typeof it==="object"?it.o:{})||{}) }));

// helper: stat tile (teal gradient -> solid teal)
function statTile(s, x, y, w, h, num, label){
  rrect(s, { x, y, w, h, fill:{ color:C.teal }, line:{type:"none"}, rectRadius:0.1, shadow:{type:"outer",blur:6,offset:2,color:"9FE3CF",opacity:0.5} });
  T(s, num, { x, y:y+0.14, w, h:h*0.55, fontSize: w<1.9?22:26, bold:true, color:C.white, align:"center", valign:"middle" });
  T(s, label, { x:x+0.05, y:y+h*0.62, w:w-0.1, h:h*0.34, fontSize:9, color:C.pale, align:"center", valign:"middle", bold:true });
}
// branded table
function table(s, rows, opts){ s.addTable(rows, Object.assign({ fontFace:F, rtlMode:true, valign:"middle", border:{type:"solid",color:C.border,pt:1} }, opts)); }
const cellH = (txt) => ({ text:txt, options:{ fill:C.teal, color:C.white, bold:true, align:"right", fontSize:11 } });
const cell = (txt, ri, o={}) => ({ text:txt, options:Object.assign({ fill: ri%2?C.mint2:C.white, color:C.muted, align:"right", fontSize:10.5 }, o) });

// ───────────────────────── 1 · COVER
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  rect(s, { x:PW-4.2, y:-2, w:6, h:6, fill:{ color:C.tealDeep }, rotate:38, line:{type:"none"} });
  rect(s, { x:PW-2.2, y:PH-2.2, w:5, h:5, fill:{ color:"0a5240" }, rotate:30, line:{type:"none"} });
  logo(s, PW-1.5, 0.55, 0.62, true);
  T(s, "תשואה", { x:PW-9.2, y:2.1, w:8.6, h:1.5, fontSize:78, bold:true, color:C.white, align:"right" });
  T(s, "הפיד של המשקיע הישראלי", { x:PW-9.2, y:3.6, w:8.6, h:0.7, fontSize:26, color:C.pale, align:"right" });
  T(s, "מוצר אחד שמחליף את טוויטר, טריידינגוויו ווואטסאפ — הכל בעברית, במקום אחד", { x:PW-9.2, y:4.35, w:8.6, h:0.7, fontSize:15, color:C.mint, align:"right", bold:true });
  rrect(s, { x:PW-7.0, y:5.2, w:6.4, h:0.7, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.06 });
  T(s, "״השוק מדבר כל היום, כל יום — רק לא בעברית, עד עכשיו״", { x:PW-6.9, y:5.2, w:6.2, h:0.7, fontSize:14, italic:true, color:C.white, align:"right", valign:"middle" });
  rect(s, { x:PW-9.2, y:6.25, w:8.6, h:0.015, fill:{ color:"2f6b58" } });
  T(s, "מצגת משקיעים · יולי 2026", { x:PW-9.2, y:6.4, w:5.0, h:0.4, fontSize:12, color:C.pale, align:"right" });
  T(s, "tsua-rho.vercel.app", { x:PW-12.6, y:6.4, w:3.2, h:0.4, fontSize:12, color:C.pale, align:"left", fontFace:"Calibri" });
  s.addNotes("פתיחה: תשואה הוא הפיד של המשקיע הישראלי — פלטפורמה חברתית אחת בעברית שמחליפה את Twitter, TradingView ו-WhatsApp. השוק מדבר 24/7, אבל עד היום לא בעברית. אנחנו מגייסים Pre-Seed כדי לבנות את ברירת-המחדל הפיננסית של ישראל.");
  foot(s, 1);
})();

// ───────────────────────── 2 · PROBLEM
(()=>{ const s = base();
  head(s, "הבעיה", "משקיע ישראלי פותח 5 מסכים כל בוקר");
  // morning table (right)
  const rows = [[cellH("⏰"), cellH("איפה"), cellH("למה")],
    ["08:15","Twitter / X","$TEVA, $NVDA — מה קורה?"],["08:30","Yahoo Finance","פרימרקט, volume"],
    ["09:00","3 קבוצות WhatsApp","דעות, פאניקה"],["09:45","TradingView","גרפים"],["10:00","Globes / TheMarker","חדשות"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink,align:"center"}:{})));
  table(s, rows, { x:PW-6.4, y:2.0, w:5.8, colW:[1.1,2.2,2.5], rowH:0.5, fontSize:10.5 });
  // pain list (left)
  rrect(s, { x:0.6, y:2.0, w:5.9, h:3.0, fill:{ color:C.redBg }, line:{type:"none"}, rectRadius:0.08 });
  rect(s, { x:6.5-0.06, y:2.0, w:0.06, h:3.0, fill:{ color:C.red } });
  T(s, "הכאב", { x:0.85, y:2.15, w:5.4, h:0.4, fontSize:15, bold:true, color:C.red });
  s.addText(bullets([
    {t:"חמש אפליקציות, הקשר אחד", o:{color:C.ink, bold:true}},
    "כולן באנגלית או תרגום עלוב","WhatsApp: ספאם, ללא חיפוש",
    "אין תחושה מה הקהל הישראלי חושב","מתחיל מרגיש טיפש — מונחים לא נגישים"
  ]), { x:0.85, y:2.6, w:5.5, h:2.3, fontFace:F, rtlMode:true, align:"right", fontSize:12 });
  rrect(s, { x:0.6, y:5.25, w:11.9, h:0.85, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "אין בישראל פלטפורמה אחת, חברתית, עברית — שפותרת את הכל.", { x:0.8, y:5.25, w:11.5, h:0.85, fontSize:17, bold:true, color:C.white, align:"center", valign:"middle" });
  s.addNotes("הבעיה: משקיע קמעונאי ישראלי בן 34 פותח 5 מסכים שונים כל בוקר — Twitter, Yahoo, WhatsApp, TradingView, חדשות. חמש אפליקציות מפוצלות, רובן באנגלית, ה-WhatsApp ספאם ללא חיפוש. אין לו מושג מה הקהל הישראלי חושב. אין פלטפורמה אחת חברתית בעברית שפותרת את הכל.");
  foot(s, 2);
})();

// ───────────────────────── 3 · SOLUTION
(()=>{ const s = base();
  head(s, "הפתרון", "תשואה — Hebrew-first Social Stock Platform");
  T(s, "פלטפורמה אחת שמחליפה את כולן. כל הנתונים, כל הדיון, כל השוק — בעברית טבעית.", { x:PW-12, y:1.7, w:11.4, h:0.4, fontSize:13, color:C.muted, align:"right", bold:true });
  const pil = [["📊","נתוני שוק בזמן אמת","מניות ארה״ב + ת״א, סקטורים, מאקרו, קריפטו"],
    ["💬","פיד חברתי","סנטימנט קהילתי (Bullish/Bearish), תגובות, עוקבים"],
    ["🎓","מילון מובנה","כל מונח (P/E, ROE, Beta) עם הסבר בעברית רהוטה"],
    ["🎮","תיק וירטואלי","₪100K להתאמן, ללא סיכון"]];
  pil.forEach((c,i)=>{ const x = PW-0.6-(i+1)*2.95-i*0.12; const y=2.25;
    rrect(s, { x, y, w:2.95, h:2.05, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.1 });
    T(s, c[0], { x, y:y+0.18, w:2.95, h:0.6, fontSize:30, align:"center" });
    T(s, c[1], { x:x+0.1, y:y+0.85, w:2.75, h:0.6, fontSize:13.5, bold:true, color:C.ink, align:"center" });
    T(s, c[2], { x:x+0.15, y:y+1.42, w:2.65, h:0.55, fontSize:9.5, color:C.muted, align:"center" }); });
  rrect(s, { x:0.6, y:4.55, w:11.9, h:1.55, fill:{ color:C.amberBg }, line:{type:"none"}, rectRadius:0.08 });
  rect(s, { x:12.5-0.06, y:4.55, w:0.06, h:1.55, fill:{ color:C.amber } });
  T(s, "✨ הקסם", { x:PW-3.3, y:4.65, w:2.7, h:0.4, fontSize:14, bold:true, color:C.amberInk, align:"right" });
  s.addText(bullets([
    "כל מספר במוצר → לחיצה ומיד הסבר בעברית","כל מניה → רואה מה הקהל הישראלי חושב, עכשיו",
    "כל פוסט → מזהה tickers אוטומטית → מחבר ל-data","כל משתמש → דירוג אנליסט לפי תשואת תיק וירטואלי"
  ], {color:C.amberInk}), { x:0.9, y:5.05, w:9.0, h:1.0, fontFace:F, rtlMode:true, align:"right", fontSize:11 });
  s.addNotes("הפתרון: תשואה — פלטפורמה אחת Hebrew-first שמחליפה את כולן. ארבעה עמודים: נתוני שוק בזמן אמת (ארה״ב + ת״א), פיד חברתי עם סנטימנט קהילתי, מילון מובנה בעברית לכל מונח, ותיק וירטואלי להתאמן. הקסם: כל מספר, מניה, פוסט ומשתמש מחוברים זה לזה — חוויה אחת בעברית.");
  foot(s, 3);
})();

// ───────────────────────── 4 · PRODUCT (built)
(()=>{ const s = base();
  head(s, "המוצר — מה שכבר בנוי", "הפלטפורמה חיה בפרודקשן — ולא בפיתוח");
  const stats = [["30","עמודי מוצר"],["46","API endpoints"],["61","רכיבי React"],["120","קומיטים"],["5","אינטגרציות חיות"],["2","ערכות נושא"]];
  stats.forEach((st,i)=> statTile(s, PW-0.6-(i+1)*1.96-i*0.04, 1.75, 1.96, 1.15, st[0], st[1]));
  const rows = [[cellH("🧩 מודול"), cellH("מה זה")],
    ["פיד","פוסטים, סנטימנט, תיוג מניות, תמונות, שרשורים — בזמן אמת"],["שווקים","מדדים, עולות ויורדות, מט״ח, מפת חום סקטורים"],
    ["עמוד מניה","גרף, נתונים, חדשות, סנטימנט קהילה, דיון, מבנה בעלויות"],
    ["תיק וירטואלי","אחזקות, רווח והפסד, מעקב ביצועים"],["ליגה","דירוג אנליסטים קהילתי עם פודיום ותגים"],["התראות ואפליקציה","התראות מחיר, נוטיפיקציות, התקנה למסך הבית"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink}:{})));
  table(s, rows, { x:0.6, y:3.15, w:12.13, colW:[2.6,9.53], rowH:0.4, fontSize:10.5 });
  rrect(s, { x:0.6, y:6.05, w:12.13, h:0.55, fill:{ color:C.mint }, line:{type:"none"}, rectRadius:0.06 });
  T(s, "עברית מלאה ✓     מצב כהה ובהיר ✓     נגישות ✓     אפס דאטה מזויף ✓", { x:0.6, y:6.05, w:12.13, h:0.55, fontSize:12, bold:true, color:C.ink, align:"center", valign:"middle" });
  s.addNotes("נקודה קריטית למשקיע: המוצר כבר חי בפרודקשן, לא במצגת. 27 עמודים, 26 API endpoints, 5 אינטגרציות חיות, ביצועים מעולים. תשע מודולים מלאים — Feed, Markets, Stock Detail, Portfolio, Rooms, Leaderboard ועוד. הכל עברית, RTL מלא, אפס נתונים מזויפים. אנחנו לא מבקשים כסף כדי לבנות — בנינו, ומבקשים כסף כדי לצמוח.");
  foot(s, 4);
})();

// ───────────────────────── 5 · MARKET SIZE
(()=>{ const s = base();
  head(s, "גודל השוק", "TAM · SAM · SOM");
  const fr = [["TAM","1.8M בעלי תיק השקעות פעיל בישראל",11.0,C.ink],
    ["SAM","400K קמעונאיים, סוחרים עצמאית online",7.4,C.tealDeep],
    ["SOM","30–50K משתמשים רשומים (שנה 1)",3.4,C.blue]];
  fr.forEach((f,i)=>{ const y=1.95+i*0.92;
    T(s, f[0], { x:PW-2.0, y, w:1.4, h:0.62, fontSize:18, bold:true, color:C.ink, align:"center", valign:"middle" });
    rrect(s, { x:PW-2.2-f[2], y, w:f[2], h:0.62, fill:{ color:f[3] }, line:{type:"none"}, rectRadius:0.06 });
    T(s, f[1], { x:PW-2.2-f[2]+0.15, y, w:f[2]-0.3, h:0.62, fontSize:12, bold:true, color:C.white, align:"right", valign:"middle" }); });
  rrect(s, { x:0.6, y:4.85, w:12.13, h:1.95, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.08 });
  T(s, "💰 חישוב ערך שנתי (שנה 3)", { x:PW-5.5, y:5.0, w:4.9, h:0.4, fontSize:14, bold:true, color:C.ink, align:"right" });
  const rev = [["100K MAU × 5% Pro × ₪29 × 12","₪1.7M ARR"],["Affiliate — 15K referrals × ₪50","₪750K"],["Sponsored content","₪500K"]];
  rev.forEach((r,i)=>{ const y=5.55+i*0.32;
    T(s, r[0], { x:6.6, y, w:5.6, h:0.3, fontSize:11, color:C.muted, align:"right" });
    T(s, r[1], { x:0.9, y, w:2.0, h:0.3, fontSize:11.5, bold:true, color:C.ink, align:"left" }); });
  rect(s, { x:0.9, y:6.28, w:11.3, h:0.018, fill:{ color:C.teal } });
  T(s, "יעד שנה 3", { x:6.6, y:6.34, w:5.6, h:0.3, fontSize:13, bold:true, color:C.ink, align:"right" });
  T(s, "~₪3M ARR", { x:0.9, y:6.34, w:2.5, h:0.3, fontSize:14, bold:true, color:C.teal, align:"left" });
  s.addNotes("גודל שוק: TAM — 1.8 מיליון בעלי תיק השקעות פעיל בישראל. SAM — 400 אלף סוחרים קמעונאיים online. SOM שנה 1 — 30 עד 50 אלף רשומים. החישוב הכלכלי לשנה 3: כ-3 מיליון ש״ח ARR — מ-Pro, אפיליאט ותוכן ממומן. שוק גדול מספיק, וריאלי להגיע אליו.");
  foot(s, 5);
})();

// ───────────────────────── 6 · COMPETITION
(()=>{ const s = base();
  head(s, "תחרות", "למה אין כבר פלטפורמה כזו בישראל?");
  const rows = [[cellH("שחקן"), cellH("נוכחי"), cellH("מה חסר"), cellH("איום עלינו")],
    ["Bizportal / Globes / TheMarker","חדשות","חד-כיווני, ללא קהילה","⚠️ בינוני — brand, SEO"],
    ["IBI / Interactive","מסחר","UI כבד, לא מלמד","✅ משלים — לא מתחרה"],
    ["StockTwits / eToro Social","פיד גלובלי","אנגלית, לא רלוונטי","⚠️ eToro גדול — אך לא עברית"],
    ["TradingView","גרפים","לפרופים, אנגלית","⚠️ נמוך — משלים"],
    ["Telegram / WhatsApp","נוכחות יומית","ספאם, ללא ארגון","✅ בעיה — אנחנו הסדר"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink}:{})));
  table(s, rows, { x:0.6, y:1.8, w:12.13, colW:[3.8,2.0,3.2,3.13], rowH:0.44, fontSize:10 });
  rrect(s, { x:0.6, y:4.7, w:12.13, h:1.9, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.1 });
  T(s, "🏆 הבידול המנצח — 6 יכולות שרק לנו יש ביחד", { x:0.6, y:4.85, w:12.13, h:0.45, fontSize:15, bold:true, color:C.white, align:"center" });
  const pills = ["Hebrew-first","Real-time data","Community sentiment","Dictionary built-in","Virtual portfolio","Free core"];
  pills.forEach((pl,i)=>{ const col=i%3, row=Math.floor(i/3); const x=PW-0.6-(col+1)*3.7-col*0.12; const y=5.4+row*0.55;
    rrect(s, { x, y, w:3.7, h:0.46, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.23 });
    T(s, pl, { x, y, w:3.7, h:0.46, fontSize:11.5, bold:true, color:C.pale, align:"center", valign:"middle" }); });
  s.addNotes("תחרות: כל שחקן עושה חלק — חדשות, מסחר, גרפים, או צ׳אט — אבל אף אחד לא משלב. הבנקים והברוקרים משלימים אותנו, לא מתחרים. eToro גלובלי אך לא בעברית. ה-WhatsApp הוא הבעיה — אנחנו הסדר. הבידול: שש יכולות שרק לנו יש ביחד — עברית, נתונים בזמן אמת, סנטימנט, מילון, תיק וירטואלי, וליבה חינמית.");
  foot(s, 6);
})();

// ───────────────────────── 7 · TRACTION
(()=>{ const s = base();
  head(s, "TRACTION", "MVP → Production → 3 גלי פיצ׳רים בשבועות");
  const tl = [["✅","גל 1 · Foundation","Auth · Feed · Stocks · Portfolio · Rooms · Notifications",C.teal],
    ["✅","גל 2 · מילון + סקטורים + מאקרו","30+ מונחים · Tooltips · GICS heatmap · FRED + בנק ישראל",C.teal],
    ["✅","גל 3 · קריפטו + השוואה + דוחות","20 מטבעות · Compare 4 stocks · Earnings calendar",C.teal],
    ["🔜","גל 4 · Retention & Growth","Alerts · Email · Push · OG images · Widgets · Referrals",C.amber]];
  rect(s, { x:PW-0.95, y:2.0, w:0.03, h:3.4, fill:{ color:C.border } });
  tl.forEach((it,i)=>{ const y=2.0+i*0.85;
    ell(s, { x:PW-1.16, y:y, w:0.42, h:0.42, fill:{ color:it[3] }, line:{type:"none"} });
    T(s, it[0], { x:PW-1.16, y:y, w:0.42, h:0.42, fontSize:13, align:"center", valign:"middle" });
    T(s, it[1], { x:PW-9.0, y:y-0.04, w:7.7, h:0.4, fontSize:14, bold:true, color:C.ink, align:"right" });
    T(s, it[2], { x:PW-9.0, y:y+0.34, w:7.7, h:0.4, fontSize:10.5, color:C.muted, align:"right" }); });
  rrect(s, { x:0.6, y:5.6, w:12.13, h:0.85, fill:{ color:C.amberBg }, line:{type:"none"}, rectRadius:0.08 });
  rect(s, { x:12.67-0.06, y:5.6, w:0.06, h:0.85, fill:{ color:C.amber } });
  T(s, "⚡ קצב: שלושה-ארבעה פיצ׳רים בפרודקשן בשבוע · אפס חוב טכני · אפס דאטה מזויף", { x:0.7, y:5.6, w:11.8, h:0.85, fontSize:13, bold:true, color:C.amberInk, align:"center", valign:"middle" });
  s.addNotes("Traction: לא הבטחות — ביצוע. שלושה גלי פיצ׳רים כבר בפרודקשן: Foundation, מילון+סקטורים+מאקרו, וקריפטו+השוואה+דוחות. גל 4 (Retention & Growth) בדרך. ה-velocity: 3-4 פיצ׳רים בשבוע, אפס חוב טכני, אפס נתונים מזויפים. זה מה שמשקיע רוצה לראות — צוות שמבצע מהר.");
  foot(s, 7);
})();

// ───────────────────────── 8 · BUSINESS MODEL
(()=>{ const s = base();
  head(s, "מודל עסקי", "Freemium → Pro → Affiliates");
  const st = [["1","שנה 1 · חינם לחלוטין",["אין paywall לפני שרואים ערך","יעד: 30–50K רשומים, 10K MAU","עלויות תשתית < ₪5K/חודש"],false],
    ["2","שנה 2 · Tsua Pro · ₪29/חודש",["Alerts ללא הגבלה (Free: 10)","Screener מתקדם — P/E, ROE, דיבידנד","Portfolio Analytics + דוחות PDF","API Access · Ad-free · Early access"],true],
    ["3","שנה 2–3 · ערוצים משלימים",["Affiliate עם ברוקרים — ₪30–60/lead","Sponsored content — disclosure","B2B API — בלוגים / newsletters"],false]];
  st.forEach((c,i)=>{ const x=PW-0.6-(i+1)*3.92-i*0.12; const y=2.0;
    rrect(s, { x, y, w:3.92, h:3.3, fill:{ color: c[3]?C.mint2:C.white }, line:{ color: c[3]?C.teal:C.border, width: c[3]?2:1.5 }, rectRadius:0.1 });
    ell(s, { x:x+3.92-0.42, y:y-0.18, w:0.42, h:0.42, fill:{ color:C.teal }, line:{type:"none"} });
    T(s, c[0], { x:x+3.92-0.42, y:y-0.18, w:0.42, h:0.42, fontSize:15, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, c[1], { x:x+0.2, y:y+0.2, w:3.5, h:0.7, fontSize:13, bold:true, color:C.ink, align:"right" });
    s.addText(bullets(c[2]), { x:x+0.2, y:y+0.95, w:3.55, h:2.2, fontFace:F, rtlMode:true, align:"right", fontSize:10.5 }); });
  rrect(s, { x:0.6, y:5.55, w:12.13, h:0.85, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "🎯 יעד שנה 3:  ₪3M ARR  ·  5% conversion  ·  NPS >50", { x:0.6, y:5.55, w:12.13, h:0.85, fontSize:16, bold:true, color:C.white, align:"center", valign:"middle" });
  s.addNotes("מודל עסקי בשלושה שלבים. שנה 1 — חינם לחלוטין, בלי paywall, בונים בסיס משתמשים וערך. שנה 2 — Tsua Pro ב-29 ש״ח לחודש: alerts ללא הגבלה, screener, אנליטיקה. שנה 2-3 — ערוצים משלימים: אפיליאט עם ברוקרים, תוכן ממומן בשקיפות, ו-B2B API. יעד שנה 3: 3 מיליון ARR, 5% המרה, NPS מעל 50.");
  foot(s, 8);
})();

// ───────────────────────── 9 · ROADMAP
(()=>{ const s = base();
  head(s, "מפת דרכים", "12 חודשים קדימה");
  const q = [["Q2 2026","גל 4 — הבא",["🔔 Alerts engine","📧 Email digest","🖼 OG share images","📊 Embed widgets","👥 Referrals"],"▶ 10K רשומים",true],
    ["Q3 2026","גל 5 — חוכמת קהל",["Consensus rating","Verified experts","Polls ומדדים","Analyst reports"],"▶ 30K · DAU/MAU >30%",false],
    ["Q4 2026","גל 6 — Monetization",["Tsua Pro launch","Affiliate integration","Screener מתקדם","Portfolio analytics"],"▶ ₪100K ARR ראשון",false],
    ["Q1 2027","גל 7 — TASE full",["נתונים real-time","אג״ח ממשלתיות","קרנות סל ישראליות","מדד ת״א-125"],"▶ 100K MAU · ₪1M ARR",false]];
  q.forEach((c,i)=>{ const x=PW-0.6-(i+1)*2.95-i*0.12; const y=1.95;
    rrect(s, { x, y, w:2.95, h:4.0, fill:{ color: c[4]?C.amberBg:C.white }, line:{ color: c[4]?C.amber:C.border, width: c[4]?2:1.5 }, rectRadius:0.1 });
    T(s, c[0], { x:x+0.15, y:y+0.15, w:2.65, h:0.35, fontSize:10, bold:true, color:C.muted, align:"right", charSpacing:1 });
    T(s, c[1], { x:x+0.15, y:y+0.5, w:2.65, h:0.55, fontSize:13, bold:true, color:C.ink, align:"right" });
    s.addText(bullets(c[2], {fontSize:10}), { x:x+0.15, y:y+1.15, w:2.65, h:2.2, fontFace:F, rtlMode:true, align:"right" });
    rect(s, { x:x+0.15, y:y+3.45, w:2.65, h:0.012, fill:{ color:C.border } });
    T(s, c[3], { x:x+0.1, y:y+3.55, w:2.75, h:0.4, fontSize:10, bold:true, color:C.teal, align:"right" }); });
  s.addNotes("מפת דרכים ל-12 חודשים. Q2 — גל 4: alerts, email, referrals → 10K רשומים. Q3 — חוכמת קהל: consensus, מומחים מאומתים → 30K. Q4 — מונטיזציה: Tsua Pro, אפיליאט → ARR ראשון. Q1 2027 — TASE מלא: נתונים בזמן אמת, אג״ח, ת״א-125 → 100K MAU ומיליון ARR.");
  foot(s, 9);
})();

// ───────────────────────── 10 · TEAM
(()=>{ const s = base();
  head(s, "הצוות", "מי בונה את תשואה — ואיך");
  const tm = [["🧠","אני מגדיר — הבינה המלאכותית מבצעת","אפיונים וסקירות כתובים, ביצוע מהיר עם בקרה על כל שלב"],
    ["🔬","בדיקות שיטתיות","סורקי ניגודיות, בדיקות בריאות ואימות אחרי כל פריסה"],
    ["📚","הידע נשמר","כל לקח הופך לתיעוד ולכלי — הפרויקט לומד, לא רק אני"]];
  tm.forEach((c,i)=>{ const x=PW-0.6-(i+1)*3.92-i*0.12; const y=1.85;
    rrect(s, { x, y, w:3.92, h:2.05, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.1 });
    T(s, c[0], { x, y:y+0.15, w:3.92, h:0.55, fontSize:26, align:"center" });
    T(s, c[1], { x:x+0.15, y:y+0.75, w:3.62, h:0.65, fontSize:12, bold:true, color:C.ink, align:"center" });
    T(s, c[2], { x:x+0.2, y:y+1.4, w:3.52, h:0.55, fontSize:9.5, color:C.muted, align:"center" }); });
  rrect(s, { x:PW-6.4, y:4.15, w:5.8, h:1.95, fill:{ color:C.mint }, line:{ color:C.border, width:1 }, rectRadius:0.08 });
  T(s, "למה אני?", { x:PW-6.2, y:4.28, w:5.4, h:0.4, fontSize:14, bold:true, color:C.ink, align:"right" });
  s.addText(bullets([
    {t:"מכיר את המשקיע הישראלי — אני הוא, לא מחקר", o:{color:C.ink}},
    {t:"כל המוצר נבנה על ידי אדם אחד — מהירות מוכחת", o:{color:C.ink}},
    {t:"מבין את השפה — עברית אמיתית, לא תרגום מכונה", o:{color:C.ink}}
  ]), { x:PW-6.2, y:4.7, w:5.4, h:1.3, fontFace:F, rtlMode:true, align:"right", fontSize:11.5 });
  rrect(s, { x:0.6, y:4.15, w:5.5, h:1.95, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.08 });
  T(s, "מה אני מחפש לצידי", { x:0.8, y:4.28, w:5.1, h:0.4, fontSize:13, bold:true, color:C.ink, align:"right" });
  s.addText(bullets(["שותף או שותפה בתחום מוצר וצמיחה","ליווי פיננסי-רגולטורי לקראת השקה"]), { x:0.8, y:4.7, w:5.1, h:1.0, fontFace:F, rtlMode:true, align:"right", fontSize:11 });
  s.addNotes("הצוות: כרגע סולו, בשיטת עבודה מבוססת בינה מלאכותית — מהירות של צוות עם איכות של תהליך מסודר. למה אני? מכיר את המשקיע הישראלי כי אני הוא. ומה שאני מחפש לצידי: שותף מוצר-צמיחה וליווי רגולטורי.");
  foot(s, 10);
})();

// ───────────────────────── 11 · UNIT ECONOMICS
(()=>{ const s = base();
  head(s, "UNIT ECONOMICS", "מה כל משתמש שווה — הנחות שמרניות (שנה 3)");
  const ec = [["ARPU Pro","₪348","₪29 × 12",false],["LTV (Churn 5%)","₪580","20 חודש",false],["CAC Organic","₪45","referral + SEO",false],
    ["CAC Paid","₪180","Meta + Google",false],["LTV:CAC","~4:1","יעד >3:1 ✓",true],["Contribution","75%","lean stack",false]];
  ec.forEach((c,i)=>{ const x=PW-0.6-(i+1)*1.96-i*0.04; const y=1.85;
    rrect(s, { x, y, w:1.96, h:1.7, fill:{ color: c[3]?C.ink:C.white }, line:{ color: c[3]?C.ink:C.border, width:1.5 }, rectRadius:0.08 });
    T(s, c[0], { x:x+0.05, y:y+0.12, w:1.86, h:0.5, fontSize:8.5, bold:true, color: c[3]?C.pale:C.muted, align:"center", valign:"top" });
    T(s, c[1], { x:x+0.05, y:y+0.6, w:1.86, h:0.55, fontSize:19, bold:true, color: c[3]?C.white:C.ink, align:"center", valign:"middle" });
    T(s, c[2], { x:x+0.05, y:y+1.18, w:1.86, h:0.4, fontSize:8.5, color: c[3]?C.pale:C.muted, align:"center" }); });
  rrect(s, { x:0.6, y:3.9, w:12.13, h:2.1, fill:{ color:C.amberBg }, line:{ color:C.amber, width:1 }, rectRadius:0.08 });
  T(s, "💸 עלויות קבועות (שנה 1)", { x:PW-5.3, y:4.05, w:4.7, h:0.4, fontSize:13, bold:true, color:C.amberInk, align:"right" });
  const cost = [["Vercel Pro","$20/חודש"],["Supabase Pro","$25/חודש"],["Finnhub Premium","$50/חודש"],["Domain + misc","$10/חודש"],["סה״כ infra שנתי","~₪4,600"]];
  cost.forEach((r,i)=>{ const y=4.5+i*0.28; const tot=i===4;
    T(s, r[0], { x:7.3, y, w:4.9, h:0.26, fontSize:11, bold:tot, color: tot?C.amberInk:C.muted, align:"right" });
    T(s, r[1], { x:5.6, y, w:1.6, h:0.26, fontSize:11, bold:tot, color: tot?C.amberInk:C.ink, align:"left" }); });
  T(s, "🏃 Runway של ₪1M → 18–24 חודש", { x:0.9, y:4.5, w:4.4, h:1.4, fontSize:14, bold:true, color:C.amberInk, align:"right", valign:"middle" });
  s.addNotes("Unit economics שמרניים לשנה 3: ARPU של 348 ש״ח, LTV 580, CAC אורגני 45 ומשולם 180 — יחס LTV:CAC של בערך 4:1, מעל היעד של 3:1. שולי תרומה 75% בזכות stack רזה. העלויות הקבועות זעירות — כ-4,600 ש״ח לשנה כל ה-infra. Runway של מיליון ש״ח מספיק ל-18 עד 24 חודש.");
  foot(s, 11);
})();

// ───────────────────────── 12 · RISKS
(()=>{ const s = base();
  head(s, "סיכונים", "מה יכול להשתבש — ואיך אנחנו עונים");
  const rk = [["🔴","תחרות מ-eToro","First-mover בעברית; eToro מוגבל רגולטורית בחוויה חברתית","high"],
    ["🔴","רגולציית ייעוץ השקעות","Disclaimer בכל עמוד · Terms · ללא המלצות פרטיות · ללא עסקאות אמיתיות","high"],
    ["🟠","Acquisition יקר","גל 4 ממוקד virality: OG sharing · widgets · referrals","med"],
    ["🟢","Rate limits של ספקי נתונים","Finnhub Premium ($50/m) · Yahoo fallback ב-dependencies","low"],
    ["🔴","Churn אחרי onboarding","alerts + push + daily digest → סיבה לחזור כל יום","high"],
    ["🟠","Key-person dependency","תיעוד מלא · code quality גבוהה · hiring Q3 2026","med"]];
  const bg = { high:C.redBg, med:C.amberBg, low:C.mint2 }, bd = { high:C.red, med:C.amber, low:C.teal };
  rk.forEach((r,i)=>{ const y=1.8+i*0.78;
    rrect(s, { x:0.6, y, w:12.13, h:0.66, fill:{ color:bg[r[3]] }, line:{type:"none"}, rectRadius:0.05 });
    rect(s, { x:12.73-0.06, y, w:0.06, h:0.66, fill:{ color:bd[r[3]] } });
    T(s, r[0], { x:11.9, y, w:0.7, h:0.66, fontSize:14, align:"center", valign:"middle" });
    T(s, r[1], { x:8.4, y, w:3.4, h:0.66, fontSize:12.5, bold:true, color:C.ink, align:"right", valign:"middle" });
    T(s, r[2], { x:0.8, y, w:7.5, h:0.66, fontSize:11, color:C.muted, align:"right", valign:"middle" }); });
  s.addNotes("סיכונים — ואיך אנחנו עונים. תחרות מ-eToro: יתרון first-mover בעברית, ו-eToro מוגבל רגולטורית. רגולציה: disclaimer בכל עמוד, אין המלצות פרטיות, אין עסקאות אמיתיות. Acquisition יקר: גל 4 ממוקד ויראליות. Churn: alerts ו-digest יומי נותנים סיבה לחזור. אנחנו מודעים לסיכונים ויש לנו מענה לכל אחד.");
  foot(s, 12);
})();

// ───────────────────────── 13 · THE ASK
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  T(s, "THE ASK · גיוס PRE-SEED", { x:PW-9.7, y:0.5, w:9.1, h:0.34, fontSize:12, bold:true, color:C.pale, charSpacing:3, align:"right" });
  T(s, "₪1,200,000", { x:PW-12, y:0.95, w:11.4, h:1.1, fontSize:54, bold:true, color:C.teal, align:"center" });
  const fr = [["פיתוח (CTO + full-stack)",40,"₪480K",C.teal],["שיווק (paid + influencers)",20,"₪240K",C.blue],
    ["נתונים (Finnhub + TASE)",15,"₪180K",C.purple],["תשתיות (Vercel + Supabase)",10,"₪120K",C.amber],
    ["משפטי + רגולציה",10,"₪120K",C.red],["רזרבה",5,"₪60K",C.gray]];
  fr.forEach((f,i)=>{ const y=2.3+i*0.5; const trackX=2.3, trackW=5.9; const w=trackW*f[1]/40;
    T(s, f[0], { x:8.0, y, w:4.6, h:0.4, fontSize:11.5, color:C.mint, align:"right", valign:"middle" });
    rrect(s, { x:trackX, y:y+0.05, w:trackW, h:0.3, fill:{ color:"0c4a3a" }, line:{type:"none"}, rectRadius:0.04 });
    rrect(s, { x:trackX+trackW-w, y:y+0.05, w:w, h:0.3, fill:{ color:f[3] }, line:{type:"none"}, rectRadius:0.04 });
    T(s, f[1]+"%", { x:trackX+trackW-w, y:y+0.05, w:w, h:0.3, fontSize:9, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, f[2], { x:0.6, y, w:1.55, h:0.4, fontSize:12, bold:true, color:C.white, align:"left", valign:"middle" });
  });
  rrect(s, { x:0.6, y:5.5, w:12.13, h:1.45, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.08 });
  T(s, "🎯 עם ₪1.2M נגיע ל:", { x:PW-3.2, y:5.62, w:2.6, h:0.4, fontSize:13, bold:true, color:C.pale, align:"right" });
  s.addText(bullets([
    {t:"100K MAU תוך 18 חודשים", o:{color:C.white}},{t:"Tsua Pro → ₪100K–300K ARR", o:{color:C.white}},
    {t:"TASE real-time (גל 7)", o:{color:C.white}},{t:"Runway 18–24 חודש עד Series A", o:{color:C.white}}
  ]), { x:0.9, y:6.0, w:9.3, h:0.9, fontFace:F, rtlMode:true, align:"right", fontSize:11.5 });
  s.addNotes("The Ask: אנחנו מגייסים 1.2 מיליון ש״ח Pre-Seed. השימושים: 40% פיתוח (CTO + full-stack), 20% שיווק, 15% נתונים, 10% תשתיות, 10% משפטי-רגולציה, 5% רזרבה. עם הסכום הזה נגיע ל-100K MAU תוך 18 חודשים, נשיק את Tsua Pro, נחבר TASE בזמן אמת, ויהיה לנו runway של 18-24 חודש עד Series A.");
  foot(s, 13);
})();

// ───────────────────────── 14 · WHY NOW
(()=>{ const s = base();
  head(s, "למה עכשיו", "3 טרנדים מתכנסים ליצירת חלון הזדמנות");
  const tr = [["1","🇮🇱 גאות משקיעים קמעונאיים","COVID פתח גל משקיעים חדשים · IBI + Interactive הכפילו חשבונות ב-4 שנים · Gen Z מתחיל לפני 25"],
    ["2","💻 Hebrew AI + דיגיטל","ChatGPT/Claude בעברית — מידע פיננסי זמין לראשונה · SEO פיננסי בעברית עדיין underserved"],
    ["3","📉 ירידת אמון בבנקים","המשקיע הצעיר לא סומך על יועץ מהבנק · מחפש peer-to-peer, שקיפות, תוכן גולמי"]];
  tr.forEach((c,i)=>{ const x=PW-0.6-(i+1)*3.92-i*0.12; const y=2.1;
    rrect(s, { x, y, w:3.92, h:2.5, fill:{ color:C.mint2 }, line:{type:"none"}, rectRadius:0.1 });
    rect(s, { x:x+3.92-0.06, y, w:0.06, h:2.5, fill:{ color:C.teal } });
    ell(s, { x:x+3.92-0.32, y:y-0.16, w:0.5, h:0.5, fill:{ color:C.teal }, line:{type:"none"} });
    T(s, c[0], { x:x+3.92-0.32, y:y-0.16, w:0.5, h:0.5, fontSize:17, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, c[1], { x:x+0.2, y:y+0.2, w:3.5, h:0.7, fontSize:13.5, bold:true, color:C.ink, align:"right" });
    T(s, c[2], { x:x+0.2, y:y+0.95, w:3.55, h:1.45, fontSize:10.5, color:C.muted, align:"right" }); });
  rrect(s, { x:0.6, y:4.95, w:12.13, h:1.5, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.1 });
  T(s, "🎯 חלון ההזדמנות: 2–3 שנים לפני שבנק ישראלי או eToro-בעברית ייכנסו.", { x:0.8, y:5.1, w:11.7, h:0.6, fontSize:15, bold:true, color:C.white, align:"center" });
  T(s, "תשואה בונה את ה-default הפיננסי של ישראל. עכשיו.", { x:0.8, y:5.7, w:11.7, h:0.6, fontSize:16, bold:true, color:C.pale, align:"center" });
  s.addNotes("למה עכשיו: שלושה טרנדים מתכנסים. אחד — גאות משקיעים קמעונאיים, הבנקים הכפילו חשבונות, דור Z מתחיל מוקדם. שניים — AI בעברית הפך מידע פיננסי לנגיש, ו-SEO פיננסי בעברית עדיין ריק. שלוש — ירידת אמון בבנקים, הצעיר מחפש peer-to-peer. חלון ההזדמנות הוא 2-3 שנים. תשואה בונה את ברירת-המחדל הפיננסית של ישראל — עכשיו.");
  foot(s, 14);
})();

// ───────────────────────── 15 · CONTACT
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  rect(s, { x:PW-3.6, y:-1.6, w:5, h:5, fill:{ color:C.tealDeep }, rotate:35, line:{type:"none"} });
  logo(s, PW-1.4, 0.55, 0.55, true);
  T(s, "דברו איתנו", { x:0, y:1.7, w:PW, h:0.5, fontSize:16, bold:true, color:C.pale, align:"center", charSpacing:2 });
  T(s, "בואו נבנה את זה יחד", { x:0, y:2.25, w:PW, h:0.9, fontSize:40, bold:true, color:C.white, align:"center" });
  T(s, "176matan176@gmail.com", { x:0, y:3.3, w:PW, h:0.5, fontSize:16, bold:true, color:C.mint, align:"center", fontFace:"Calibri" });
  rrect(s, { x:PW/2-3.4, y:4.1, w:6.8, h:1.7, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.1 });
  T(s, "🚀 Demo חי", { x:PW/2-3.4, y:4.25, w:6.8, h:0.4, fontSize:14, bold:true, color:C.pale, align:"center" });
  T(s, "tsua-rho.vercel.app", { x:PW/2-3.4, y:4.65, w:6.8, h:0.6, fontSize:24, bold:true, color:C.pale, align:"center" });
  T(s, "מודל פיננסי מלא ונתונים נוספים — זמינים לפי בקשה", { x:PW/2-3.4, y:5.3, w:6.8, h:0.4, fontSize:12, color:C.mint, align:"center" });
  T(s, "תודה · תשואה · יולי 2026", { x:0, y:6.5, w:PW, h:0.4, fontSize:11, italic:true, color:C.gray, align:"center" });
  s.addNotes("סגירה: תודה. הדמו חי וזמין ב-tsua-rho.vercel.app — תתנסו בו עכשיו. מודל פיננסי מלא ו-data room זמינים תחת NDA. בואו נבנה יחד את ברירת-המחדל הפיננסית של ישראל. [החליפו את ה-placeholders בפרטי קשר אמיתיים.]");
  foot(s, 15);
})();

// ───────────────────────── 16 · APPENDIX A — Technical Moat
(()=>{ const s = base();
  T(s, "נספח א׳ · TECHNICAL MOAT", { x:PW-9.7, y:0.5, w:9.1, h:0.34, fontSize:12, bold:true, color:C.purple, charSpacing:2, align:"right" });
  T(s, "למה קשה לחקות אותנו", { x:PW-12, y:0.86, w:11.4, h:0.7, fontSize:27, bold:true, color:C.ink, align:"right" });
  const ml = [["1","מילון עברי","30+ מונחים פיננסיים, הסברים שנכתבו ידנית בהקשר ישראלי. לא תרגום — Curation."],
    ["2","Composer עברי-first","אכיפת 80%+ עברית · זיהוי tickers אוטומטי · מונע ספאם."],
    ["3","Sector Mapping","SPDR ETF → שם סקטור עברי → top stocks. תבניות מותאמות ישראלית."],
    ["4","Macro Fusion","FRED (US) + בנק ישראל (IL) + frankfurter (FX). הרכבה אחת, אין מתחרה."],
    ["5","SSG at build","31 עמודים סטטיים עם quotes דינמיים. ביצועי-על ללא עלות infrastructure."]];
  ml.forEach((m,i)=>{ const y=1.85+i*0.95;
    rrect(s, { x:0.6, y, w:12.13, h:0.82, fill:{ color:C.mint2 }, line:{type:"none"}, rectRadius:0.06 });
    rect(s, { x:12.73-0.06, y, w:0.06, h:0.82, fill:{ color:C.purple } });
    ell(s, { x:11.95, y:y+0.18, w:0.46, h:0.46, fill:{ color:C.purple }, line:{type:"none"} });
    T(s, m[0], { x:11.95, y:y+0.18, w:0.46, h:0.46, fontSize:15, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, m[1], { x:9.0, y:y+0.12, w:2.8, h:0.58, fontSize:13, bold:true, color:C.ink, align:"right", valign:"middle" });
    T(s, m[2], { x:0.8, y:y+0.12, w:8.0, h:0.58, fontSize:10.5, color:C.muted, align:"right", valign:"middle" }); });
  s.addNotes("נספח טכני: חמש סיבות שקשה לחקות אותנו — מילון עברי שנכתב ידנית (curation, לא תרגום), composer עברי-first שמונע ספאם, מיפוי סקטורים מותאם ישראלית, fusion של מאקרו אמריקאי וישראלי, ו-SSG לביצועי-על. זה moat טכנולוגי אמיתי.");
  foot(s, 16);
})();

// ───────────────────────── 17 · APPENDIX B — vs StockTwits
(()=>{ const s = base();
  T(s, "נספח ב׳ · השוואה ל-STOCKTWITS", { x:PW-9.7, y:0.5, w:9.1, h:0.34, fontSize:12, bold:true, color:C.purple, charSpacing:2, align:"right" });
  T(s, "היריב הקרוב ביותר — אקזיט $210M ב-2023", { x:PW-12, y:0.86, w:11.4, h:0.7, fontSize:24, bold:true, color:C.ink, align:"right" });
  const cH = (t)=>({ text:t, options:{ fill:C.purple, color:C.white, bold:true, align:"center", fontSize:11 } });
  const win = (t)=>({ text:t, options:{ fill:C.mint, color:C.ink, bold:true, align:"right", fontSize:10 } });
  const rows = [[cH("מדד"), cH("StockTwits"), cH("תשואה")],
    ["שפה","אנגלית", win("עברית")],["משתמשים","6M גלובלי", win("0→30K יעד IL שנה 1")],
    ["נתוני מניה","Basic", win("Full + Tooltips")],["Portfolio","—", win("✓ וירטואלי")],
    ["Compare","—", win("✓ 4 מניות")],["Sectors","—", win("✓ GICS heatmap")],
    ["Macro","—", win("✓ IL + US")],["מילון פיננסי","—", win("✓ 30+ מונחים")],
    ["פריסה ישראלית","—", win("✓ TEVA · NICE · CHKP")]]
    .map((r,i)=> i===0? r : [ {text:r[0],options:{fill:i%2?C.mint2:C.white,color:C.ink,bold:true,align:"right",fontSize:10}},
      {text:r[1],options:{fill:i%2?C.mint2:C.white,color:C.muted,align:"center",fontSize:10}}, r[2] ]);
  table(s, rows, { x:0.6, y:1.75, w:7.6, colW:[2.4,2.4,2.8], rowH:0.4, fontSize:10, align:"right" });
  rrect(s, { x:8.5, y:1.95, w:4.2, h:3.7, fill:{ color:C.amberBg }, line:{ color:C.amber, width:1 }, rectRadius:0.1 });
  T(s, "💡 תובנה", { x:8.7, y:2.15, w:3.8, h:0.5, fontSize:15, bold:true, color:C.amberInk, align:"right" });
  T(s, "StockTwits הוכיח שה-model עובד — אקזיט של $210M.", { x:8.7, y:2.7, w:3.8, h:1.0, fontSize:13, bold:true, color:C.amberInk, align:"right" });
  T(s, "תשואה = StockTwits + 5 פיצ׳רים, בעברית, עם יתרון first-mover בשוק של 9 מיליון איש.", { x:8.7, y:3.9, w:3.8, h:1.5, fontSize:13, color:C.muted, align:"right" });
  s.addNotes("נספח השוואה: StockTwits הוא היריב הקרוב — והוא עשה אקזיט של 210 מיליון דולר ב-2023, מה שמוכיח שהמודל עובד. תשואה היא StockTwits פלוס חמישה פיצ׳רים (portfolio, compare, sectors, macro, מילון), בעברית, עם יתרון first-mover בשוק ישראלי של 9 מיליון איש.");
  foot(s, 17);
})();

const out = path.join("C:\\Users\\wave\\Desktop\\tsua\\docs", "מצגת-תשואה-משקיעים.pptx");
p.writeFile({ fileName: out }).then(f => console.log("PPTX saved:", f)).catch(async e => {
  if (e && e.code==="EBUSY"){ const alt = path.join("C:\\Users\\wave\\Desktop\\tsua\\docs","מצגת-תשואה-משקיעים-מעודכן.pptx"); await p.writeFile({ fileName:alt }); console.log("LOCKED:"+alt); }
  else { console.error(e); process.exit(1); }
});

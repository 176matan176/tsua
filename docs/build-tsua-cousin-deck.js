/* מצגת-תשואה-שיחה-פתוחה.pptx — honest product walkthrough for a senior-tech family audience
   (12 slides). Reuses the brand system from build-tsua-pptx.js: Heebo, teal on ink, RTL. */
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
  const u = h/3.4;
  const cols = onDark ? [C.pale, C.pale, C.white] : [C.tealDeep, C.teal, C.teal];
  [0,1,2].forEach(i => rect(s, { x:x+i*(u*0.62), y:y+h-(u*(i+1.2)), w:u*0.5, h:u*(i+1.2), fill:{ color:cols[i] }, line:{type:"none"} }));
  T(s, "תשואה", { x:x-h*2.9, y:y-h*0.12, w:h*2.7, h:h*1.25, fontFace:F, align:"left", valign:"middle", bold:true, fontSize:h*46, color: onDark?C.white:C.ink });
}
function foot(s, n){
  rect(s, { x:0, y:PH-0.34, w:PW, h:0.34, fill:{ color:C.mint2 } });
  T(s, "תשואה · שיחה פתוחה · יולי 2026", { x:0.4, y:PH-0.34, w:6, h:0.34, fontSize:8.5, color:C.muted, align:"right", valign:"middle" });
  T(s, "tsua-rho.vercel.app", { x:PW-3.6, y:PH-0.34, w:2.6, h:0.34, fontSize:8.5, color:C.tealDeep, align:"left", valign:"middle" });
  T(s, String(n), { x:PW-0.8, y:PH-0.34, w:0.45, h:0.34, fontSize:9, bold:true, color:C.teal, align:"center", valign:"middle" });
}
function head(s, eyebrow, title, titleColor){
  T(s, eyebrow.toUpperCase(), { x:PW-9.7, y:0.5, w:9.1, h:0.34, fontSize:12, bold:true, color:C.teal, charSpacing:3, align:"right" });
  T(s, title, { x:PW-12, y:0.86, w:11.4, h:0.95, fontSize:27, bold:true, color: titleColor||C.ink, align:"right" });
}
const bullets = (items, o={}) => items.map((it, i, arr) => ({ text: typeof it==="string"?it:it.t,
  options: Object.assign({ bullet:{ code:"2022", indent:13 }, color:C.muted, paraSpaceAfter:6, fontSize:12.5, breakLine: i < arr.length-1 }, (typeof it==="object"?it.o:{})||{}) }));

function statTile(s, x, y, w, h, num, label){
  rrect(s, { x, y, w, h, fill:{ color:C.teal }, line:{type:"none"}, rectRadius:0.1, shadow:{type:"outer",blur:6,offset:2,color:"9FE3CF",opacity:0.5} });
  T(s, num, { x, y:y+0.14, w, h:h*0.55, fontSize: w<1.9?22:26, bold:true, color:C.white, align:"center", valign:"middle" });
  T(s, label, { x:x+0.05, y:y+h*0.62, w:w-0.1, h:h*0.34, fontSize:9, color:C.pale, align:"center", valign:"middle", bold:true });
}
function table(s, rows, opts){ s.addTable(rows, Object.assign({ fontFace:F, rtlMode:true, valign:"middle", border:{type:"solid",color:C.border,pt:1} }, opts)); }
const cellH = (txt) => ({ text:txt, options:{ fill:C.teal, color:C.white, bold:true, align:"right", fontSize:11 } });
const cell = (txt, ri, o={}) => ({ text:txt, options:Object.assign({ fill: ri%2?C.mint2:C.white, color:C.muted, align:"right", fontSize:10.5 }, o) });

// ───────────────────────── 1 · COVER
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  rect(s, { x:PW-4.2, y:-2, w:6, h:6, fill:{ color:C.tealDeep }, rotate:38, line:{type:"none"} });
  rect(s, { x:-2.2, y:PH-2.2, w:5, h:5, fill:{ color:"0a5240" }, rotate:30, line:{type:"none"} });
  logo(s, PW-1.5, 0.55, 0.62, true);
  T(s, "תשואה", { x:PW-9.2, y:2.0, w:8.6, h:1.5, fontSize:78, bold:true, color:C.white, align:"right" });
  T(s, "הרשת החברתית של המשקיע הישראלי", { x:PW-9.2, y:3.5, w:8.6, h:0.7, fontSize:25, color:C.pale, align:"right" });
  T(s, "בניתי מוצר חי — ובאתי לשמוע ממך איך הופכים אותו למשהו גדול", { x:PW-9.2, y:4.3, w:8.6, h:0.7, fontSize:16, color:C.mint, align:"right", bold:true });
  rrect(s, { x:PW-7.0, y:5.2, w:6.4, h:0.7, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.06 });
  T(s, "״השוק מדבר כל היום, כל יום — רק לא בעברית, עד עכשיו״", { x:PW-6.9, y:5.2, w:6.2, h:0.7, fontSize:14, italic:true, color:C.white, align:"right", valign:"middle" });
  T(s, "שיחה פתוחה · יולי 2026", { x:PW-9.2, y:6.35, w:5.0, h:0.4, fontSize:12, color:C.pale, align:"right" });
  T(s, "tsua-rho.vercel.app", { x:PW-12.6, y:6.35, w:3.2, h:0.4, fontSize:12, color:C.pale, align:"left", fontFace:"Calibri" });
  s.addNotes("פתיחה אישית: תודה שאת מקדישה זמן. בניתי מוצר חי — רשת חברתית לשוק ההון בעברית — ואני רוצה להראות לך אותו כמו שהוא, כולל הקשיים, ולשמוע ממך איך הופכים אותו למשהו גדול.");
  foot(s, 1);
})();

// ───────────────────────── 2 · PROBLEM
(()=>{ const s = base();
  head(s, "הבעיה", "משקיע ישראלי פותח 5 מסכים כל בוקר");
  const rows = [[cellH("⏰"), cellH("איפה"), cellH("למה")],
    ["08:15","Twitter / X","$TEVA, $NVDA — מה קורה?"],["08:30","Yahoo Finance","פרימרקט, נפחים"],
    ["09:00","3 קבוצות WhatsApp","דעות, פאניקה"],["09:45","TradingView","גרפים"],["10:00","Globes / TheMarker","חדשות"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink,align:"center"}:{})));
  table(s, rows, { x:PW-6.4, y:2.0, w:5.8, colW:[1.1,2.2,2.5], rowH:0.5, fontSize:10.5 });
  rrect(s, { x:0.6, y:2.0, w:5.9, h:3.0, fill:{ color:C.redBg }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "הכאב", { x:0.85, y:2.15, w:5.4, h:0.4, fontSize:15, bold:true, color:C.red });
  s.addText(bullets([
    {t:"חמש אפליקציות, הקשר אחד", o:{color:C.ink, bold:true}},
    "כולן באנגלית או בתרגום עלוב","WhatsApp: ספאם, בלי חיפוש, בלי זיכרון",
    "אין דרך לדעת מה הקהל הישראלי חושב","מתחילים מרגישים טיפשים — המונחים לא נגישים"
  ]), { x:0.85, y:2.6, w:5.5, h:2.3, fontFace:F, rtlMode:true, align:"right", fontSize:12 });
  rrect(s, { x:0.6, y:5.25, w:11.9, h:0.85, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "אין בישראל פלטפורמה אחת, חברתית, בעברית — שמאחדת את הכל.", { x:0.8, y:5.25, w:11.5, h:0.85, fontSize:17, bold:true, color:C.white, align:"center", valign:"middle" });
  s.addNotes("הבעיה מהחיים שלי: כמשקיע ישראלי אני פותח חמישה מסכים כל בוקר. הכל מפוצל, באנגלית, וה-WhatsApp מלא רעש. אין מקום אחד בעברית שמרכז דאטה + קהילה.");
  foot(s, 2);
})();

// ───────────────────────── 3 · SOLUTION
(()=>{ const s = base();
  head(s, "הפתרון", "פלטפורמה חברתית אחת, עברית תחילה");
  T(s, "כל הנתונים, כל הדיון, כל השוק — במקום אחד, בעברית טבעית, בזמן אמת.", { x:PW-12, y:1.7, w:11.4, h:0.4, fontSize:13, color:C.muted, align:"right", bold:true });
  const pil = [["📊","דאטה חי","תל אביב, ארה״ב וקריפטו — מחירים, סקטורים ומאקרו, מתעדכן כל שתי שניות"],
    ["💬","פיד חברתי","פוסטים עם תיוג מניות, סנטימנט שורי או דובי, תגובות ועוקבים"],
    ["🏆","ליגת אנליסטים","דירוג קהילתי לפי פעילות ואיכות — גיימיפיקציה שמחזיקה"],
    ["📱","מותקן כמו אפליקציה","בלי חנויות אפליקציות — ישר מהדפדפן, למסך הבית"]];
  pil.forEach((c,i)=>{ const x = PW-0.6-(i+1)*2.95-i*0.12; const y=2.25;
    rrect(s, { x, y, w:2.95, h:2.25, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.1 });
    T(s, c[0], { x, y:y+0.18, w:2.95, h:0.6, fontSize:30, align:"center" });
    T(s, c[1], { x:x+0.1, y:y+0.85, w:2.75, h:0.5, fontSize:13.5, bold:true, color:C.ink, align:"center" });
    T(s, c[2], { x:x+0.15, y:y+1.35, w:2.65, h:0.8, fontSize:9.5, color:C.muted, align:"center" }); });
  rrect(s, { x:0.6, y:4.85, w:11.9, h:1.3, fill:{ color:C.amberBg }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "✨ ההבדל", { x:PW-2.9, y:4.98, w:2.2, h:0.4, fontSize:14, bold:true, color:C.amberInk, align:"right" });
  s.addText(bullets([
    "כל פוסט מזהה מניות אוטומטית ומתחבר לדאטה חי",
    "כל מניה מציגה מה הקהילה חושבת עליה עכשיו",
    "והכל מרגיש חי — מחירים מהבהבים ונושמים כמו באפליקציית מסחר אמיתית"
  ], { color:C.amberInk, fontSize:11.5 }), { x:0.9, y:5.35, w:9.2, h:0.8, fontFace:F, rtlMode:true, align:"right" });
  s.addNotes("הפתרון בארבעה עמודים: דאטה חי שמתעדכן כל 2 שניות, פיד חברתי עם תיוג וסנטימנט, ליגת אנליסטים, ו-PWA. ההבדל — הכל מחובר להכל: פוסטים לדאטה, מניות לקהילה, והחוויה חיה ונושמת.");
  foot(s, 3);
})();

// ───────────────────────── 4 · WHAT'S BUILT (real numbers)
(()=>{ const s = base();
  head(s, "המוצר היום", "חי בפרודקשן — מספרים אמיתיים מהריפו");
  const stats = [["30","עמודי מוצר"],["46","API endpoints"],["61","רכיבי React"],["120","קומיטים"],["2","עברית + אנגלית"],["2","ערכות נושא"]];
  stats.forEach((st,i)=> statTile(s, PW-0.6-(i+1)*1.96-i*0.04, 1.75, 1.96, 1.15, st[0], st[1]));
  const rows = [[cellH("🧩 מודול"), cellH("מה זה")],
    ["פיד","פוסטים, סנטימנט, תיוג מניות, תמונות, שרשורים — בזמן אמת"],
    ["שווקים","מדדים, מפת חום סקטורים, מט״ח, מאקרו, מדד פחד וחמדנות"],
    ["עמוד מניה","גרף, נתונים, חדשות, סנטימנט קהילה, דיון, מבנה בעלויות"],
    ["ליגה","דירוג אנליסטים קהילתי עם פודיום ותגים"],
    ["קריפטו ודוחות","מטבעות מובילים בזמן אמת, לוח דוחות רבעוני"],
    ["התראות ואפליקציה","התראות מחיר, נוטיפיקציות, התקנה למסך הבית"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink}:{})));
  table(s, rows, { x:0.6, y:3.15, w:12.13, colW:[2.6,9.53], rowH:0.42, fontSize:10.5 });
  rrect(s, { x:0.6, y:6.2, w:12.13, h:0.5, fill:{ color:C.mint }, line:{type:"none"}, rectRadius:0.06 });
  T(s, "עברית מלאה ✓     מצב כהה ובהיר ✓     נגישות ✓     אפס דאטה מזויף ✓", { x:0.6, y:6.2, w:12.13, h:0.5, fontSize:12, bold:true, color:C.ink, align:"center", valign:"middle" });
  s.addNotes("המוצר חי בפרודקשן, לא במצגת. 30 עמודים, 46 API, 61 רכיבים, 120 קומיטים — מספרים אמיתיים מהריפו הבוקר. שישה מודולים מלאים. הכל עברית, RTL, שתי ערכות נושא, אפס נתונים מזויפים.");
  foot(s, 4);
})();

// ───────────────────────── 5 · LAST MONTH (momentum, honest)
(()=>{ const s = base();
  head(s, "מומנטום", "מה קרה רק בשבועיים האחרונים");
  T(s, "עשרים וחמישה קומיטים לפרודקשן, בין השאר:", { x:PW-12, y:1.55, w:11.4, h:0.35, fontSize:12.5, bold:true, color:C.muted, align:"right" });
  const items = [
    ["🎨","מערכת ערכות נושא מלאה","מיגרציה של כאלף וחצי צבעים קשיחים לטוקני עיצוב — מצב בהיר וכהה מושלם"],
    ["🫀","המוצר ״נושם״","מחירים מהבהבים, מספרים קופצים, אינדיקטורים חיים — כמו אפליקציית מסחר"],
    ["🐛","תיקוני עומק","פרופילים, חיפוש משתמשים וליגה היו שבורים בפרודקשן — אותרו בסריקה שיטתית ותוקנו"],
    ["🔒","הקשחת אבטחה","אימות הרשאות בבסיס הנתונים, חסימת פרצות הזרקה, ולידציית העלאות — לפני שמזמינים קהל"],
    ["🛠","תשתית מקצועית","צנרת פריסה מסודרת, תיעוד מלא, וכלי בדיקה אוטומטיים לניגודיות, בריאות וסכמה"]];
  items.forEach((it,i)=>{ const y=1.95+i*0.84;
    ell(s, { x:PW-1.25, y:y+0.06, w:0.55, h:0.55, fill:{ color:C.mint }, line:{ color:C.teal, width:1.5 } });
    T(s, it[0], { x:PW-1.25, y:y+0.08, w:0.55, h:0.5, fontSize:16, align:"center", valign:"middle" });
    T(s, it[1], { x:PW-9.6, y:y-0.02, w:8.1, h:0.4, fontSize:14.5, bold:true, color:C.ink, align:"right" });
    T(s, it[2], { x:PW-12.6, y:y+0.36, w:11.1, h:0.4, fontSize:11, color:C.muted, align:"right" }); });
  rrect(s, { x:0.6, y:6.15, w:12.13, h:0.55, fill:{ color:C.amberBg }, line:{type:"none"}, rectRadius:0.06 });
  T(s, "⚡ הכל סולו, בעזרת פיתוח מבוסס בינה מלאכותית — נקודת חוזק שאשמח לפרט עליה", { x:0.6, y:6.15, w:12.13, h:0.55, fontSize:12.5, bold:true, color:C.amberInk, align:"center", valign:"middle" });
  s.addNotes("שקף המומנטום: רק בשבועיים האחרונים — 25 קומיטים. מערכת ערכות נושא, חוויית ״נשימה״, תיקוני עומק שנמצאו בסריקות שיטתיות, הקשחת אבטחה ותשתית מקצועית. הכל סולו בעזרת פיתוח מבוסס AI — נקודה שכדאי לדון בה: זה מכפיל כוח אמיתי.");
  foot(s, 5);
})();

// ───────────────────────── 6 · COMPETITION (context)
(()=>{ const s = base();
  head(s, "הסביבה התחרותית", "כולם עושים חלק. אף אחד לא מחבר.");
  const rows = [[cellH("שחקן"), cellH("מה הוא"), cellH("מה חסר")],
    ["Bizportal / Globes","חדשות","חד-כיווני, אין קהילה"],
    ["ברוקרים (IBI, מיטב)","מסחר","UI כבד, לא חברתי, לא מלמד"],
    ["StockTwits / eToro","פיד גלובלי","אנגלית, בלי ת״א, לא ישראלי"],
    ["TradingView","גרפים","למקצוענים, באנגלית"],
    ["Telegram / WhatsApp","הקהילה בפועל היום","ספאם, בלי דאטה, בלי חיפוש"]]
    .map((r,i)=> i===0? r : r.map((c,ci)=> cell(c, i, ci===0?{bold:true,color:C.ink}:{})));
  table(s, rows, { x:0.6, y:1.9, w:12.13, colW:[3.6,3.2,5.33], rowH:0.5, fontSize:11 });
  rrect(s, { x:0.6, y:4.9, w:12.13, h:1.6, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.1 });
  T(s, "המקום הפנוי: הצומת שבין דאטה ↔ קהילה ↔ עברית", { x:0.6, y:5.05, w:12.13, h:0.5, fontSize:16, bold:true, color:C.white, align:"center" });
  T(s, "זה בדיוק המקום שבו StockTwits צמח בארה״ב — ואין לו מקבילה ישראלית", { x:0.6, y:5.6, w:12.13, h:0.5, fontSize:12.5, color:C.pale, align:"center" });
  s.addNotes("הסביבה: אתרי חדשות בלי קהילה, ברוקרים בלי חוויה, פלטפורמות גלובליות בלי עברית ות״א, וקהילות וואטסאפ בלי דאטה. הצומת דאטה-קהילה-עברית פנוי. זה המקום שבו StockTwits צמח בארה״ב.");
  foot(s, 6);
})();

// ───────────────────────── 7 · HONEST CHALLENGES
(()=>{ const s = base();
  head(s, "על השולחן", "האתגרים האמיתיים — בלי לייפות");
  const rk = [
    ["🥶","קהילה ריקה (Cold Start)","המוצר בנוי, אבל רשת חברתית בלי אנשים היא עיר רפאים. זה האתגר המרכזי.","high"],
    ["📣","הפצה","אין לי היום ערוץ הפצה — לא קהל, לא ניוזלטר, לא שותפויות.","high"],
    ["⚖️","רגולציה ומשפט","דיסקליימרים קיימים, אבל צריך ליווי אמיתי: ייעוץ השקעות, פרטיות, נגישות.","med"],
    ["🧍","באס-פקטור של 1","אני לבד. זה מהיר — אבל שביר. מתועד היטב, ועדיין.","med"],
    ["💸","עלויות דאטה בסקייל","היום כמעט חינם; ב-10K משתמשים פעילים ספקי הדאטה מתחילים לעלות כסף אמיתי.","low"]];
  const bg = { high:C.redBg, med:C.amberBg, low:C.mint2 }, bd = { high:C.red, med:C.amber, low:C.teal };
  rk.forEach((r,i)=>{ const y=1.85+i*0.88;
    rrect(s, { x:0.6, y, w:12.13, h:0.76, fill:{ color:bg[r[3]] }, line:{type:"none"}, rectRadius:0.05 });
    T(s, r[0], { x:11.9, y, w:0.7, h:0.76, fontSize:15, align:"center", valign:"middle" });
    T(s, r[1], { x:8.15, y, w:3.65, h:0.76, fontSize:13, bold:true, color:C.ink, align:"right", valign:"middle" });
    T(s, r[2], { x:0.8, y, w:7.25, h:0.76, fontSize:10.5, color:C.muted, align:"right", valign:"middle" }); });
  rrect(s, { x:0.6, y:6.35, w:12.13, h:0.42, fill:{ color:C.mint }, line:{type:"none"}, rectRadius:0.05 });
  T(s, "בדיוק בגלל הרשימה הזאת רציתי לדבר איתך 👇", { x:0.6, y:6.35, w:12.13, h:0.42, fontSize:12, bold:true, color:C.ink, align:"center", valign:"middle" });
  s.addNotes("שקף הכנות: חמישה אתגרים אמיתיים. הגדול ביותר — קהילה ריקה והפצה. אחר כך רגולציה, העובדה שאני לבד, ועלויות דאטה בסקייל. אני לא מסתיר כלום — בדיוק בגלל זה השיחה הזאת.");
  foot(s, 7);
})();

// ───────────────────────── 8 · ROADMAP (near-term, real)
(()=>{ const s = base();
  head(s, "מה הלאה", "התוכנית לרבעון הקרוב — כבר מאופיינת");
  const q = [["עכשיו · מוכן לביצוע","מדיה עשירה",["עד ארבע תמונות בפוסט","חיפוש גיפים מובנה","אפיון ותוכנית עבודה כתובים"],true],
    ["חודש הקרוב","מוכנות להשקה",["דומיין וניטור שגיאות","נגישות וחבילה משפטית","ניקוי משתמשי בדיקה"],false],
    ["רבעון","ניתוחים מובנים",["מחיר יעד, טווח זמן, ביטחון","מעקב דיוק אנליסטים אמיתי","הליגה הופכת מבוססת-תוצאות"],false],
    ["רבעון+","צמיחה",["הזמנות ושיתופים ויראליים","קהילות נושא לפי סקטורים","שת״פ עם קהילות קיימות"],false]];
  q.forEach((c,i)=>{ const x=PW-0.6-(i+1)*2.95-i*0.12; const y=1.95;
    rrect(s, { x, y, w:2.95, h:3.6, fill:{ color: c[3]?C.amberBg:C.white }, line:{ color: c[3]?C.amber:C.border, width: c[3]?2:1.5 }, rectRadius:0.1 });
    T(s, c[0], { x:x+0.15, y:y+0.15, w:2.65, h:0.35, fontSize:10, bold:true, color:C.muted, align:"right", charSpacing:1 });
    T(s, c[1], { x:x+0.15, y:y+0.5, w:2.65, h:0.55, fontSize:14, bold:true, color:C.ink, align:"right" });
    s.addText(bullets(c[2], {fontSize:10}), { x:x+0.15, y:y+1.15, w:2.65, h:2.3, fontFace:F, rtlMode:true, align:"right" }); });
  rrect(s, { x:0.6, y:5.85, w:12.13, h:0.75, fill:{ color:C.ink }, line:{type:"none"}, rectRadius:0.08 });
  T(s, "העיקרון: קודם מוצר שמרגיש מלא ובטוח — ואז מביאים קהל. לא הפוך.", { x:0.6, y:5.85, w:12.13, h:0.75, fontSize:14, bold:true, color:C.white, align:"center", valign:"middle" });
  s.addNotes("מה הלאה: מדיה עשירה כבר מאופיינת עם תוכנית עבודה. חודש קרוב — מוכנות להשקה: דומיין, ניטור, משפטי. ברבעון — ניתוחים מובנים שהופכים את הליגה למבוססת תוצאות אמיתיות. ואז צמיחה. העיקרון: מוצר מלא לפני קהל.");
  foot(s, 8);
})();

// ───────────────────────── 9 · THE ASK (specific, no money)
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  T(s, "מה אני מבקש ממך", { x:PW-12, y:0.7, w:11.4, h:0.9, fontSize:40, bold:true, color:C.white, align:"right" });
  T(s, "לא כסף — ניסיון, חדות, ודלתות", { x:PW-12, y:1.6, w:11.4, h:0.5, fontSize:17, color:C.pale, align:"right" });
  const asks = [
    ["1","שעה של פידבק בלתי מרוחם","עברי איתי על המוצר כמו על מוצר של אפל — מה זול? מה מבלבל? מה היית זורקת?"],
    ["2","שתיים-שלוש היכרויות מדויקות","אנשי מוצר וצמיחה שבנו קהילות, או מישהו מעולם הפינטק וההשקעות הישראלי"],
    ["3","מנטורשיפ קל","שיחה של חצי שעה, אחת לחודש-חודשיים — כיוון, לא ליווי צמוד"],
    ["4","התשובה הכנה לשאלה אחת","אם זה היה הפרויקט שלך — מה היית עושה קודם: קהילה, מובייל, או שותפויות?"]];
  asks.forEach((a,i)=>{ const y=2.35+i*1.02;
    rrect(s, { x:0.9, y, w:11.5, h:0.9, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.08 });
    ell(s, { x:11.6, y:y+0.18, w:0.54, h:0.54, fill:{ color:C.teal }, line:{type:"none"} });
    T(s, a[0], { x:11.6, y:y+0.18, w:0.54, h:0.54, fontSize:16, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, a[1], { x:7.0, y:y+0.08, w:4.45, h:0.38, fontSize:14, bold:true, color:C.pale, align:"right" });
    T(s, a[2], { x:1.1, y:y+0.44, w:10.3, h:0.42, fontSize:11, color:C.mint, align:"right" }); });
  s.addNotes("הבקשה — לא כסף: (1) שעה של פידבק בלתי מרוחם על המוצר, ברמה של Apple. (2) שתיים-שלוש היכרויות מדויקות עם אנשי פרודקט/גרות׳ או פינטק. (3) מנטורשיפ קל — 30 דקות בחודש. (4) והתשובה הכנה: מה היית עושה קודם במקומי.");
  foot(s, 9);
})();

// ───────────────────────── 10 · LIVE DEMO
(()=>{ const s = base();
  head(s, "דמו חי", "בואי נסתכל על הדבר האמיתי");
  rrect(s, { x:PW-11.0, y:1.9, w:10.4, h:0.9, fill:{ color:C.mint }, line:{ color:C.teal, width:1.5 }, rectRadius:0.1 });
  T(s, "tsua-rho.vercel.app", { x:PW-11.0, y:1.9, w:10.4, h:0.9, fontSize:26, bold:true, color:C.tealDeep, align:"center", valign:"middle" });
  const steps = [["1","דף הבית","הבאנר החי רץ, הפיד נושם, מחירים מתעדכנים מול העיניים"],
    ["2","מצב כהה ובהיר","מתג אחד — כל האתר מתחלף, כולל כל גרף ווידג׳ט"],
    ["3","עמוד מניה — טבע","דאטה חי, גרף, ומה הקהילה חושבת — הכל בעברית"],
    ["4","שווקים","מפת חום סקטורים, מדד פחד וחמדנות, מאקרו — במבט אחד"],
    ["5","הליגה","דירוג האנליסטים — הגיימיפיקציה שתחזיק קהילה"]];
  steps.forEach((st,i)=>{ const y=3.1+i*0.68;
    ell(s, { x:PW-1.2, y:y+0.04, w:0.5, h:0.5, fill:{ color:C.teal }, line:{type:"none"} });
    T(s, st[0], { x:PW-1.2, y:y+0.04, w:0.5, h:0.5, fontSize:14, bold:true, color:C.white, align:"center", valign:"middle" });
    T(s, st[1], { x:PW-4.9, y:y+0.02, w:3.5, h:0.5, fontSize:14, bold:true, color:C.ink, align:"right", valign:"middle" });
    T(s, st[2], { x:0.7, y:y+0.02, w:7.6, h:0.5, fontSize:11.5, color:C.muted, align:"right", valign:"middle" }); });
  s.addNotes("דמו חי — חמישה עצירות: דף הבית עם הבאנר החי, מתג כהה/בהיר, עמוד מניה של טבע, מסך השווקים עם מפת החום, והליגה. לתת לה להקליק בעצמה אם היא רוצה — המוצר עומד בזה.");
  foot(s, 10);
})();

// ───────────────────────── 11 · WHY ME / HOW I BUILD
(()=>{ const s = base();
  head(s, "איך זה נבנה", "איך אדם אחד בונה בקצב של צוות שלם");
  const cols = [
    ["🧠","אני מגדיר — הבינה המלאכותית מבצעת","אפיון, סקירות עיצוב ותוכניות עבודה כתובות — ואז ביצוע מהיר עם בקרה שלי על כל שלב"],
    ["🔬","בדיקות שיטתיות","סורקי ניגודיות, בדיקות בריאות לפרודקשן, ואימות אחרי כל פריסה — לא ״עובד אצלי״"],
    ["📚","הידע נשמר","כל לקח הופך לתיעוד ולכלי — הפרויקט לומד, לא רק אני"]];
  cols.forEach((c,i)=>{ const x=PW-0.6-(i+1)*3.95-i*0.14; const y=2.0;
    rrect(s, { x, y, w:3.95, h:2.6, fill:{ color:C.mint2 }, line:{ color:C.border, width:1 }, rectRadius:0.1 });
    T(s, c[0], { x, y:y+0.2, w:3.95, h:0.6, fontSize:28, align:"center" });
    T(s, c[1], { x:x+0.15, y:y+0.9, w:3.65, h:0.5, fontSize:13.5, bold:true, color:C.ink, align:"center" });
    T(s, c[2], { x:x+0.2, y:y+1.45, w:3.55, h:1.0, fontSize:10.5, color:C.muted, align:"center" }); });
  rrect(s, { x:0.6, y:5.0, w:12.13, h:1.5, fill:{ color:C.amberBg }, line:{ color:C.amber, width:1 }, rectRadius:0.08 });
  T(s, "💡 למה זה מעניין אותך מקצועית", { x:PW-5.2, y:5.12, w:4.6, h:0.4, fontSize:13, bold:true, color:C.amberInk, align:"right" });
  T(s, "מה שרואים פה זה מקרה בוחן חי — אדם אחד עם בינה מלאכותית, במהירות של צוות ובאיכות של תהליך מסודר. אשמח לחוות דעתך איפה השיטה הזאת נשברת",
    { x:0.9, y:5.5, w:11.5, h:0.9, fontSize:12, color:C.amberInk, align:"right" });
  s.addNotes("איך זה נבנה: אני מגדיר וה-AI מבצע תחת בקרה — עם אפיונים כתובים, בדיקות שיטתיות ותיעוד שנשמר. וגם נקודת שיחה מקצועית בשבילה: מקרה בוחן חי של solo+AI. איפה השיטה נשברת? אשמח לדעתה.");
  foot(s, 11);
})();

// ───────────────────────── 12 · CLOSE
(()=>{ const s = base(C.ink);
  rect(s, { x:0, y:0, w:PW, h:PH, fill:{ color:C.ink } });
  rect(s, { x:PW-4.2, y:-2, w:6, h:6, fill:{ color:C.tealDeep }, rotate:38, line:{type:"none"} });
  logo(s, PW/2+1.0, 1.3, 0.7, true);
  T(s, "תודה 🙏", { x:PW-9.2, y:2.8, w:5.0, h:1.0, fontSize:44, bold:true, color:C.white, align:"center" });
  T(s, "עכשיו — ספרי לי מה את באמת חושבת.", { x:0.6, y:3.9, w:12.13, h:0.6, fontSize:20, color:C.pale, align:"center" });
  rrect(s, { x:PW/2-3.2, y:4.8, w:6.4, h:0.75, fill:{ color:"0c4a3a" }, line:{ color:C.teal, width:1 }, rectRadius:0.1 });
  T(s, "tsua-rho.vercel.app", { x:PW/2-3.2, y:4.8, w:6.4, h:0.75, fontSize:20, bold:true, color:C.pale, align:"center", valign:"middle" });
  s.addNotes("סיום: תודה. ועכשיו הכי חשוב — לשמוע מה היא באמת חושבת. לפתוח את הלפטופ ולתת לה את המוצר לידיים.");
  foot(s, 12);
})();

p.writeFile({ fileName: path.join("C:/Users/wave/Desktop/tsua/docs", "מצגת-תשואה-שיחה-פתוחה.pptx") })
  .then(f => console.log("WRITTEN:", f))
  .catch(e => { console.error("FAILED:", e); process.exit(1); });

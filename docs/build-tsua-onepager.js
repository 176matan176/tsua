/* תשואה-תקציר-מנהלים.docx — one-page RTL executive summary (leave-behind). */
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, LevelFormat, BorderStyle,
} = require("docx");
const fs = require("fs");
const path = require("path");

const TEAL = "00A884", INK = "003D2E", MUTED = "2A4D3E", GRAY = "5A7060";
const F = "Heebo";

// RTL paragraph helper
const P = (children, opts = {}) => new Paragraph(Object.assign({
  bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 80 },
  children: Array.isArray(children) ? children : [children],
}, opts));
const R = (text, opts = {}) => new TextRun(Object.assign({ text, font: F, size: 21, color: MUTED, rightToLeft: true }, opts));
const H = (text) => P(R(text, { bold: true, size: 26, color: INK }), {
  spacing: { before: 160, after: 60 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "C0DACE", space: 2 } },
});
const B = (text, bold0) => P(
  typeof text === "string" ? R(text) : text,
  { numbering: { reference: "b", level: 0 }, spacing: { after: 40 } }
);

const doc = new Document({
  numbering: { config: [{ reference: "b", levels: [{
    level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.RIGHT,
    style: { paragraph: { indent: { right: 260, hanging: 160 } } },
  }] }] },
  styles: { default: { document: { run: { font: F, size: 21 } } } },
  sections: [{
    properties: {
      page: { margin: { top: 700, bottom: 600, left: 800, right: 800 } },
      // RTL section
      textDirection: undefined,
    },
    children: [
      // Header
      P([R("תשואה", { bold: true, size: 56, color: INK }),
         R("   |   הרשת החברתית של המשקיע הישראלי", { size: 24, color: TEAL, bold: true })],
        { spacing: { after: 30 } }),
      P([R("תקציר מנהלים · יולי 2026     ", { size: 18, color: GRAY }),
         new TextRun({ text: "tsua-rho.vercel.app", font: "Calibri", size: 18, color: TEAL, bold: true })],
        { spacing: { after: 120 } }),

      H("הבעיה"),
      P(R("משקיע ישראלי חי היום בחמישה מסכים: טוויטר לרחשי שוק, יאהו לנתונים, וואטסאפ לדעות, טריידינגוויו לגרפים ואתרי חדשות לכותרות. הכל מפוצל, רובו באנגלית, ואין שום מקום שבו רואים מה הקהילה הישראלית חושבת — בזמן אמת ובעברית.")),

      H("הפתרון — מוצר חי, לא מצגת"),
      P(R("פלטפורמה אחת בעברית מלאה שמאחדת דאטה חי (תל אביב, ארה״ב, קריפטו — מתעדכן כל שתי שניות), פיד חברתי עם תיוג מניות וסנטימנט, ליגת אנליסטים קהילתית, והתקנה כאפליקציה — ישר מהדפדפן.")),
      B(R("שלושים עמודי מוצר, ארבעים ושש נקודות API, מאה ועשרים קומיטים — הכל בפרודקשן")),
      B(R("מצב כהה ובהיר, נגישות, ואפס נתונים מזויפים — הכל דאטה אמיתי")),
      B(R("החוויה ״נושמת״: מחירים מהבהבים ומספרים קופצים, כמו באפליקציית מסחר אמיתית")),

      H("מומנטום — רק בשבועיים האחרונים"),
      P(R("עשרים וחמישה קומיטים לפרודקשן: מערכת ערכות נושא מלאה, חוויית ריל-טיים, תיקוני עומק שאותרו בסריקות שיטתיות, הקשחת אבטחה ותשתית פריסה מקצועית. הכל סולו, בשיטת עבודה מבוססת בינה מלאכותית — מהירות של צוות, איכות של תהליך מסודר.")),

      H("האתגרים — בכנות"),
      B(R("קהילה ריקה: המוצר בנוי, אבל רשת חברתית בלי אנשים היא עיר רפאים — זה האתגר המרכזי")),
      B(R("הפצה: אין עדיין ערוץ — לא קהל, לא ניוזלטר, לא שותפויות")),
      B(R("רגולציה ומשפט: דיסקליימרים קיימים, נדרש ליווי אמיתי לקראת השקה")),
      B(R("באס-פקטור של אחד: מהיר אבל שביר — מתועד היטב, ועדיין")),

      H("מה אני מבקש"),
      B([R("שעה של פידבק בלתי מרוחם — ", { bold: true, color: INK }), R("לעבור על המוצר כאילו הוא מוצר של אפל")]),
      B([R("שתיים-שלוש היכרויות מדויקות — ", { bold: true, color: INK }), R("אנשי מוצר וצמיחה שבנו קהילות, או אנשי פינטק והשקעות בישראל")]),
      B([R("מנטורשיפ קל — ", { bold: true, color: INK }), R("חצי שעה אחת לחודש-חודשיים, כיוון ולא ליווי")]),
      B([R("תשובה כנה לשאלה אחת — ", { bold: true, color: INK }), R("מה היית עושה קודם במקומי: קהילה, מובייל או שותפויות?")]),

      P([R("להתרשמות חיה: ", { size: 19, color: GRAY }),
         new TextRun({ text: "tsua-rho.vercel.app", font: "Calibri", size: 19, color: TEAL, bold: true })],
        { spacing: { before: 140 } }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:/Users/wave/Desktop/tsua/docs/תשואה-תקציר-מנהלים.docx";
  fs.writeFileSync(out, buf);
  console.log("WRITTEN:", out);
});

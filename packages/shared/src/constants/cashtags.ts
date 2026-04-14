// Map Hebrew stock names/aliases to their ticker symbols
export const HEBREW_CASHTAG_ALIASES: Record<string, string> = {
  // Banks
  'לאומי': 'LUMI.TA',
  'פועלים': 'POLI.TA',
  'מזרחי': 'MZTF.TA',
  'דיסקונט': 'DSCT.TA',
  'הפועלים': 'POLI.TA',
  // Tech
  'טבע': 'TEVA.TA',
  'נייס': 'NICE.TA',
  'צ\'קפוינט': 'CHKP.TA',
  'אלביט': 'ESLT.TA',
  'נובה': 'NVMI.TA',
  'קמטק': 'CAMT.TA',
  // Energy & Infrastructure
  'חשמל': 'ELEC.TA',
  'בזק': 'BEZQ.TA',
  'כימיקלים': 'ICL.TA',
  'כי"ל': 'ICL.TA',
  // Finance
  'מיגדל': 'MGDL.TA',
  'הראל': 'HARL.TA',
  'ביטוח': 'HARL.TA',
  // Real Estate
  'אמות': 'AMOT.TA',
  'גב ים': 'GBIM.TA',
  // US stocks with Hebrew nicknames
  'אפל': 'AAPL',
  'טסלה': 'TSLA',
  'אנבידיה': 'NVDA',
  'מיקרוסופט': 'MSFT',
  'אמזון': 'AMZN',
  'מטא': 'META',
  'גוגל': 'GOOGL',
};

// Parse cashtags from post body (Hebrew + Latin)
export function extractCashtags(body: string): string[] {
  // Match $TICKER (Latin: letters, digits, dot) or $HEBREW (Hebrew chars)
  const regex = /\$([A-Za-z][A-Za-z0-9.]*|[\u05D0-\u05EA][\u05D0-\u05EA\s]*(?=[\s$,!?.]))/g;
  const matches: string[] = [];

  let match;
  while ((match = regex.exec(body)) !== null) {
    const raw = match[1].trim();
    const normalized = HEBREW_CASHTAG_ALIASES[raw] ?? raw.toUpperCase();
    if (!matches.includes(normalized)) {
      matches.push(normalized);
    }
  }
  return matches;
}

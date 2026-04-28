/**
 * 11 GICS sectors with Hebrew names, emoji, and representative ETF tickers.
 *
 * Each sector is represented in the US market by an SPDR Sector ETF (XL*).
 * These ETFs give real-time sector performance without needing to compute
 * from constituents.
 *
 * The `top` list is a small curated selection of notable stocks in each
 * sector that users are likely to recognize — shown on the sector detail page.
 */

export interface Sector {
  key: string;            // url-friendly key, e.g. 'tech'
  nameHe: string;         // Hebrew name
  nameEn: string;         // English name (GICS)
  emoji: string;
  etf: string;            // SPDR sector ETF ticker
  color: string;          // base color for the sector (hex)
  description: string;    // Hebrew one-liner
  top: string[];          // Top 5-8 notable constituents
}

export const SECTORS: Sector[] = [
  {
    key: 'tech',
    nameHe: 'טכנולוגיה',
    nameEn: 'Information Technology',
    emoji: '💻',
    etf: 'XLK',
    color: '#3b82f6',
    description: 'ענקיות התוכנה, המוליכים למחצה והמחשוב הענני — השחקן הדומיננטי בשוק.',
    top: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'AMD', 'ADBE', 'CSCO', 'ACN', 'IBM', 'INTU', 'NOW', 'QCOM', 'TXN', 'AMAT'],
  },
  {
    key: 'health',
    nameHe: 'בריאות',
    nameEn: 'Health Care',
    emoji: '💊',
    etf: 'XLV',
    color: '#10b981',
    description: 'חברות תרופות, ביוטכנולוגיה, ציוד רפואי וביטוחי בריאות.',
    top: ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'TMO', 'PFE', 'ABT', 'DHR', 'ISRG', 'AMGN', 'GILD', 'BMY', 'CVS'],
  },
  {
    key: 'finance',
    nameHe: 'פיננסים',
    nameEn: 'Financials',
    emoji: '🏦',
    etf: 'XLF',
    color: '#f59e0b',
    description: 'בנקים, חברות ביטוח, שוקי הון ונדל"ן פיננסי.',
    top: ['JPM', 'V', 'BAC', 'MA', 'WFC', 'GS', 'MS', 'BLK', 'AXP', 'C', 'SCHW', 'PGR', 'USB', 'PYPL', 'COF'],
  },
  {
    key: 'discretionary',
    nameHe: 'צריכה פנאי',
    nameEn: 'Consumer Discretionary',
    emoji: '🛍️',
    etf: 'XLY',
    color: '#ec4899',
    description: 'רכב, אופנה, בידור, מלונות — מה שצרכנים קונים כשכלכלית להם טוב.',
    top: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'BKNG', 'TJX', 'MAR', 'ABNB', 'CMG', 'GM', 'F'],
  },
  {
    key: 'staples',
    nameHe: 'צריכה בסיסית',
    nameEn: 'Consumer Staples',
    emoji: '🛒',
    etf: 'XLP',
    color: '#8b5cf6',
    description: 'מזון, משקאות, תרופות ללא מרשם — מוצרים שקונים גם במיתון.',
    top: ['WMT', 'PG', 'COST', 'KO', 'PEP', 'PM', 'MDLZ', 'CL', 'MO', 'TGT', 'KMB', 'EL'],
  },
  {
    key: 'energy',
    nameHe: 'אנרגיה',
    nameEn: 'Energy',
    emoji: '⛽',
    etf: 'XLE',
    color: '#ef4444',
    description: 'נפט, גז טבעי, אנרגיה מתחדשת — תלוי במחירי חומרי גלם גלובליים.',
    top: ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'OXY', 'VLO', 'WMB', 'KMI', 'ENB'],
  },
  {
    key: 'industrials',
    nameHe: 'תעשייה',
    nameEn: 'Industrials',
    emoji: '🏭',
    etf: 'XLI',
    color: '#64748b',
    description: 'תעופה, ביטחון, מכונות, הובלה — מצב הכלכלה בגדול.',
    top: ['GE', 'CAT', 'UBER', 'RTX', 'HON', 'BA', 'UNP', 'LMT', 'DE', 'UPS', 'FDX', 'NOC'],
  },
  {
    key: 'materials',
    nameHe: 'חומרים',
    nameEn: 'Materials',
    emoji: '🧪',
    etf: 'XLB',
    color: '#a3a3a3',
    description: 'כימיקלים, מתכות, חומרי בנייה — מדד למצב התעשייה הגלובלית.',
    top: ['LIN', 'SHW', 'APD', 'ECL', 'FCX', 'NEM', 'DD', 'DOW', 'CTVA', 'NUE', 'VMC'],
  },
  {
    key: 'utilities',
    nameHe: 'שירותים ציבוריים',
    nameEn: 'Utilities',
    emoji: '⚡',
    etf: 'XLU',
    color: '#14b8a6',
    description: 'חשמל, מים, גז — מניות דיבידנד יציבות ("אג"ח דמויות מניות").',
    top: ['NEE', 'SO', 'DUK', 'CEG', 'AEP', 'SRE', 'D', 'PCG', 'EXC', 'XEL', 'ED'],
  },
  {
    key: 'realestate',
    nameHe: 'נדל"ן',
    nameEn: 'Real Estate',
    emoji: '🏢',
    etf: 'XLRE',
    color: '#f97316',
    description: 'REITs — נדל"ן מסחרי, משרדים, מרכזים לוגיסטיים, דיור.',
    top: ['PLD', 'AMT', 'EQIX', 'WELL', 'SPG', 'PSA', 'O', 'CCI', 'DLR', 'EXR'],
  },
  {
    key: 'communication',
    nameHe: 'תקשורת',
    nameEn: 'Communication Services',
    emoji: '📡',
    etf: 'XLC',
    color: '#06b6d4',
    description: 'מדיה, רשתות חברתיות, טלקום — מ-Google ועד Netflix.',
    top: ['META', 'GOOGL', 'NFLX', 'DIS', 'T', 'TMUS', 'VZ', 'CMCSA', 'CHTR', 'EA', 'TTWO'],
  },
];

export function getSector(key: string): Sector | undefined {
  return SECTORS.find(s => s.key === key);
}

export function getAllEtfs(): string[] {
  return SECTORS.map(s => s.etf);
}

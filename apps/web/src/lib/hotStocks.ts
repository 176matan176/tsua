// apps/web/src/lib/hotStocks.ts

export interface UniverseStock {
  ticker: string;
  nameHe: string;
  nameEn: string;
  exchange: string;
}

export interface StockScore extends UniverseStock {
  rank: number;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  hotScore: number;
  buzzScore: number;
  volatilityScore: number;
  volumeScore: number;
  reason: string;
  mentions24h: number;
  sentiment: { bullish: number; bearish: number; neutral: number; total: number };
}

export const IL_UNIVERSE: UniverseStock[] = [
  { ticker: 'TEVA', nameHe: 'טבע',           nameEn: 'Teva',           exchange: 'NYSE'   },
  { ticker: 'NICE', nameHe: 'ניס',             nameEn: 'NICE',           exchange: 'NASDAQ' },
  { ticker: 'CHKP', nameHe: "צ'קפוינט",      nameEn: 'Check Point',    exchange: 'NASDAQ' },
  { ticker: 'MNDY', nameHe: 'מאנדיי',          nameEn: 'Monday.com',     exchange: 'NASDAQ' },
  { ticker: 'WIX',  nameHe: 'וויקס',           nameEn: 'Wix',            exchange: 'NASDAQ' },
  { ticker: 'GLBE', nameHe: 'גלובל-E',         nameEn: 'Global-E',       exchange: 'NASDAQ' },
  { ticker: 'FVRR', nameHe: 'פייבר',            nameEn: 'Fiverr',         exchange: 'NYSE'   },
  { ticker: 'CEVA', nameHe: 'סבה',              nameEn: 'CEVA',           exchange: 'NASDAQ' },
  { ticker: 'AUDC', nameHe: 'אודיו-קודס',     nameEn: 'AudioCodes',     exchange: 'NASDAQ' },
  { ticker: 'TSEM', nameHe: 'טאוור',            nameEn: 'Tower Semi',     exchange: 'NASDAQ' },
  { ticker: 'ESLT', nameHe: 'אלביט',            nameEn: 'Elbit Systems',  exchange: 'NASDAQ' },
  { ticker: 'NNDM', nameHe: 'ננו-דיימנשן',     nameEn: 'Nano Dimension', exchange: 'NASDAQ' },
  { ticker: 'INMD', nameHe: 'אינמד',            nameEn: 'InMode',         exchange: 'NASDAQ' },
  { ticker: 'CYBR', nameHe: 'סייברארק',         nameEn: 'CyberArk',       exchange: 'NASDAQ' },
  { ticker: 'CLBT', nameHe: 'סלברייט',          nameEn: 'Cellebrite',     exchange: 'NASDAQ' },
  { ticker: 'RDWR', nameHe: 'רדוור',            nameEn: 'Radware',        exchange: 'NASDAQ' },
  { ticker: 'CRNT', nameHe: 'סראגון',           nameEn: 'Ceragon',        exchange: 'NASDAQ' },
  { ticker: 'GILT', nameHe: 'גילת',             nameEn: 'Gilat',          exchange: 'NASDAQ' },
  { ticker: 'NVMI', nameHe: 'נובה',             nameEn: 'Nova',           exchange: 'NASDAQ' },
  { ticker: 'ZIM',  nameHe: 'צים',              nameEn: 'ZIM Shipping',   exchange: 'NYSE'   },
];

export const US_UNIVERSE: UniverseStock[] = [
  { ticker: 'AAPL', nameHe: 'אפל',             nameEn: 'Apple',          exchange: 'NASDAQ' },
  { ticker: 'MSFT', nameHe: 'מיקרוסופט',       nameEn: 'Microsoft',      exchange: 'NASDAQ' },
  { ticker: 'NVDA', nameHe: 'אנבידיה',         nameEn: 'NVIDIA',         exchange: 'NASDAQ' },
  { ticker: 'TSLA', nameHe: 'טסלה',             nameEn: 'Tesla',          exchange: 'NASDAQ' },
  { ticker: 'AMZN', nameHe: 'אמזון',            nameEn: 'Amazon',         exchange: 'NASDAQ' },
  { ticker: 'GOOGL',nameHe: 'גוגל',             nameEn: 'Alphabet',       exchange: 'NASDAQ' },
  { ticker: 'META', nameHe: 'מטא',              nameEn: 'Meta',           exchange: 'NASDAQ' },
  { ticker: 'NFLX', nameHe: 'נטפליקס',          nameEn: 'Netflix',        exchange: 'NASDAQ' },
  { ticker: 'AMD',  nameHe: 'AMD',              nameEn: 'AMD',            exchange: 'NASDAQ' },
  { ticker: 'INTC', nameHe: 'אינטל',            nameEn: 'Intel',          exchange: 'NASDAQ' },
  { ticker: 'CRM',  nameHe: 'סיילספורס',       nameEn: 'Salesforce',     exchange: 'NYSE'   },
  { ticker: 'UBER', nameHe: 'אובר',             nameEn: 'Uber',           exchange: 'NYSE'   },
  { ticker: 'SHOP', nameHe: 'שופיפיי',          nameEn: 'Shopify',        exchange: 'NYSE'   },
  { ticker: 'COIN', nameHe: 'קוינבייס',         nameEn: 'Coinbase',       exchange: 'NASDAQ' },
  { ticker: 'PLTR', nameHe: 'פאלנטיר',          nameEn: 'Palantir',       exchange: 'NYSE'   },
  { ticker: 'PYPL', nameHe: 'פייפאל',           nameEn: 'PayPal',         exchange: 'NASDAQ' },
  { ticker: 'XYZ',  nameHe: 'בלוק',             nameEn: 'Block',          exchange: 'NYSE'   },
  { ticker: 'V',    nameHe: 'ויזה',              nameEn: 'Visa',           exchange: 'NYSE'   },
  { ticker: 'MA',   nameHe: 'מסטרקארד',        nameEn: 'Mastercard',     exchange: 'NYSE'   },
  { ticker: 'JPM',  nameHe: "ג'י-פי-מורגן",   nameEn: 'JPMorgan',       exchange: 'NYSE'   },
  { ticker: 'BAC',  nameHe: 'בנק אמריקה',      nameEn: 'Bank of America', exchange: 'NYSE'  },
  { ticker: 'XOM',  nameHe: 'אקסון',            nameEn: 'ExxonMobil',     exchange: 'NYSE'   },
  { ticker: 'WMT',  nameHe: 'וולמארט',          nameEn: 'Walmart',        exchange: 'NYSE'   },
  { ticker: 'DIS',  nameHe: 'דיסני',             nameEn: 'Disney',         exchange: 'NYSE'   },
  { ticker: 'RBLX', nameHe: 'רובלוקס',          nameEn: 'Roblox',         exchange: 'NYSE'   },
];

/**
 * Compute a hot score (0–100) from buzz, volatility, and relative volume rank.
 * @param mentions     Number of community posts mentioning this stock in last 24h
 * @param changePct    Price change percent today (can be negative)
 * @param volumeRank   0-based rank by today's volume (0 = highest volume)
 * @param totalStocks  Total stocks in universe
 */
export function computeHotScore(
  mentions: number,
  changePct: number | null,
  volumeRank: number,
  totalStocks: number,
): { hotScore: number; buzzScore: number; volatilityScore: number; volumeScore: number; reason: string } {
  const buzzScore       = Math.min(40, mentions * 4);
  const volatilityScore = Math.min(30, Math.abs(changePct ?? 0) * 3);
  const volumeScore     = Math.round(((totalStocks - 1 - volumeRank) / Math.max(totalStocks - 1, 1)) * 30);
  const hotScore        = Math.round(buzzScore + volatilityScore + volumeScore);

  const reason =
    buzzScore >= volatilityScore && buzzScore >= volumeScore ? '🔥 באזז חם' :
    volatilityScore >= volumeScore                           ? '⚡ תנודה חדה' :
                                                               '📊 נפח חריג';

  return {
    hotScore,
    buzzScore:        Math.round(buzzScore),
    volatilityScore:  Math.round(volatilityScore),
    volumeScore,
    reason,
  };
}

/** Build sparkline points from Finnhub quote fields (no extra API call needed). */
export function buildSparklinePoints(
  prevClose: number | null,
  open: number | null,
  low: number | null,
  high: number | null,
  price: number | null,
): number[] {
  if (!prevClose || !open || !low || !high || !price) return [];
  const isUp = price >= prevClose;
  // Order: previous close → open → (low then high for bulls, high then low for bears) → current
  return isUp
    ? [prevClose, open, low,  high, price]
    : [prevClose, open, high, low,  price];
}

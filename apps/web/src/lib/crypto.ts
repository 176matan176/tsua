/**
 * Crypto metadata — top 20 cryptocurrencies with Hebrew context.
 *
 * Data source: CoinGecko free API (https://api.coingecko.com/api/v3/).
 * No API key required for basic endpoints (30 calls/minute rate limit).
 *
 * We use CoinGecko IDs (e.g. 'bitcoin') rather than ticker symbols
 * (BTC) to avoid collisions with stock tickers.
 */

export interface CryptoCoin {
  id: string;            // coingecko id, e.g. 'bitcoin'
  symbol: string;        // trading symbol, e.g. 'BTC'
  nameHe: string;        // Hebrew name
  nameEn: string;        // English name
  description: string;   // Hebrew one-liner
}

export const CRYPTO_COINS: CryptoCoin[] = [
  { id: 'bitcoin',        symbol: 'BTC',   nameHe: 'ביטקוין',         nameEn: 'Bitcoin',        description: 'הקריפטו הראשון והגדול ביותר — "זהב דיגיטלי"' },
  { id: 'ethereum',       symbol: 'ETH',   nameHe: 'את\'ריום',        nameEn: 'Ethereum',       description: 'פלטפורמה לחוזים חכמים ואפליקציות מבוזרות' },
  { id: 'tether',         symbol: 'USDT',  nameHe: 'טת\'ר',           nameEn: 'Tether',         description: 'Stablecoin צמוד לדולר — ה-USDT הכי נסחר' },
  { id: 'binancecoin',    symbol: 'BNB',   nameHe: 'ביינאנס',         nameEn: 'BNB',            description: 'מטבע בורסת הקריפטו הגדולה בעולם' },
  { id: 'solana',         symbol: 'SOL',   nameHe: 'סולאנה',          nameEn: 'Solana',         description: 'בלוקצ\'יין מהיר ומשתלם — מתחרה ל-ETH' },
  { id: 'ripple',         symbol: 'XRP',   nameHe: 'ריפל',            nameEn: 'XRP',            description: 'פתרון תשלומים גלובלי לבנקים' },
  { id: 'usd-coin',       symbol: 'USDC',  nameHe: 'USDC',            nameEn: 'USD Coin',       description: 'Stablecoin של Circle, מגובה בדולרים' },
  { id: 'dogecoin',       symbol: 'DOGE',  nameHe: 'דוג\'קוין',       nameEn: 'Dogecoin',       description: 'המטבע המים — אומץ על ידי מאסק' },
  { id: 'cardano',        symbol: 'ADA',   nameHe: 'קרדאנו',          nameEn: 'Cardano',        description: 'בלוקצ\'יין מדעי עם גישה אקדמית' },
  { id: 'tron',           symbol: 'TRX',   nameHe: 'טרון',            nameEn: 'TRON',           description: 'רשת תוכן מבוזר, גדולה באסיה' },
  { id: 'avalanche-2',    symbol: 'AVAX',  nameHe: 'אבלנצ\'',         nameEn: 'Avalanche',      description: 'פלטפורמת חוזים חכמים מהירה' },
  { id: 'chainlink',      symbol: 'LINK',  nameHe: 'צ\'יינלינק',      nameEn: 'Chainlink',      description: 'רשת Oracle המובילה — מחברת חוזים למידע חיצוני' },
  { id: 'polkadot',       symbol: 'DOT',   nameHe: 'פולקדוט',         nameEn: 'Polkadot',       description: 'בלוקצ\'יין שמחבר בלוקצ\'יינים אחרים' },
  { id: 'shiba-inu',      symbol: 'SHIB',  nameHe: 'שיבה',            nameEn: 'Shiba Inu',      description: 'Meme coin — גלגול דוג\'קוין על Ethereum' },
  { id: 'matic-network',  symbol: 'MATIC', nameHe: 'פוליגון',         nameEn: 'Polygon',        description: 'פתרון Layer-2 ל-Ethereum — זול ומהיר' },
  { id: 'litecoin',       symbol: 'LTC',   nameHe: 'לייטקוין',        nameEn: 'Litecoin',       description: 'ביטקוין קל — עסקאות מהירות יותר' },
  { id: 'bitcoin-cash',   symbol: 'BCH',   nameHe: 'ביטקוין קאש',     nameEn: 'Bitcoin Cash',   description: 'Fork של ביטקוין עם בלוקים גדולים יותר' },
  { id: 'uniswap',        symbol: 'UNI',   nameHe: 'יוניסוואפ',       nameEn: 'Uniswap',        description: 'בורסה מבוזרת (DEX) הגדולה ב-Ethereum' },
  { id: 'near',           symbol: 'NEAR',  nameHe: 'נייר',            nameEn: 'NEAR Protocol',  description: 'פלטפורמה לאפליקציות מבוזרות ידידותית למפתחים' },
  { id: 'stellar',        symbol: 'XLM',   nameHe: 'סטלאר',           nameEn: 'Stellar',        description: 'תשלומים בינלאומיים זולים ומהירים' },
];

export function getCoin(id: string): CryptoCoin | undefined {
  return CRYPTO_COINS.find(c => c.id === id || c.symbol.toLowerCase() === id.toLowerCase());
}

export function getAllCoinIds(): string[] {
  return CRYPTO_COINS.map(c => c.id);
}

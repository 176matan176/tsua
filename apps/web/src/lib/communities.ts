/**
 * Community (קהילה) definitions — the curated discussion spaces listed on
 * /rooms and rendered by RoomChat. Single source of truth shared by the
 * directory and the chat header (the chat used to hardcode "יומאים" for every
 * slug). Route segment stays /rooms — only the product wording changed to
 * "קהילות" (communities).
 *
 * NOTE: `members` counts are demo-era placeholders, not real data. Phase 2
 * (real chat on Supabase) should replace them with actual membership rows —
 * do not present them as live numbers anywhere new.
 */
import { getStockHebrewName } from '@/lib/stockDescriptions';

export interface Community {
  slug: string;
  nameHe: string;
  nameEn: string;
  descHe: string;
  descEn: string;
  members: number;
  isOfficial: boolean;
  icon: string;
  /** True for auto-generated per-stock communities (slug === ticker). */
  isStock?: boolean;
}

export const COMMUNITIES: Community[] = [
  {
    slug: 'day-traders',
    nameHe: 'יומאים',
    nameEn: 'Day Traders',
    descHe: 'ניתוח טכני ומומנטום בת"א ובוול סטריט',
    descEn: 'Technical analysis and momentum plays in TASE & Wall Street',
    members: 1243,
    isOfficial: true,
    icon: '⚡',
  },
  {
    slug: 'dividend-seekers',
    nameHe: 'מחפשי דיבידנד',
    nameEn: 'Dividend Seekers',
    descHe: 'השקעות ארוכות טווח ומניות דואליות',
    descEn: 'Long-term investing and dual-listed Israeli stocks',
    members: 876,
    isOfficial: true,
    icon: '🎯',
  },
  {
    slug: 'ta125-focus',
    nameHe: 'ת"א 125',
    nameEn: 'TA-125 Focus',
    descHe: 'לב הכלכלה הישראלית ומניות הבורסה',
    descEn: 'Deep-dives into the heart of the Israeli economy',
    members: 654,
    isOfficial: true,
    icon: '🏢',
  },
  {
    slug: 'us-tech',
    nameHe: 'טכנולוגיה אמריקאית',
    nameEn: 'US Tech',
    descHe: 'NVDA, AAPL, TSLA ועוד',
    descEn: 'NVDA, AAPL, TSLA and more',
    members: 2105,
    isOfficial: false,
    icon: '🤖',
  },
  {
    slug: 'macro-il',
    nameHe: 'מאקרו ישראלי',
    nameEn: 'Israeli Macro',
    descHe: 'כלכלה ישראלית, ריבית בנק ישראל, שקל/דולר',
    descEn: 'Israeli economy, Bank of Israel rates, ILS/USD',
    members: 432,
    isOfficial: false,
    icon: '🏦',
  },
];

export function getCommunity(slug: string): Community | undefined {
  return COMMUNITIES.find((c) => c.slug === slug);
}

/**
 * Resolve a community from a slug — a curated community OR an auto-generated
 * per-stock community. Every valid ticker (1–6 uppercase letters, optional
 * .TA) becomes its own live discussion, reusing the whole room stack
 * (messages / members / reactions / presence). Returns null for junk slugs.
 *
 * Callers should use the returned `.slug` as the canonical room_slug so that
 * /rooms/nvda and /rooms/NVDA don't split into two rooms.
 */
export function resolveCommunity(slug: string): Community | null {
  const curated = COMMUNITIES.find((c) => c.slug === slug);
  if (curated) return curated;

  const ticker = slug.toUpperCase();
  if (!/^[A-Z]{1,6}(\.TA)?$/.test(ticker)) return null;

  const heName = getStockHebrewName(ticker);
  const bare = ticker.replace('.TA', '');
  return {
    slug: ticker,
    nameHe: heName ?? `$${bare}`,
    nameEn: `$${bare}`,
    descHe: `דיון חי על ${heName ?? bare}`,
    descEn: `Live discussion about ${bare}`,
    members: 0,
    isOfficial: false,
    icon: '📈',
    isStock: true,
  };
}

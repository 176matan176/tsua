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
export interface Community {
  slug: string;
  nameHe: string;
  nameEn: string;
  descHe: string;
  descEn: string;
  members: number;
  isOfficial: boolean;
  icon: string;
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

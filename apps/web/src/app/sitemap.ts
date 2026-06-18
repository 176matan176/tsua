import { MetadataRoute } from 'next';
import { SECTORS } from '@/lib/sectors';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsua-rho.vercel.app';

/**
 * Sitemap entries we generate per ticker. Includes both popular US names
 * (high search volume) and the major TASE listings (high search intent for
 * Israeli users). When you add a Hebrew name in `stockDescriptions.ts`, add
 * the ticker here too so Google sees the canonical URL.
 *
 * NOTE: kept manual rather than generated from HEBREW_NAMES — sitemap shouldn't
 * leak through every ticker we happen to have a name for. Only the head.
 */
const POPULAR_TICKERS = [
  // US mega-cap
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA', 'NFLX', 'AMD', 'INTC',
  // US indices / ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'EIS',
  // Israeli — dual-listed + major TASE
  'TEVA', 'NICE', 'CHKP', 'WIX', 'MNDY', 'FROG', 'ESLT', 'ICL', 'MNDO',
  // US finance / payments
  'JPM', 'V', 'MA', 'BAC',
  // US consumer / industrial
  'WMT', 'COST', 'KO', 'PEP', 'NKE', 'BA', 'XOM', 'PFE', 'JNJ',
];

const LOCALES = ['he', 'en'] as const;

// Static pages we expose to crawlers. Skip /portfolio, /alerts, /watchlist
// when user-specific — they 401 for unauthenticated crawlers and waste budget.
const STATIC_PUBLIC = ['', '/markets', '/leaderboard', '/sectors', '/news', '/crypto', '/earnings'];

// Build an alternates block for hreflang. Google + Bing read this from the
// sitemap directly (in addition to the `<link rel="alternate">` tags on
// individual pages), which helps when a page isn't crawled yet.
function alternates(path: string): Record<string, string> {
  return {
    he: `${BASE_URL}/he${path}`,
    en: `${BASE_URL}/en${path}`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = LOCALES.flatMap(locale =>
    STATIC_PUBLIC.map(page => ({
      url: `${BASE_URL}/${locale}${page}`,
      lastModified: now,
      changeFrequency: page === '' ? ('daily' as const) : ('daily' as const),
      priority: page === '' ? 1 : 0.7,
      alternates: { languages: alternates(page) },
    }))
  );

  // Per-ticker stock pages — the SEO crown jewels. `hourly` change frequency
  // signals to crawlers that the price changes often, but Google decides for
  // itself how often to revisit.
  const stockRoutes: MetadataRoute.Sitemap = LOCALES.flatMap(locale =>
    POPULAR_TICKERS.map(ticker => ({
      url: `${BASE_URL}/${locale}/stocks/${ticker}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.9,
      alternates: { languages: alternates(`/stocks/${ticker}`) },
    }))
  );

  // Sector pages. There are only 11 GICS sectors; cheap to enumerate.
  const sectorRoutes: MetadataRoute.Sitemap = LOCALES.flatMap(locale =>
    SECTORS.map(sector => ({
      url: `${BASE_URL}/${locale}/sectors/${sector.key}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
      alternates: { languages: alternates(`/sectors/${sector.key}`) },
    }))
  );

  return [...staticRoutes, ...stockRoutes, ...sectorRoutes];
}

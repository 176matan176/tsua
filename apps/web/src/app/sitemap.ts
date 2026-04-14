import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tsua-rho.vercel.app';

const POPULAR_TICKERS = [
  'TEVA', 'NICE', 'CHKP', 'NVDA', 'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'META', 'AMZN',
  'ICL', 'ESLT', 'SMHI', 'BEZQ', 'PELE',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages = [
    '', '/markets', '/alerts', '/portfolio', '/watchlist', '/leaderboard',
  ];

  const staticRoutes: MetadataRoute.Sitemap = staticPages.map(page => ({
    url: `${BASE_URL}${page}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: page === '' ? 1 : 0.8,
  }));

  const stockRoutes: MetadataRoute.Sitemap = POPULAR_TICKERS.map(ticker => ({
    url: `${BASE_URL}/stocks/${ticker}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...stockRoutes];
}

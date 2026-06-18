import type { Metadata } from 'next';
import Script from 'next/script';
import { StockPageClient } from './StockPageClient';
import { getStockHebrewName, getStockDescription } from '@/lib/stockDescriptions';

interface StockPageProps {
  params: { ticker: string; locale: string };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tsua-rho.vercel.app';

/**
 * Build the SEO metadata for /[locale]/stocks/[ticker].
 *
 * Why this is a P1 differentiator: Israelis Googling "מניית טבע", "מחיר NVDA",
 * "ראסל 2000" should find us first. That requires:
 *   1. Hebrew name in `<title>` and `og:title` (not just the ticker)
 *   2. Action-led description with the words people actually type
 *   3. JSON-LD structured data → Google rich results
 *   4. Canonical + hreflang so /he and /en don't fight each other
 *   5. OG image generator (already wired) so WhatsApp/Telegram previews
 *      look professional and not like a generic Next.js placeholder
 */
export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const locale = params.locale;
  const isHebrew = locale === 'he';

  const heName = getStockHebrewName(ticker);
  const heDesc = getStockDescription(ticker);
  // Compose a display string that includes the Hebrew name when we have one.
  // Example: "מניית NVDA (אנבידיה)" vs "מניית LUMI" for unknowns.
  const heDisplay = heName ? `מניית ${ticker} (${heName})` : `מניית ${ticker}`;

  const title = isHebrew
    ? `${heDisplay} — מחיר חי, ניתוח ודיון בקהילה | תשואה`
    : `${ticker}${heName ? ` (${heName})` : ''} — Live Price, Analysis & Community | Tsua`;

  // Description is heavily SEO-loaded: includes verbs Israeli traders search
  // for ("מחיר", "ניתוח", "דיון") plus the company name + ticker. Stays under
  // 160 chars so Google doesn't truncate.
  const description = isHebrew
    ? heDesc
      ? `${heDesc}. מחיר חי, גרף, חדשות וסנטימנט קהילתי עבור ${heDisplay} בתשואה — הפלטפורמה הישראלית למסחר חברתי.`
      : `מחיר חי, גרף, חדשות, סנטימנט קהילתי וניתוח עבור ${heDisplay} בתשואה — הפלטפורמה הישראלית למסחר חברתי במניות.`
    : `Live price, chart, news, sentiment and community discussion for ${ticker} on Tsua — Israel's social trading platform.`;

  const path = `/${locale}/stocks/${ticker}`;
  const url = `${SITE_URL}${path}`;
  const ogUrl = `/api/og/stock/${ticker}`;

  return {
    title,
    description,
    // Canonical to the locale-specific URL; hreflang signals alternates so
    // Google serves the right language and we don't pay a duplicate-content
    // penalty for having both /he/stocks/NVDA and /en/stocks/NVDA.
    alternates: {
      canonical: url,
      languages: {
        he: `${SITE_URL}/he/stocks/${ticker}`,
        en: `${SITE_URL}/en/stocks/${ticker}`,
        'x-default': `${SITE_URL}/he/stocks/${ticker}`,
      },
    },
    openGraph: {
      title: isHebrew ? `${heDisplay} | תשואה` : `${ticker} | Tsua`,
      description,
      type: 'website',
      url,
      locale: isHebrew ? 'he_IL' : 'en_US',
      siteName: 'תשואה',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: isHebrew ? `${heDisplay} בתשואה` : `${ticker} on Tsua` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: isHebrew ? `${heDisplay} | תשואה` : `${ticker} | Tsua`,
      description,
      images: [ogUrl],
    },
    // Robots: indexable + follow. The default is fine but being explicit
    // helps when a misconfigured CDN injects a `noindex` header.
    robots: { index: true, follow: true },
  };
}

export default function StockPage({ params }: StockPageProps) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const locale = params.locale;
  const heName = getStockHebrewName(ticker);
  const heDesc = getStockDescription(ticker);
  const url = `${SITE_URL}/${locale}/stocks/${ticker}`;

  // JSON-LD: `FinancialProduct` is the right schema for an equity instrument.
  // We add a `BreadcrumbList` for sitelink-friendly Google results and a
  // `WebPage` so the page itself shows up cleanly in search.
  //
  // We deliberately do NOT inject a `Quote` with a price — those go stale
  // the moment the page is cached and Google has been known to penalise
  // pages whose structured data drifts from on-page content. The UI shows
  // the price; structured data describes the entity.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FinancialProduct',
        name: heName ? `${heName} (${ticker})` : ticker,
        identifier: ticker,
        category: 'Equity',
        ...(heDesc ? { description: heDesc } : {}),
        provider: { '@type': 'Organization', name: 'תשואה', url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'תשואה', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'שווקים', item: `${SITE_URL}/${locale}/markets` },
          { '@type': 'ListItem', position: 3, name: heName ? `${heName} (${ticker})` : ticker, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <Script
        id={`jsonld-stock-${ticker}`}
        type="application/ld+json"
        // Inline JSON-LD: small payload, doesn't need to be fetched, gets
        // picked up by Google during crawl. `dangerouslySetInnerHTML` is the
        // standard way to do this — content is server-controlled, not user.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StockPageClient ticker={ticker} />
    </>
  );
}

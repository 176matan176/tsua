import type { Metadata } from 'next';
import { StockPageClient } from './StockPageClient';

interface StockPageProps {
  params: { ticker: string; locale: string };
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  const ogUrl = `/api/og/stock/${ticker}`;
  return {
    title: `$${ticker} — מניה חיה | תשואה`,
    description: `מחיר חי, גרף, חדשות וסנטימנט קהילתי עבור ${ticker} בתשואה — הפלטפורמה החברתית לשוק ההון`,
    openGraph: {
      title: `$${ticker} | תשואה`,
      description: `מחיר ונתונים חיים עבור $${ticker}`,
      type: 'website',
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${ticker} בתשואה` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `$${ticker} | תשואה`,
      description: `מחיר ונתונים חיים עבור $${ticker}`,
      images: [ogUrl],
    },
  };
}

export default function StockPage({ params }: StockPageProps) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  return <StockPageClient ticker={ticker} />;
}

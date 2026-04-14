import type { Metadata } from 'next';
import { StockPageClient } from './StockPageClient';

interface StockPageProps {
  params: { ticker: string; locale: string };
}

export async function generateMetadata({ params }: StockPageProps): Promise<Metadata> {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  return {
    title: `$${ticker} — מניה חיה | תשואה`,
    description: `מחיר חי, גרף, חדשות וסנטימנט קהילתי עבור ${ticker} בתשואה — הפלטפורמה החברתית לשוק ההון`,
    openGraph: {
      title: `$${ticker} | תשואה`,
      description: `מחיר ונתונים חיים עבור $${ticker}`,
      type: 'website',
    },
    twitter: { card: 'summary', title: `$${ticker} | תשואה` },
  };
}

export default function StockPage({ params }: StockPageProps) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase();
  return <StockPageClient ticker={ticker} />;
}

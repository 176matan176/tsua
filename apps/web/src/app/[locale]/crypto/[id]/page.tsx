import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCoin, CRYPTO_COINS } from '@/lib/crypto';
import { CryptoDetailClient } from './CryptoDetailClient';

export async function generateStaticParams() {
  return CRYPTO_COINS.map(c => ({ id: c.id }));
}

export function generateMetadata({ params }: { params: { id: string; locale: string } }) {
  const coin = getCoin(params.id);
  if (!coin) return { title: 'קריפטו | תשואה' };
  return {
    title: `${coin.nameHe} (${coin.symbol}) | תשואה`,
    description: coin.description,
  };
}

export default function CryptoDetailPage({ params }: { params: { id: string; locale: string } }) {
  const coin = getCoin(params.id);
  if (!coin) return notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <nav className="text-xs text-tsua-muted">
        <Link href={`/${params.locale}/crypto`} className="hover:text-tsua-accent transition-colors">
          ← חזרה לקריפטו
        </Link>
      </nav>

      <CryptoDetailClient coinId={coin.id} />
    </div>
  );
}

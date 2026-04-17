import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSector, SECTORS } from '@/lib/sectors';
import { SectorDetailClient } from './SectorDetailClient';

export async function generateStaticParams() {
  return SECTORS.map(s => ({ key: s.key }));
}

export function generateMetadata({ params }: { params: { key: string; locale: string } }) {
  const sector = getSector(params.key);
  if (!sector) return { title: 'מגזר | תשואה' };
  return {
    title: `${sector.nameHe} (${sector.etf}) | תשואה`,
    description: sector.description,
  };
}

export default function SectorDetailPage({ params }: { params: { key: string; locale: string } }) {
  const sector = getSector(params.key);
  if (!sector) return notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <nav className="text-xs text-tsua-muted">
        <Link href={`/${params.locale}/sectors`} className="hover:text-tsua-accent transition-colors">
          ← חזרה למגזרים
        </Link>
      </nav>

      <SectorDetailClient sector={sector} locale={params.locale} />
    </div>
  );
}

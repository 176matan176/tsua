import { SectorHeatmap } from '@/components/markets/SectorHeatmap';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY } from '@/lib/financialDictionary';

export const metadata = {
  title: 'מגזרים | תשואה',
  description: 'heatmap חי של 11 מגזרי GICS הראשיים בשוק האמריקאי',
};

export default function SectorsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-tsua-text mb-2">🗺️ מגזרים</h1>
            <p className="text-sm text-tsua-muted leading-relaxed max-w-2xl">
              ביצועי 11 מגזרי GICS הראשיים בשוק האמריקאי — נתונים חיים, מתעדכנים כל דקה.
              צבע ירוק = המגזר עולה היום, צבע אדום = יורד. הלחיצה על מגזר פותחת את רשימת המניות הבולטות בו.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e5b0' }} />
            <span className="text-xs font-bold" style={{ color: '#00e5b0' }}>LIVE</span>
          </div>
        </div>

        <div className="mt-4 flex items-center text-xs text-tsua-muted">
          מייצג את המגזר באמצעות
          <span className="mx-1 font-mono" dir="ltr">SPDR Sector ETFs</span>
          (XLK, XLV, וכו')
          <InfoTooltip term={DICTIONARY.sector} />
        </div>
      </header>

      <section>
        <SectorHeatmap variant="full" />
      </section>
    </div>
  );
}

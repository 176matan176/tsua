import { SectorHeatmap } from '@/components/markets/SectorHeatmap';
import { SectorTreemap } from '@/components/markets/SectorTreemap';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY } from '@/lib/financialDictionary';

export const metadata = {
  title: 'מגזרים | תשואה',
  description: 'מפת שוק חיה בסגנון Finviz — 11 מגזרי GICS עם מניות בגודל לפי שווי שוק וצבע לפי תנועה יומית',
};

export default function SectorsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <header className="rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-tsua-text mb-2">🗺️ מפת השוק</h1>
            <p className="text-sm text-tsua-muted leading-relaxed max-w-2xl">
              כל מניה כריבוע — גודל לפי שווי שוק, צבע לפי תנועה יומית. ירוק = עלייה, אדום = ירידה.
              לחיצה על ריבוע פותחת את דף המניה. הנתונים מתעדכנים כל דקה.
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
          11 מגזרי GICS, ~140 מניות גדולות מהשוק האמריקאי
          <InfoTooltip term={DICTIONARY.sector} />
        </div>
      </header>

      {/* Main Finviz-style treemap */}
      <section>
        <SectorTreemap />
      </section>

      {/* Sector-level heatmap (ETF performance per sector) — secondary view */}
      <section className="space-y-3">
        <h2 className="text-base font-black text-tsua-text">מבט-על מגזרי</h2>
        <p className="text-xs text-tsua-muted">
          ביצוע ה-ETF המייצג כל מגזר (XLK, XLV, וכו'). שימושי לקריאה מהירה של היום בשוק.
        </p>
        <SectorHeatmap variant="full" />
      </section>
    </div>
  );
}

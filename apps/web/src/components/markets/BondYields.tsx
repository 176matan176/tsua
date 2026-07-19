'use client';

import { BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { useLivePrice } from '@/contexts/PriceContext';

function Row({
  flag, label, yieldPct, changeBps, estimate, loading,
}: {
  flag: string; label: string; yieldPct: number | null; changeBps: number | null; estimate?: boolean; loading?: boolean;
}) {
  const isUp = (changeBps ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-base">{flag}</span>
        <span className="text-sm font-bold text-tsua-text">{label}</span>
        {estimate && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(200,216,240,0.12)', color: 'var(--text2)' }}
            title={'אין feed חינמי בזמן אמת לאג״ח ישראלי — מוצג ערך מקורב'}
          >
            מקורב
          </span>
        )}
      </div>
      <div className="text-end">
        {yieldPct === null && loading ? (
          <div className="w-14 h-4 rounded animate-pulse ms-auto" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
        ) : yieldPct === null ? (
          <span className="text-sm font-black font-mono text-tsua-muted" dir="ltr">—</span>
        ) : (
          <>
            <div className="text-sm font-black font-mono text-tsua-text" dir="ltr">{yieldPct.toFixed(2)}%</div>
            {changeBps != null && (
              <div className="text-[11px] font-semibold" style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
                {isUp ? '▲' : '▼'} {Math.abs(changeBps)} נ.ב.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// US 10Y is live via the shared PriceContext (Yahoo ^TNX, quoted directly in
// percent; the daily `change` is in percentage points → ×100 for basis points).
function Us10YRow() {
  const live = useLivePrice('^TNX');
  const yieldPct = live?.price ?? null;
  const changeBps = live?.change != null ? Math.round(live.change * 100) : null;
  return <Row flag="🇺🇸" label='ארה"ב 10 שנים' yieldPct={yieldPct} changeBps={changeBps} loading={live === null} />;
}

export function BondYields() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-semibold text-tsua-text tracking-tight flex items-center gap-2">
          <BuildingLibraryIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.75} aria-hidden="true" />
          תשואות אג"ח
        </h3>
        <span className="text-[10px] text-tsua-muted">ממשלתי 10Y</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgb(var(--rgb-border) / 0.35)' }}>
        <Us10YRow />
        {/* Israel 10Y has no free real-time symbol on Yahoo/Finnhub — shown as a
            clearly-labeled estimate, mirroring the P/E widget's "מקורב" pattern.
            TODO: wire to Bank of Israel / TASE government-bond data. */}
        <Row flag="🇮🇱" label='ישראל 10 שנים' yieldPct={4.52} changeBps={-2} estimate />
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          ארה"ב בזמן אמת (^TNX) · שינוי יומי בנקודות בסיס (נ.ב.)
        </p>
      </div>
    </div>
  );
}

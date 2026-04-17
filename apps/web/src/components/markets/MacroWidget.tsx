'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY, type DictEntry } from '@/lib/financialDictionary';

interface MacroIndicator {
  key: string;
  label: string;
  country: 'IL' | 'US';
  flag: string;
  value: number | null;
  unit: string;
  asOf: string | null;
  trend: number | null;
  description: string;
}

/** Map indicator key to the best-matching dictionary entry */
function getTerm(key: string): DictEntry | undefined {
  if (key.endsWith('-cpi')) return DICTIONARY.inflation;
  if (key.endsWith('-fed') || key === 'il-interest') return DICTIONARY.interestRate;
  if (key.endsWith('-unemp')) return DICTIONARY.unemployment;
  return undefined;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function IndicatorCard({ ind }: { ind: MacroIndicator }) {
  const term = getTerm(ind.key);

  // Color logic: for inflation/unemployment, higher is "worse" (red-ish);
  // for interest rate, we stay neutral — context matters.
  let valueColor = '#c8d8f0';
  if (ind.key.endsWith('-cpi')) {
    // Inflation above 3% is warning; above 5% is concern
    if (ind.value != null) {
      if (ind.value > 5) valueColor = '#ff4d6a';
      else if (ind.value > 3) valueColor = '#f58220';
      else if (ind.value >= 1) valueColor = '#00e5b0';
      else valueColor = '#f58220'; // deflation also concerning
    }
  } else if (ind.key.endsWith('-unemp')) {
    if (ind.value != null) {
      if (ind.value > 6) valueColor = '#ff4d6a';
      else if (ind.value > 4.5) valueColor = '#f58220';
      else valueColor = '#00e5b0';
    }
  }

  return (
    <div
      className="rounded-xl p-3 transition-all hover:scale-[1.02]"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{ind.flag}</span>
          <span className="text-[11px] font-bold text-tsua-text truncate">{ind.label}</span>
          {term && <InfoTooltip term={term} size={12} />}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5" dir="ltr">
        <span
          className="text-xl font-black font-mono tabular-nums"
          style={{ color: valueColor }}
        >
          {ind.value != null ? ind.value.toFixed(2) : '—'}
        </span>
        {ind.value != null && <span className="text-xs font-bold" style={{ color: valueColor }}>{ind.unit}</span>}
      </div>
      {ind.asOf && (
        <div className="text-[9px] text-tsua-muted mt-1 font-mono">
          עודכן: {formatDate(ind.asOf)}
        </div>
      )}
    </div>
  );
}

export function MacroWidget() {
  const [indicators, setIndicators] = useState<MacroIndicator[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/macro')
      .then(r => r.json())
      .then(d => {
        if (!cancelled && Array.isArray(d.indicators)) {
          setIndicators(d.indicators);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  if (loading && !indicators) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
          <h3 className="text-sm font-black text-tsua-text">🌍 נתוני מקרו</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(26,40,64,0.4)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!indicators || indicators.length === 0) {
    return null; // gracefully hide if fetching fails
  }

  // Group by country — Israel first (RTL-appropriate), US second
  const ilIndicators = indicators.filter(i => i.country === 'IL');
  const usIndicators = indicators.filter(i => i.country === 'US');

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border2)' }}
      >
        <h3 className="text-sm font-black text-tsua-text">🌍 נתוני מקרו</h3>
        <span className="text-[10px] text-tsua-muted font-mono">
          מעודכן חודשית · FRED + בנק ישראל
        </span>
      </div>

      {/* Israel */}
      {ilIndicators.length > 0 && (
        <div className="p-3">
          <div className="text-[10px] font-black text-tsua-muted uppercase tracking-widest mb-2 px-1">
            🇮🇱 ישראל
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ilIndicators.map(ind => <IndicatorCard key={ind.key} ind={ind} />)}
          </div>
        </div>
      )}

      {/* US */}
      {usIndicators.length > 0 && (
        <div className="p-3 pt-0">
          <div className="text-[10px] font-black text-tsua-muted uppercase tracking-widest mb-2 px-1">
            🇺🇸 ארה"ב
          </div>
          <div className="grid grid-cols-3 gap-2">
            {usIndicators.map(ind => <IndicatorCard key={ind.key} ind={ind} />)}
          </div>
        </div>
      )}
    </div>
  );
}

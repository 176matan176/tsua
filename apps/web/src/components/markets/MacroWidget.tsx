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
  let valueColor = 'var(--text2)';
  if (ind.key.endsWith('-cpi')) {
    // Inflation above 3% is warning; above 5% is concern
    if (ind.value != null) {
      if (ind.value > 5) valueColor = 'var(--red)';
      else if (ind.value > 3) valueColor = 'var(--hot)';
      else if (ind.value >= 1) valueColor = 'var(--accent)';
      else valueColor = 'var(--hot)'; // deflation also concerning
    }
  } else if (ind.key.endsWith('-unemp')) {
    if (ind.value != null) {
      if (ind.value > 6) valueColor = 'var(--red)';
      else if (ind.value > 4.5) valueColor = 'var(--hot)';
      else valueColor = 'var(--accent)';
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

// Macro indicators are monthly. Polling every 30 min is overkill for the
// underlying cadence but keeps a long-lived tab honest, and the visibility
// listener catches the "user came back tomorrow" case immediately.
const REFRESH_MS = 30 * 60 * 1000;

export function MacroWidget() {
  const [indicators, setIndicators] = useState<MacroIndicator[] | null>(null);
  const [loading, setLoading] = useState(true);
  // Track failure independently so we can show an error card instead of
  // silently disappearing — `return null` on the empty path made it impossible
  // for users to tell whether "no macro data" meant "broken" or "by design".
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let inFlight: AbortController | null = null;

    async function load() {
      inFlight?.abort();
      const ctrl = new AbortController();
      inFlight = ctrl;
      try {
        const r = await fetch('/api/macro', { signal: ctrl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const d = await r.json();
        if (ctrl.signal.aborted) return;
        if (Array.isArray(d.indicators) && d.indicators.length > 0) {
          setIndicators(d.indicators);
          setErrored(false);
        } else {
          setErrored(true);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // Keep prior indicators on screen during a transient blip.
        setErrored((prev) => indicators ? prev : true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      inFlight?.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.4)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Show an honest error card instead of vanishing — preserves the section's
  // place in the layout and gives the user a hint that something's wrong.
  if ((!indicators || indicators.length === 0) && errored) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
          <h3 className="text-sm font-black text-tsua-text">🌍 נתוני מקרו</h3>
        </div>
        <div className="p-6 text-center">
          <div className="text-2xl mb-1">📡</div>
          <div className="text-xs text-tsua-muted">לא ניתן לטעון נתוני מקרו כעת</div>
          <div className="text-[10px] text-tsua-muted mt-0.5">נסה לרענן בעוד מספר דקות</div>
        </div>
      </div>
    );
  }

  if (!indicators || indicators.length === 0) {
    return null; // shouldn't happen, but stay defensive
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

'use client';

import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY, type DictEntry } from '@/lib/financialDictionary';

interface KeyStatsProps {
  ticker: string;
  currency: string;
  prevClose: number | null;
  volume: number | null;
  high: number | null;
  low: number | null;
  week52High: number | null;
  week52Low: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  pbRatio: number | null;
  roeTTM: number | null;
  revenueGrowthTTM: number | null;
  marketCap: number | null;
}

function StatRow({ label, value, highlight, color, term }: {
  label: string; value: string | null; highlight?: boolean; color?: string; term?: DictEntry;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-white/2"
      style={{ borderBottom: '1px solid var(--border2)' }}
    >
      <span className="text-xs text-tsua-muted flex items-center">
        {label}
        {term && <InfoTooltip term={term} />}
      </span>
      <span className="text-xs font-bold font-mono" style={{ color: color ?? (highlight ? '#00e5b0' : '#c8d8f0') }} dir="ltr">
        {value ?? '—'}
      </span>
    </div>
  );
}

function fmt(n: number | null, d = 2, pre = ''): string | null {
  if (n == null) return null;
  return `${pre}${n.toFixed(d)}`;
}
function fmtLarge(n: number | null, pre = '$'): string | null {
  if (n == null) return null;
  if (n >= 1e12) return `${pre}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${pre}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${pre}${(n / 1e6).toFixed(2)}M`;
  return `${pre}${n.toLocaleString()}`;
}
function fmtVol(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function KeyStats({
  ticker, currency, prevClose, volume, high, low,
  week52High, week52Low, peRatio, forwardPE, eps, beta,
  dividendYield, pbRatio, roeTTM, revenueGrowthTTM, marketCap,
}: KeyStatsProps) {
  const sym = currency === 'ILS' ? '₪' : '$';

  const sections = [
    {
      title: 'מחיר',
      rows: [
        { label: 'סגירה קודמת',   value: fmt(prevClose, 2, sym), term: DICTIONARY.prevClose },
        { label: 'שיא יומי',      value: fmt(high, 2, sym),      term: DICTIONARY.high },
        { label: 'שפל יומי',      value: fmt(low, 2, sym),       term: DICTIONARY.low },
        { label: 'שיא 52 שבועות', value: fmt(week52High, 2, sym), highlight: true, term: DICTIONARY.week52 },
        { label: 'שפל 52 שבועות', value: fmt(week52Low, 2, sym),  term: DICTIONARY.week52 },
        { label: 'נפח מסחר',      value: fmtVol(volume),          term: DICTIONARY.volume },
      ],
    },
    {
      title: 'שווי',
      rows: [
        { label: 'שווי שוק',          value: fmtLarge(marketCap, sym), highlight: true, term: DICTIONARY.marketcap },
        { label: 'מכפיל רווח (P/E)',   value: fmt(peRatio, 2),  term: DICTIONARY.pe },
        { label: 'מכפיל רווח עתידי',   value: fmt(forwardPE, 2), term: DICTIONARY.forwardPe },
        { label: 'מכפיל הון (P/B)',    value: fmt(pbRatio, 2),  term: DICTIONARY.pb },
        { label: 'רווח למניה (EPS)',   value: fmt(eps, 2, sym), term: DICTIONARY.eps },
        { label: 'תשואת דיבידנד',     value: dividendYield != null ? `${dividendYield.toFixed(2)}%` : null, term: DICTIONARY.dividend },
        { label: 'בטא',               value: fmt(beta, 2), term: DICTIONARY.beta,
          color: beta != null ? (beta > 1.5 ? '#ff4d6a' : beta < 0.8 ? '#00e5b0' : '#c8d8f0') : undefined },
      ],
    },
    {
      title: 'ביצועים',
      rows: [
        { label: 'תשואה על ההון (ROE)', value: roeTTM != null ? `${roeTTM.toFixed(1)}%` : null,
          highlight: roeTTM != null && roeTTM > 15, term: DICTIONARY.roe },
        { label: 'צמיחת הכנסות',        value: revenueGrowthTTM != null ? `${revenueGrowthTTM.toFixed(1)}%` : null,
          term: DICTIONARY.revenue,
          color: revenueGrowthTTM != null ? (revenueGrowthTTM >= 0 ? '#00e5b0' : '#ff4d6a') : undefined },
      ].filter(r => r.value),
    },
  ];

  return (
    <div className="rounded-2xl overflow-visible" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
        <h3 className="text-sm font-bold text-tsua-text">📋 נתונים מרכזיים</h3>
      </div>
      <div className="px-3 pb-3">
        {sections.map((section, si) => (
          section.rows.some(r => r.value) && (
            <div key={section.title} className={si > 0 ? 'mt-3 pt-3' : 'mt-2'}
              style={si > 0 ? { borderTop: '1px solid var(--border2)' } : {}}>
              <div className="text-[10px] font-bold text-tsua-muted uppercase tracking-widest mb-1.5 px-1">
                {section.title}
              </div>
              {section.rows.filter(r => r.value).map(row => (
                <StatRow key={row.label} label={row.label} value={row.value}
                  highlight={(row as any).highlight} color={(row as any).color} term={(row as any).term} />
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

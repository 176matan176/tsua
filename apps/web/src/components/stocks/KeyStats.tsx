'use client';

import { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

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
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  pbRatio: number | null;
  roeTTM: number | null;
  revenueGrowthTTM: number | null;
  marketCap: number | null;
}

const TOOLTIPS: Record<string, string> = {
  pe:       'מכפיל הרווח מראה כמה משקיעים משלמים על כל ₪/$ של רווח שנתי. מכפיל 20 = משלמים 20₪ על כל ₪ רווח. גבוה = ציפייה לצמיחה.',
  pb:       'מחיר המנייה חלקי שווי הנכסים נטו למנייה. מתחת ל-1 = החברה נסחרת מתחת לשווי הנכסים שלה — עשוי להיות הזדמנות.',
  eps:      'הרווח הנקי של החברה חלקי מספר המניות. TTM = 12 החודשים האחרונים. EPS גבוה = החברה מרוויחה יותר למנייה.',
  beta:     'מדד תנודתיות. בטא 1 = זז כמו השוק. מעל 1 = תנודתי יותר. מתחת ל-1 = יציב יותר. שלילי = זז הפוך לשוק.',
  dividend: 'אחוז הדיבידנד השנתי ממחיר המנייה. תשואה 3% על מנייה ב-100$ = 3$ דיבידנד בשנה.',
  roe:      'כמה רווח מייצרת החברה מכל ₪/$ הון עצמי. ROE מעל 15% נחשב טוב. בנקים בדרך כלל 10-15%.',
  revenue:  'שינוי אחוזי בהכנסות לעומת אשתקד. חיובי = החברה גדלה. חשוב מאוד לחברות צמיחה.',
  marketcap:'מחיר המנייה × מספר המניות = שווי שוק כולל. Large Cap: מעל $10B, Mid Cap: $2-10B, Small Cap: מתחת ל-$2B.',
  week52:   'הטווח שבו נסחרה המנייה בשנה האחרונה. מחיר קרוב לשיא = מומנטום חיובי. קרוב לשפל = חולשה או הזדמנות.',
  volume:   'מספר המניות שנסחרו היום. נפח גבוה מעיד על עניין ומאשר מגמת מחיר. נפח נמוך = מגמה פחות אמינה.',
};

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex items-center ms-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={e => { e.stopPropagation(); setShow(v => !v); }}
        className="leading-none"
        aria-label="הסבר"
      >
        <InformationCircleIcon className="w-3.5 h-3.5 transition-colors"
          style={{ color: show ? '#00e5b0' : 'rgba(90,112,144,0.7)' }} />
      </button>
      {show && (
        <span
          className="absolute bottom-6 start-0 z-50 w-60 rounded-xl text-xs leading-relaxed p-3"
          style={{
            background: 'rgba(10,16,30,0.98)',
            border: '1px solid rgba(0,229,176,0.25)',
            color: '#c8d8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
          dir="rtl"
        >
          {text}
        </span>
      )}
    </span>
  );
}

function StatRow({ label, value, highlight, color, tooltip }: {
  label: string; value: string | null; highlight?: boolean; color?: string; tooltip?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-white/2"
      style={{ borderBottom: '1px solid rgba(26,40,64,0.35)' }}
    >
      <span className="text-xs text-tsua-muted flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
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
  week52High, week52Low, peRatio, eps, beta,
  dividendYield, pbRatio, roeTTM, revenueGrowthTTM, marketCap,
}: KeyStatsProps) {
  const sym = currency === 'ILS' ? '₪' : '$';

  const sections = [
    {
      title: 'מחיר',
      rows: [
        { label: 'סגירה קודמת',   value: fmt(prevClose, 2, sym) },
        { label: 'שיא יומי',      value: fmt(high, 2, sym) },
        { label: 'שפל יומי',      value: fmt(low, 2, sym) },
        { label: 'שיא 52 שבועות', value: fmt(week52High, 2, sym), highlight: true, tooltip: TOOLTIPS.week52 },
        { label: 'שפל 52 שבועות', value: fmt(week52Low, 2, sym),  tooltip: TOOLTIPS.week52 },
        { label: 'נפח מסחר',      value: fmtVol(volume), tooltip: TOOLTIPS.volume },
      ],
    },
    {
      title: 'שווי',
      rows: [
        { label: 'שווי שוק',          value: fmtLarge(marketCap, sym), highlight: true, tooltip: TOOLTIPS.marketcap },
        { label: 'מכפיל רווח (P/E)',   value: fmt(peRatio, 2),  tooltip: TOOLTIPS.pe },
        { label: 'מכפיל הון (P/B)',    value: fmt(pbRatio, 2),  tooltip: TOOLTIPS.pb },
        { label: 'רווח למניה (EPS)',   value: fmt(eps, 2, sym), tooltip: TOOLTIPS.eps },
        { label: 'תשואת דיבידנד',     value: dividendYield != null ? `${dividendYield.toFixed(2)}%` : null, tooltip: TOOLTIPS.dividend },
        { label: 'בטא',               value: fmt(beta, 2), tooltip: TOOLTIPS.beta,
          color: beta != null ? (beta > 1.5 ? '#ff4d6a' : beta < 0.8 ? '#00e5b0' : '#c8d8f0') : undefined },
      ],
    },
    {
      title: 'ביצועים',
      rows: [
        { label: 'תשואה על ההון (ROE)', value: roeTTM != null ? `${roeTTM.toFixed(1)}%` : null,
          highlight: roeTTM != null && roeTTM > 15, tooltip: TOOLTIPS.roe },
        { label: 'צמיחת הכנסות',        value: revenueGrowthTTM != null ? `${revenueGrowthTTM.toFixed(1)}%` : null,
          tooltip: TOOLTIPS.revenue,
          color: revenueGrowthTTM != null ? (revenueGrowthTTM >= 0 ? '#00e5b0' : '#ff4d6a') : undefined },
      ].filter(r => r.value),
    },
  ];

  return (
    <div className="rounded-2xl overflow-visible" style={{ background: 'rgba(15,25,41,0.7)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">📋 נתונים מרכזיים</h3>
      </div>
      <div className="px-3 pb-3">
        {sections.map((section, si) => (
          section.rows.some(r => r.value) && (
            <div key={section.title} className={si > 0 ? 'mt-3 pt-3' : 'mt-2'}
              style={si > 0 ? { borderTop: '1px solid rgba(26,40,64,0.5)' } : {}}>
              <div className="text-[10px] font-bold text-tsua-muted uppercase tracking-widest mb-1.5 px-1">
                {section.title}
              </div>
              {section.rows.filter(r => r.value).map(row => (
                <StatRow key={row.label} label={row.label} value={row.value}
                  highlight={(row as any).highlight} color={(row as any).color} tooltip={(row as any).tooltip} />
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

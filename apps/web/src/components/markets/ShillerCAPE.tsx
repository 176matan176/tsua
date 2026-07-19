'use client';

import { useState } from 'react';
import { ScaleIcon } from '@heroicons/react/24/outline';

type Metric = 'cape' | 'trailing';

interface Valuation {
  key: Metric;
  tabHe: string;
  descHe: string;
  value: number;      // current multiple
  mean: number;       // long-run historical mean
  min: number;        // gauge lower bound
  max: number;        // gauge upper bound
}

// Seeded long-run valuation metrics for the S&P 500.
// TODO: wire CAPE to a source like multpl.com / Shiller's dataset and the
// trailing multiple to /api/pe — keep the mean + range for the gauge context.
const VALUATIONS: Record<Metric, Valuation> = {
  cape: {
    key: 'cape',
    tabHe: 'Shiller CAPE',
    descHe: 'מכפיל רב-שנתי מתואם אינפלציה (10 שנים)',
    value: 34.8,
    mean: 17.1,
    min: 5,
    max: 45,
  },
  trailing: {
    key: 'trailing',
    tabHe: 'מכפיל שוטף',
    descHe: 'מכפיל רווח נוכחי (12 חודשים אחרונים)',
    value: 27.5,
    mean: 16.0,
    min: 8,
    max: 35,
  },
};

function verdict(ratio: number): { labelHe: string; color: string } {
  if (ratio >= 1.5) return { labelHe: 'יקר משמעותית', color: 'var(--red)' };
  if (ratio >= 1.2) return { labelHe: 'יקר', color: 'var(--gold)' };
  if (ratio >= 0.8) return { labelHe: 'תמחור הוגן', color: 'var(--accent)' };
  return { labelHe: 'זול', color: 'var(--accent)' };
}

export function ShillerCAPE() {
  const [metric, setMetric] = useState<Metric>('cape');
  const v = VALUATIONS[metric];
  const ratio = v.value / v.mean;
  const { labelHe, color } = verdict(ratio);

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const pos = clamp(((v.value - v.min) / (v.max - v.min)) * 100);
  const meanPos = clamp(((v.mean - v.min) / (v.max - v.min)) * 100);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-semibold text-tsua-text tracking-tight flex items-center gap-2">
          <ScaleIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.75} aria-hidden="true" />
          עומק תמחור — S&P 500
        </h3>
        {/* Toggle: CAPE ↔ trailing P/E */}
        <div className="flex gap-1">
          {(['cape', 'trailing'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all"
              style={metric === m
                ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.25)' }
                : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {VALUATIONS[m].tabHe}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4" dir="rtl">
        <div className="flex items-end justify-between mb-1">
          <div className="flex items-baseline gap-1.5" dir="ltr">
            <span className="text-4xl font-black font-mono" style={{ color }}>{v.value.toFixed(1)}</span>
            <span className="text-lg font-black" style={{ color }}>×</span>
          </div>
          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
            {labelHe}
          </span>
        </div>
        <div className="text-[11px] text-tsua-muted mb-3">{v.descHe}</div>

        {/* Range gauge: current marker + historical-mean marker */}
        <div className="relative w-full h-2.5 rounded-full mt-2" style={{ background: 'linear-gradient(to left, var(--accent), var(--gold), var(--red))' }}>
          {/* historical mean tick */}
          <div
            className="absolute -top-1 w-0.5"
            style={{ right: `${meanPos}%`, height: '18px', background: 'var(--text)', opacity: 0.55, transform: 'translateX(50%)' }}
            title="ממוצע היסטורי"
          />
          {/* current value marker */}
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white"
            style={{ right: `${pos}%`, background: color, boxShadow: `0 0 6px ${color}`, transform: 'translate(50%, -50%)' }}
          />
        </div>

        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
          <div className="text-center flex-1">
            <div className="text-[9px] text-tsua-muted mb-0.5">נוכחי</div>
            <div className="text-sm font-black font-mono" style={{ color }}>{v.value.toFixed(1)}×</div>
          </div>
          <div className="w-px h-8" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
          <div className="text-center flex-1">
            <div className="text-[9px] text-tsua-muted mb-0.5">ממוצע היסטורי</div>
            <div className="text-sm font-black font-mono text-tsua-muted">{v.mean.toFixed(1)}×</div>
          </div>
          <div className="w-px h-8" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
          <div className="text-center flex-1">
            <div className="text-[9px] text-tsua-muted mb-0.5">מול הממוצע</div>
            <div className="text-sm font-black font-mono" style={{ color }}>{ratio.toFixed(2)}×</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          מדד תמחור ארוך-טווח · מתעדכן חודשית (לא בזמן אמת מטבעו)
        </p>
      </div>
    </div>
  );
}

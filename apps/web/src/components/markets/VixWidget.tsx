'use client';

import { useLivePrice } from '@/contexts/PriceContext';

const VIX_SCALE_MAX = 50; // gauge upper bound

function classify(v: number): { labelHe: string; color: string; emoji: string } {
  if (v < 20) return { labelHe: 'תנודתיות נמוכה', color: 'var(--accent)', emoji: '😌' };
  if (v < 30) return { labelHe: 'תנודתיות מוגברת', color: 'var(--gold)', emoji: '😐' };
  return { labelHe: 'תנודתיות גבוהה', color: 'var(--red)', emoji: '😰' };
}

export function VixWidget() {
  // Live CBOE VIX via the shared PriceContext (Yahoo ^VIX).
  const live = useLivePrice('^VIX');
  const v = live?.price ?? null;
  const changePercent = live?.changePercent ?? null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-bold text-tsua-text">📉 מדד התנודתיות VIX</h3>
        <span className="text-[10px] text-tsua-muted font-mono" dir="ltr">CBOE</span>
      </div>

      <div className="px-4 py-4" dir="rtl">
        {v === null ? (
          <div className="space-y-3 animate-pulse py-2">
            <div className="h-9 w-24 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
            <div className="h-2.5 rounded-full" style={{ background: 'rgb(var(--rgb-border) / 0.4)' }} />
          </div>
        ) : (() => {
          const { labelHe, color, emoji } = classify(v);
          const pos = Math.max(0, Math.min(100, (v / VIX_SCALE_MAX) * 100));
          const isUp = (changePercent ?? 0) >= 0;
          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-4xl font-black font-mono" style={{ color }} dir="ltr">{v.toFixed(2)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold" style={{ color }}>{labelHe}</span>
                    {changePercent != null && (
                      <span className="text-[11px] font-semibold" style={{ color: isUp ? 'var(--red)' : 'var(--accent)' }} dir="ltr">
                        {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-5xl">{emoji}</div>
              </div>

              {/* Gauge — RIGHT = calm (low), LEFT = extreme (high), RTL-native */}
              <div
                className="relative w-full h-2.5 rounded-full overflow-hidden mt-2"
                style={{ background: 'linear-gradient(to left, var(--accent), var(--gold), var(--red))' }}
              >
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white"
                  style={{ right: `${pos}%`, background: color, boxShadow: `0 0 6px ${color}`, transform: 'translate(50%, -50%)' }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[9px] text-tsua-muted">רגוע</span>
                <span className="text-[9px] text-tsua-muted">פאניקה</span>
              </div>
            </>
          );
        })()}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          מדד הפחד של וול סטריט · מתחת ל-20 = רגיעה · עלייה = יותר פחד
        </p>
      </div>
    </div>
  );
}

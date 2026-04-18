'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface EarningEntry {
  date: string;
  symbol: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  hour: 'bmo' | 'amc' | 'dmh' | '';
  quarter: number;
  year: number;
  nameHe: string;
  nameEn: string;
  exchange: string;
  isIsraeli: boolean;
}

interface EarningsResponse {
  from: string;
  to: string;
  count: number;
  entries: EarningEntry[];
}

type Range = 'week' | 'month';
type Filter = 'all' | 'il' | 'us';

function formatRevenue(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function hourLabel(h: EarningEntry['hour']): { text: string; icon: string; color: string } {
  switch (h) {
    case 'bmo': return { text: 'לפני פתיחה', icon: '🌅', color: '#ffa94d' };
    case 'amc': return { text: 'אחרי סגירה', icon: '🌙', color: '#8b8cf7' };
    case 'dmh': return { text: 'במהלך מסחר', icon: '☀️', color: '#00e5b0' };
    default:    return { text: 'שעה לא ידועה', icon: '⏱', color: '#5a7090' };
  }
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';
  if (diff > 0 && diff <= 7) {
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    return `יום ${days[date.getDay()]}`;
  }
  return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
}

function beatBadge(actual: number | null, estimate: number | null): { label: string; color: string } | null {
  if (actual == null || estimate == null || estimate === 0) return null;
  const diffPct = ((actual - estimate) / Math.abs(estimate)) * 100;
  if (diffPct > 2)  return { label: `✓ ${diffPct.toFixed(1)}%`, color: '#00e5b0' };
  if (diffPct < -2) return { label: `✗ ${diffPct.toFixed(1)}%`, color: '#ff4d6a' };
  return { label: `= ${diffPct.toFixed(1)}%`, color: '#ffa94d' };
}

function groupByDate(entries: EarningEntry[]): Record<string, EarningEntry[]> {
  const out: Record<string, EarningEntry[]> = {};
  for (const e of entries) {
    if (!out[e.date]) out[e.date] = [];
    out[e.date].push(e);
  }
  return out;
}

export function EarningsCalendar() {
  const locale = useLocale();
  const [range, setRange] = useState<Range>('week');
  const [filter, setFilter] = useState<Filter>('all');
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/earnings?range=${range}&filter=${filter}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled && !d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, filter]);

  const grouped = data ? groupByDate(data.entries) : {};
  const dates = Object.keys(grouped).sort();

  return (
    <>
      {/* Toolbar */}
      <div className="rounded-2xl p-3 flex flex-wrap gap-3 items-center justify-between"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex gap-1.5">
          {(['week', 'month'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={range === r ? {
                background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
                color: '#060b16',
              } : {
                background: 'var(--surface2)',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {r === 'week' ? 'השבוע' : 'החודש'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'il', 'us'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === f ? {
                background: 'rgba(0,229,176,0.12)',
                color: '#00e5b0',
                border: '1px solid rgba(0,229,176,0.3)',
              } : {
                background: 'var(--surface2)',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {f === 'all' ? 'הכל' : f === 'il' ? '🇮🇱 ישראליות' : '🇺🇸 אמריקאיות'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar */}
      {loading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(26,40,64,0.4)' }} />
          ))}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-3">📭</div>
          <div className="text-sm text-tsua-muted">אין דוחות צפויים בתקופה הזו</div>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const entries = grouped[date];
            const rel = relativeDate(date);
            const isToday = rel === 'היום';
            return (
              <section
                key={date}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--card)',
                  border: isToday ? '1px solid rgba(0,229,176,0.3)' : '1px solid var(--border)',
                  boxShadow: isToday ? '0 0 30px rgba(0,229,176,0.1)' : undefined,
                }}
              >
                <header
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: isToday
                      ? 'linear-gradient(135deg, rgba(0,229,176,0.12), rgba(0,229,176,0.04))'
                      : 'rgba(26,40,64,0.4)',
                    borderBottom: '1px solid var(--border2)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-black text-tsua-text">{rel}</h3>
                    <span className="text-[10px] font-mono text-tsua-muted">
                      {new Date(date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }}
                  >
                    {entries.length} דוחות
                  </span>
                </header>

                <div className="divide-y" style={{ borderColor: 'var(--border2)' }}>
                  {entries.map((e, i) => {
                    const hour = hourLabel(e.hour);
                    const epsBeat = beatBadge(e.epsActual, e.epsEstimate);
                    const revBeat = beatBadge(e.revenueActual, e.revenueEstimate);
                    return (
                      <div key={`${e.symbol}-${i}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                        style={{ borderTop: i > 0 ? '1px solid rgba(26,40,64,0.3)' : undefined }}
                      >
                        {/* Ticker + name */}
                        <Link href={`/${locale}/stocks/${e.symbol}`} className="min-w-0 flex-1 group">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span dir="ltr" className="text-sm font-black font-mono text-tsua-text group-hover:text-tsua-accent transition-colors">
                              ${e.symbol}
                            </span>
                            {e.isIsraeli && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }}
                              >
                                🇮🇱
                              </span>
                            )}
                            <span className="text-[11px] text-tsua-muted truncate">{e.nameHe}</span>
                          </div>
                          <div className="text-[10px] font-mono text-tsua-muted mt-0.5">
                            Q{e.quarter} {e.year}
                          </div>
                        </Link>

                        {/* Hour */}
                        <div className="hidden sm:flex flex-col items-center shrink-0 min-w-[80px]"
                          style={{ color: hour.color }}
                        >
                          <span className="text-lg">{hour.icon}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider">{hour.text}</span>
                        </div>

                        {/* EPS estimate/actual */}
                        <div className="text-end shrink-0 min-w-[80px]">
                          <div className="text-[9px] font-bold text-tsua-muted uppercase tracking-widest">EPS</div>
                          {e.epsActual != null ? (
                            <>
                              <div dir="ltr" className="text-xs font-mono font-bold text-tsua-text">${e.epsActual.toFixed(2)}</div>
                              {epsBeat && (
                                <div dir="ltr" className="text-[9px] font-mono font-bold" style={{ color: epsBeat.color }}>{epsBeat.label}</div>
                              )}
                            </>
                          ) : e.epsEstimate != null ? (
                            <>
                              <div dir="ltr" className="text-xs font-mono text-tsua-muted">צפוי</div>
                              <div dir="ltr" className="text-xs font-mono font-bold text-tsua-text">${e.epsEstimate.toFixed(2)}</div>
                            </>
                          ) : (
                            <div className="text-xs text-tsua-muted">—</div>
                          )}
                        </div>

                        {/* Revenue estimate/actual */}
                        <div className="text-end shrink-0 min-w-[90px]">
                          <div className="text-[9px] font-bold text-tsua-muted uppercase tracking-widest">הכנסות</div>
                          {e.revenueActual != null ? (
                            <>
                              <div dir="ltr" className="text-xs font-mono font-bold text-tsua-text">{formatRevenue(e.revenueActual)}</div>
                              {revBeat && (
                                <div dir="ltr" className="text-[9px] font-mono font-bold" style={{ color: revBeat.color }}>{revBeat.label}</div>
                              )}
                            </>
                          ) : e.revenueEstimate != null ? (
                            <>
                              <div dir="ltr" className="text-xs font-mono text-tsua-muted">צפוי</div>
                              <div dir="ltr" className="text-xs font-mono font-bold text-tsua-text">{formatRevenue(e.revenueEstimate)}</div>
                            </>
                          ) : (
                            <div className="text-xs text-tsua-muted">—</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

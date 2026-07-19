'use client';

import { CalendarDaysIcon } from '@heroicons/react/24/outline';

interface MacroEvent {
  id: string;
  titleHe: string;
  flag: string;
  date: Date;
  impact: 'high' | 'medium';
}

// Published 2026 schedule for the irregular, announced-in-advance events
// (Fed FOMC decisions, US BLS CPI releases, Bank of Israel rate decisions).
// The widget filters to whatever is still upcoming, so past rows drop off on
// their own — no stale dates. NFP is added programmatically below.
const SCHEDULE: { id: string; titleHe: string; flag: string; iso: string; impact: 'high' | 'medium' }[] = [
  { id: 'boi-2026-07', titleHe: 'החלטת ריבית — בנק ישראל', flag: '🇮🇱', iso: '2026-07-20T16:00:00+03:00', impact: 'high' },
  { id: 'fomc-2026-07', titleHe: 'הודעת ריבית — פד (FOMC)', flag: '🇺🇸', iso: '2026-07-29T21:00:00+03:00', impact: 'high' },
  { id: 'cpi-2026-08', titleHe: 'מדד המחירים לצרכן — ארה"ב', flag: '🇺🇸', iso: '2026-08-12T15:30:00+03:00', impact: 'high' },
  { id: 'boi-2026-08', titleHe: 'החלטת ריבית — בנק ישראל', flag: '🇮🇱', iso: '2026-08-24T16:00:00+03:00', impact: 'high' },
  { id: 'cpi-2026-09', titleHe: 'מדד המחירים לצרכן — ארה"ב', flag: '🇺🇸', iso: '2026-09-10T15:30:00+03:00', impact: 'high' },
  { id: 'fomc-2026-09', titleHe: 'הודעת ריבית — פד (FOMC)', flag: '🇺🇸', iso: '2026-09-16T21:00:00+03:00', impact: 'high' },
  { id: 'cpi-2026-10', titleHe: 'מדד המחירים לצרכן — ארה"ב', flag: '🇺🇸', iso: '2026-10-13T15:30:00+03:00', impact: 'high' },
  { id: 'fomc-2026-10', titleHe: 'הודעת ריבית — פד (FOMC)', flag: '🇺🇸', iso: '2026-10-28T21:00:00+03:00', impact: 'high' },
  { id: 'fomc-2026-12', titleHe: 'הודעת ריבית — פד (FOMC)', flag: '🇺🇸', iso: '2026-12-09T21:00:00+03:00', impact: 'high' },
];

// US Non-Farm Payrolls: released the FIRST FRIDAY of each month, 08:30 ET
// (15:30 Israel). Fully deterministic, so we generate it going forward and the
// calendar never runs dry.
function firstFriday(year: number, month0: number): Date {
  // 08:30 America/New_York ≈ 15:30 Israel; store as +03:00 to match the rest.
  const first = new Date(Date.UTC(year, month0, 1, 12, 30, 0)); // 15:30 +03:00
  const dow = first.getUTCDay();               // 0=Sun … 5=Fri
  const offset = (5 - dow + 7) % 7;            // days until first Friday
  return new Date(Date.UTC(year, month0, 1 + offset, 12, 30, 0));
}
function upcomingNFP(fromYear: number, fromMonth0: number, count: number): MacroEvent[] {
  const out: MacroEvent[] = [];
  for (let i = 0; i < count; i++) {
    const y = fromYear + Math.floor((fromMonth0 + i) / 12);
    const m = (fromMonth0 + i) % 12;
    const d = firstFriday(y, m);
    out.push({ id: `nfp-${y}-${m}`, titleHe: 'דוח תעסוקה (NFP) — ארה"ב', flag: '🇺🇸', date: d, impact: 'medium' });
  }
  return out;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' });
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function countdownHe(d: Date, now: number): string {
  const days = Math.ceil((d.getTime() - now) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'היום';
  if (days === 1) return 'מחר';
  return `בעוד ${days} ימים`;
}

function buildUpcoming(now: number): MacroEvent[] {
  const nowDate = new Date(now);
  const scheduled: MacroEvent[] = SCHEDULE.map((e) => ({
    id: e.id, titleHe: e.titleHe, flag: e.flag, date: new Date(e.iso), impact: e.impact,
  }));
  const nfp = upcomingNFP(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 6);
  // Keep events from ~today onward (12h grace so "today" stays visible), soonest first.
  const cutoff = now - 12 * 60 * 60 * 1000;
  return [...scheduled, ...nfp]
    .filter((e) => e.date.getTime() >= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);
}

export function MacroEventsCalendar() {
  // Computed at render from the current date → always shows the next events,
  // never stale past dates. Countdown text varies by the second, so the badge
  // carries suppressHydrationWarning (SSR/client tick differ).
  const now = Date.now();
  const events = buildUpcoming(now);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-semibold text-tsua-text tracking-tight flex items-center gap-2">
          <CalendarDaysIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.75} aria-hidden="true" />
          אירועים קרובים
        </h3>
        <span className="text-[10px] text-tsua-muted">מאקרו</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgb(var(--rgb-border) / 0.35)' }}>
        {events.map((ev) => {
          const isHigh = ev.impact === 'high';
          return (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="w-1.5 h-9 rounded-full shrink-0"
                style={{ background: isHigh ? 'var(--red)' : 'var(--gold)' }}
                title={isHigh ? 'השפעה גבוהה' : 'השפעה בינונית'}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm shrink-0">{ev.flag}</span>
                  <span className="text-sm font-bold text-tsua-text truncate">{ev.titleHe}</span>
                </div>
                <div className="text-[10px] text-tsua-muted font-mono mt-0.5" dir="ltr" suppressHydrationWarning>
                  {fmtDate(ev.date)} · {fmtTime(ev.date)}
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 tabular-nums"
                style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)' }}
                suppressHydrationWarning
              >
                {countdownHe(ev.date, now)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">מתעדכן אוטומטית · שעון ישראל</p>
      </div>
    </div>
  );
}

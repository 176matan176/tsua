'use client';

interface MacroEvent {
  id: string;
  titleHe: string;
  flag: string;
  /** ISO string with timezone */
  date: string;
  impact: 'high' | 'medium';
}

// Seeded upcoming events — this is scheduled/editorial data with known dates.
// TODO: wire to an economic-calendar feed (e.g. Finnhub /calendar/economic or
// Trading Economics) and sort by nearest upcoming.
const EVENTS: MacroEvent[] = [
  { id: 'boi-rate', titleHe: 'החלטת ריבית — בנק ישראל', flag: '🇮🇱', date: '2026-07-20T16:00:00+03:00', impact: 'high' },
  { id: 'us-fomc',  titleHe: 'הודעת ריבית — פד (FOMC)',  flag: '🇺🇸', date: '2026-07-29T21:00:00+03:00', impact: 'high' },
  { id: 'us-cpi',   titleHe: 'מדד המחירים לצרכן — ארה"ב', flag: '🇺🇸', date: '2026-08-12T15:30:00+03:00', impact: 'medium' },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: 'short' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
/** Whole days from now until the event (>=0). Computed at render → SSR/client
 *  can differ by a tick, so the element carries suppressHydrationWarning. */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
function countdownHe(days: number): string {
  if (days <= 0) return 'היום';
  if (days === 1) return 'מחר';
  return `בעוד ${days} ימים`;
}

export function MacroEventsCalendar() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-card) / 0.7)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-black text-tsua-text">🗓️ אירועים קרובים</h3>
        <span className="text-[10px] text-tsua-muted">מאקרו</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgb(var(--rgb-border) / 0.35)' }}>
        {EVENTS.map((ev) => {
          const days = daysUntil(ev.date);
          const isHigh = ev.impact === 'high';
          return (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
              {/* Impact rail */}
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
                <div className="text-[10px] text-tsua-muted font-mono mt-0.5" dir="ltr">
                  {fmtDate(ev.date)} · {fmtTime(ev.date)}
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 tabular-nums"
                style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)' }}
                suppressHydrationWarning
              >
                {countdownHe(days)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">אירועים מתוזמנים · שעון ישראל</p>
      </div>
    </div>
  );
}

/**
 * Exchange open/closed logic for the market-status dots.
 *
 * Session windows verified empirically against Yahoo's currentTradingPeriod
 * (probed 2026-07-17):
 *   - TASE (TLV): Mon–Fri 09:50–17:30 Asia/Jerusalem. The 2026 reform moved
 *     the trading week to Mon–Fri — Friday is a FULL session (verified: real
 *     trades printed on Friday 2026-07-17). Sunday is closed.
 *   - US (NYSE/NASDAQ): Mon–Fri 09:30–16:00 America/New_York.
 *
 * Times are computed in each exchange's own IANA timezone via Intl, so DST is
 * handled correctly year-round. (A fixed UTC window drifts an hour by season —
 * Yahoo shows the US session at 13:30–20:00 UTC in summer, not the 14:30–21:00
 * the polling-cadence code assumes.)
 *
 * Limitation: exchange holidays are not modeled (no free feed) — on a holiday
 * the dot shows "open" during regular hours. Acceptable for a visual hint.
 */
export type Market = 'US' | 'TASE';

/** Which exchange a symbol actually trades on (where its price moves).
 *  Note: US-listed Israeli names (TEVA, NICE, EIS…) are 'US' by design —
 *  their quotes tick on New York hours even though the UI shows a 🇮🇱 flag. */
export function marketForSymbol(symbol: string): Market {
  return symbol.toUpperCase().endsWith('.TA') ? 'TASE' : 'US';
}

const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function zoned(timeZone: string, date: Date): { dow: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    dow: DOW[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const SESSIONS: Record<Market, { tz: string; openMin: number; closeMin: number }> = {
  US:   { tz: 'America/New_York', openMin: 9 * 60 + 30, closeMin: 16 * 60 },
  TASE: { tz: 'Asia/Jerusalem',   openMin: 9 * 60 + 50, closeMin: 17 * 60 + 30 },
};

export function isMarketOpen(market: Market, date: Date = new Date()): boolean {
  const s = SESSIONS[market];
  const { dow, minutes } = zoned(s.tz, date);
  if (dow === 0 || dow === 6) return false; // Sat + Sun — both exchanges closed
  return minutes >= s.openMin && minutes < s.closeMin;
}

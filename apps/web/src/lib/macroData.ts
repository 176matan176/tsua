/**
 * Macro-economic data fetching — Israeli and US indicators.
 *
 * Sources (all FREE, no API key required):
 *   - Bank of Israel PublicApi (JSON):           boi.org.il/PublicApi/GetInterest
 *   - CBS Israel index API (JSON):               api.cbs.gov.il/index/data/price?id=120010
 *   - FRED graph CSV endpoint (no auth needed):  fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES>
 *
 * NOTE on Israeli CPI: we previously used FRED's ISRCPIALLMINMEI series, but
 * that's sourced from OECD which publishes Israel data with a 12-15 month lag
 * — the widget was showing inflation as of March 2025 in mid-2026. CBS itself
 * publishes the monthly CPI around the 15th of the following month (same
 * cadence as US BLS) and exposes it via a public JSON API with no auth.
 *
 * These are monthly-updated indicators, so server-side cache of 1 hour is plenty.
 */

export interface MacroIndicator {
  key: string;
  label: string;         // Hebrew label
  country: 'IL' | 'US';
  flag: string;
  value: number | null;  // the current value as a percent (e.g. 3.1 for 3.1%)
  unit: string;          // e.g. '%'
  asOf: string | null;   // ISO date of the data point (YYYY-MM-DD)
  trend: number | null;  // change vs previous period (for context)
  description: string;
}

/** Parse a simple FRED CSV ("DATE,VALUE\n2024-01-01,123.4\n...") and return rows */
function parseFredCsv(csv: string): Array<{ date: string; value: number }> {
  const lines = csv.trim().split('\n');
  const rows: Array<{ date: string; value: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, valStr] = lines[i].split(',');
    const value = Number(valStr);
    if (date && Number.isFinite(value)) rows.push({ date, value });
  }
  return rows;
}

async function fetchFredSeries(seriesId: string): Promise<Array<{ date: string; value: number }>> {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  const r = await fetch(url, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`FRED ${seriesId} returned ${r.status}`);
  const csv = await r.text();
  return parseFredCsv(csv);
}

/** Latest value from a series */
function latest(rows: Array<{ date: string; value: number }>): { date: string; value: number } | null {
  if (!rows.length) return null;
  return rows[rows.length - 1];
}

/** Compute year-over-year % change from a monthly CPI-style series */
function yoy(rows: Array<{ date: string; value: number }>): { date: string; value: number } | null {
  if (rows.length < 13) return null;
  const last = rows[rows.length - 1];
  const prior = rows[rows.length - 13];
  if (!last || !prior || prior.value === 0) return null;
  return { date: last.date, value: ((last.value / prior.value) - 1) * 100 };
}

/** Change vs previous period */
function delta(rows: Array<{ date: string; value: number }>): number | null {
  if (rows.length < 2) return null;
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  return last.value - prev.value;
}

/**
 * CBS Israel CPI — series 120010 ("מדד המחירים לצרכן - כללי").
 * Response shape (truncated):
 *   { month: [{ code, name, date: [{ year, month, percentYear, ... }, ...] }] }
 * `date` is ordered newest-first. `percentYear` is the year-over-year %
 * change already computed by CBS — same metric FRED gives us for US via
 * `yoy(CPIAUCSL)`. We just need to format the asOf date.
 */
async function fetchCbsIlCpi(): Promise<{ value: number | null; asOf: string | null }> {
  try {
    const r = await fetch(
      'https://api.cbs.gov.il/index/data/price?id=120010&format=json',
      { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } },
    );
    if (!r.ok) return { value: null, asOf: null };
    const j = await r.json();
    const newest = j?.month?.[0]?.date?.[0];
    if (!newest || typeof newest.percentYear !== 'number') {
      return { value: null, asOf: null };
    }
    // Build YYYY-MM-DD from numeric year+month so it matches the FRED format
    // used elsewhere in this module (the widget's `formatDate` parses ISO).
    const mm = String(newest.month).padStart(2, '0');
    return { value: newest.percentYear, asOf: `${newest.year}-${mm}-01` };
  } catch {
    return { value: null, asOf: null };
  }
}

async function fetchBoiInterest(): Promise<{ value: number | null; asOf: string | null }> {
  try {
    const r = await fetch('https://www.boi.org.il/PublicApi/GetInterest?lang=EN', {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return { value: null, asOf: null };
    const j = await r.json();
    return {
      value: typeof j?.currentInterest === 'number' ? j.currentInterest : null,
      asOf: typeof j?.lastPublishedDate === 'string'
        ? j.lastPublishedDate.slice(0, 10)
        : null,
    };
  } catch {
    return { value: null, asOf: null };
  }
}

export async function fetchAllMacro(): Promise<MacroIndicator[]> {
  const [
    boiInterest,
    ilCpi,
    ilUnemp,
    usFed,
    usCpi,
    usUnemp,
  ] = await Promise.allSettled([
    fetchBoiInterest(),
    fetchCbsIlCpi(),                       // CBS Israel — fresh monthly
    fetchFredSeries('LRHUTTTTILM156S'),    // OECD IL unemployment (acceptable lag)
    fetchFredSeries('FEDFUNDS'),
    fetchFredSeries('CPIAUCSL'),
    fetchFredSeries('UNRATE'),
  ]);

  const indicators: MacroIndicator[] = [];

  // ── Israel ──
  if (boiInterest.status === 'fulfilled') {
    indicators.push({
      key: 'il-interest',
      label: 'ריבית בנק ישראל',
      country: 'IL',
      flag: '🇮🇱',
      value: boiInterest.value.value,
      unit: '%',
      asOf: boiInterest.value.asOf,
      trend: null,
      description: 'ריבית בנק ישראל על אגרות חוב',
    });
  }

  if (ilCpi.status === 'fulfilled') {
    // CBS hands us the YoY % directly via `percentYear`, no need for the
    // 13-month rolling diff we use for FRED-sourced series.
    indicators.push({
      key: 'il-cpi',
      label: 'אינפלציה ישראל',
      country: 'IL',
      flag: '🇮🇱',
      value: ilCpi.value.value,
      unit: '%',
      asOf: ilCpi.value.asOf,
      trend: null,
      description: 'שינוי שנתי במדד המחירים לצרכן (יעד: 1-3%)',
    });
  }

  if (ilUnemp.status === 'fulfilled') {
    const l = latest(ilUnemp.value);
    indicators.push({
      key: 'il-unemp',
      label: 'אבטלה ישראל',
      country: 'IL',
      flag: '🇮🇱',
      value: l?.value ?? null,
      unit: '%',
      asOf: l?.date ?? null,
      trend: delta(ilUnemp.value),
      description: 'שיעור מובטלים מסך כוח העבודה',
    });
  }

  // ── US ──
  if (usFed.status === 'fulfilled') {
    const l = latest(usFed.value);
    indicators.push({
      key: 'us-fed',
      label: 'Fed Funds Rate',
      country: 'US',
      flag: '🇺🇸',
      value: l?.value ?? null,
      unit: '%',
      asOf: l?.date ?? null,
      trend: delta(usFed.value),
      description: 'ריבית הפד האמריקאי',
    });
  }

  if (usCpi.status === 'fulfilled') {
    const y = yoy(usCpi.value);
    indicators.push({
      key: 'us-cpi',
      label: 'אינפלציה ארה"ב',
      country: 'US',
      flag: '🇺🇸',
      value: y?.value ?? null,
      unit: '%',
      asOf: y?.date ?? null,
      trend: null,
      description: 'שינוי שנתי במדד המחירים לצרכן (יעד הפד: 2%)',
    });
  }

  if (usUnemp.status === 'fulfilled') {
    const l = latest(usUnemp.value);
    indicators.push({
      key: 'us-unemp',
      label: 'אבטלה ארה"ב',
      country: 'US',
      flag: '🇺🇸',
      value: l?.value ?? null,
      unit: '%',
      asOf: l?.date ?? null,
      trend: delta(usUnemp.value),
      description: 'שיעור מובטלים מסך כוח העבודה (Non-farm)',
    });
  }

  return indicators;
}

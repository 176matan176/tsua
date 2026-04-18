'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DICTIONARY, type DictEntry } from '@/lib/financialDictionary';

interface StockPayload {
  ticker: string;
  name: string;
  currency: string;
  logo: string | null;
  exchange: string;
  open: number;
  high: number;
  low: number;
  prevClose: number | null;
  volume: number | null;
  marketCap: number | null;
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
  sector: string | null;
  industry: string | null;
}

/** Table row definition */
interface RowDef {
  label: string;
  /** How to extract the value from the stock */
  get: (s: StockPayload) => string | null;
  /** Higher is usually better (for highlighting) — set null for neutral */
  higherBetter: boolean | null;
  /** Raw numeric access for ranking */
  num?: (s: StockPayload) => number | null;
  term?: DictEntry;
}

const sym = (s: StockPayload) => s.currency === 'ILS' ? '₪' : '$';
const fmt = (n: number | null, d = 2, pre = '') => n == null ? null : `${pre}${n.toFixed(d)}`;
const fmtLarge = (n: number | null, pre = '$') => {
  if (n == null) return null;
  if (n >= 1e12) return `${pre}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${pre}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${pre}${(n / 1e6).toFixed(2)}M`;
  return `${pre}${n.toLocaleString()}`;
};

const SECTIONS: Array<{ title: string; rows: RowDef[] }> = [
  {
    title: 'שווי',
    rows: [
      { label: 'שווי שוק', get: s => fmtLarge(s.marketCap, sym(s)), num: s => s.marketCap, higherBetter: true, term: DICTIONARY.marketcap },
      { label: 'מכפיל רווח (P/E)', get: s => fmt(s.peRatio), num: s => s.peRatio, higherBetter: false, term: DICTIONARY.pe },
      { label: 'מכפיל רווח עתידי', get: s => fmt(s.forwardPE), num: s => s.forwardPE, higherBetter: false, term: DICTIONARY.forwardPe },
      { label: 'מכפיל הון (P/B)', get: s => fmt(s.pbRatio), num: s => s.pbRatio, higherBetter: false, term: DICTIONARY.pb },
      { label: 'רווח למנייה (EPS)', get: s => fmt(s.eps, 2, sym(s)), num: s => s.eps, higherBetter: true, term: DICTIONARY.eps },
    ],
  },
  {
    title: 'ביצועים',
    rows: [
      { label: 'תשואה על ההון (ROE)', get: s => s.roeTTM != null ? `${s.roeTTM.toFixed(1)}%` : null, num: s => s.roeTTM, higherBetter: true, term: DICTIONARY.roe },
      { label: 'צמיחת הכנסות', get: s => s.revenueGrowthTTM != null ? `${s.revenueGrowthTTM.toFixed(1)}%` : null, num: s => s.revenueGrowthTTM, higherBetter: true, term: DICTIONARY.revenue },
      { label: 'תשואת דיבידנד', get: s => s.dividendYield != null ? `${s.dividendYield.toFixed(2)}%` : null, num: s => s.dividendYield, higherBetter: true, term: DICTIONARY.dividend },
      { label: 'בטא', get: s => fmt(s.beta), num: s => s.beta == null ? null : Math.abs(s.beta - 1), higherBetter: false, term: DICTIONARY.beta },
    ],
  },
  {
    title: 'מחיר',
    rows: [
      { label: 'שיא 52 שבועות', get: s => fmt(s.week52High, 2, sym(s)), num: s => s.week52High, higherBetter: null, term: DICTIONARY.week52 },
      { label: 'שפל 52 שבועות', get: s => fmt(s.week52Low, 2, sym(s)), num: s => s.week52Low, higherBetter: null, term: DICTIONARY.week52 },
      { label: 'נפח מסחר', get: s => s.volume != null ? s.volume.toLocaleString() : null, num: s => s.volume, higherBetter: null, term: DICTIONARY.volume },
    ],
  },
  {
    title: 'חברה',
    rows: [
      { label: 'ענף', get: s => s.sector, higherBetter: null, term: DICTIONARY.sector },
      { label: 'תעשייה', get: s => s.industry, higherBetter: null, term: DICTIONARY.industry },
      { label: 'בורסה', get: s => s.exchange || (s.currency === 'ILS' ? 'TASE' : null), higherBetter: null },
    ],
  },
];

const POPULAR = [
  { ticker: 'AAPL',  name: 'Apple' },
  { ticker: 'NVDA',  name: 'NVIDIA' },
  { ticker: 'MSFT',  name: 'Microsoft' },
  { ticker: 'GOOGL', name: 'Google' },
  { ticker: 'AMZN',  name: 'Amazon' },
  { ticker: 'META',  name: 'Meta' },
  { ticker: 'TSLA',  name: 'Tesla' },
  { ticker: 'TEVA',  name: 'Teva' },
  { ticker: 'NICE',  name: 'NICE' },
  { ticker: 'CHKP',  name: 'Check Point' },
];

export function CompareClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();

  // Read tickers from URL
  const urlTickers = (searchParams.get('t') ?? '')
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 4);

  const [tickers, setTickers] = useState<string[]>(urlTickers.length ? urlTickers : []);
  const [stocks, setStocks] = useState<Record<string, StockPayload>>({});
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (tickers.length) params.set('t', tickers.join(','));
    else params.delete('t');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(',')]);

  // Fetch missing tickers
  useEffect(() => {
    const missing = tickers.filter(t => !stocks[t]);
    if (!missing.length) return;
    let cancelled = false;
    setLoading(true);

    Promise.all(missing.map(async t => {
      try {
        const r = await fetch(`/api/stocks/${t}`);
        if (!r.ok) return null;
        const d = await r.json();
        return { ticker: t, data: d as StockPayload };
      } catch {
        return null;
      }
    })).then(results => {
      if (cancelled) return;
      setStocks(prev => {
        const next = { ...prev };
        for (const r of results) {
          if (r?.data) next[r.ticker] = r.data;
        }
        return next;
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickers.join(',')]);

  function addTicker(t: string) {
    const upper = t.trim().toUpperCase();
    if (!upper) return;
    if (tickers.includes(upper)) return;
    if (tickers.length >= 4) return;
    setTickers([...tickers, upper]);
  }

  function removeTicker(t: string) {
    setTickers(tickers.filter(x => x !== t));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    addTicker(input);
    setInput('');
  }

  const stockList = tickers.map(t => stocks[t]).filter(Boolean);

  /** For a numeric row, find the index of the "best" stock */
  function bestIndex(row: RowDef): number | null {
    if (row.higherBetter == null || !row.num) return null;
    const values = stockList.map(s => row.num!(s));
    const nonNull = values.map((v, i) => ({ v, i })).filter(x => x.v != null) as { v: number; i: number }[];
    if (nonNull.length < 2) return null;
    nonNull.sort((a, b) => row.higherBetter ? b.v - a.v : a.v - b.v);
    return nonNull[0].i;
  }

  return (
    <>
      {/* Add tickers section */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="הוסף סימול (למשל AAPL)"
            dir="ltr"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-tsua-text outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
            }}
            disabled={tickers.length >= 4}
          />
          <button
            type="submit"
            disabled={tickers.length >= 4 || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
              color: '#060b16',
            }}
          >
            הוסף
          </button>
        </form>

        {/* Popular picks */}
        {tickers.length < 4 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-tsua-muted font-bold self-center me-1">פופולריות:</span>
            {POPULAR.filter(p => !tickers.includes(p.ticker)).slice(0, 10).map(p => (
              <button
                key={p.ticker}
                onClick={() => addTicker(p.ticker)}
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md transition-colors hover:opacity-80"
                style={{
                  background: 'rgba(0,229,176,0.08)',
                  color: '#00e5b0',
                  border: '1px solid rgba(0,229,176,0.2)',
                }}
              >
                {p.ticker}
              </button>
            ))}
          </div>
        )}

        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tickers.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: '#00e5b0' }}
                dir="ltr"
              >
                {t}
                <button onClick={() => removeTicker(t)} aria-label={`הסר ${t}`}>
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comparison table */}
      {tickers.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="text-4xl mb-3">⚖️</div>
          <div className="text-sm text-tsua-muted">הוסף לפחות 2 מניות כדי להתחיל להשוות</div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {/* Header row with logos + names */}
          <div
            className="grid gap-3 px-4 py-4"
            style={{
              gridTemplateColumns: `180px repeat(${stockList.length}, 1fr)`,
              borderBottom: '1px solid var(--border2)',
            }}
          >
            <div className="text-xs font-bold text-tsua-muted self-end">מדד</div>
            {stockList.map(s => (
              <Link
                key={s.ticker}
                href={`/${locale}/stocks/${s.ticker}`}
                className="flex items-center gap-2 group"
              >
                {s.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo} alt={s.name} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div dir="ltr" className="text-sm font-black font-mono text-tsua-text group-hover:text-tsua-accent transition-colors">
                    ${s.ticker}
                  </div>
                  <div className="text-[10px] text-tsua-muted truncate">{s.name}</div>
                </div>
              </Link>
            ))}
            {/* Fill empty columns if fewer than 4 */}
            {Array.from({ length: Math.max(0, Math.min(4, tickers.length) - stockList.length) }).map((_, i) => (
              <div key={`skeleton-${i}`} className="h-8 rounded animate-pulse" style={{ background: 'rgba(26,40,64,0.4)' }} />
            ))}
          </div>

          {loading && stockList.length === 0 ? (
            <div className="p-6 text-center text-sm text-tsua-muted">טוען נתונים…</div>
          ) : (
            SECTIONS.map((section, si) => (
              <div key={section.title} className={si > 0 ? 'pt-3' : ''} style={si > 0 ? { borderTop: '1px solid var(--border2)' } : {}}>
                <div className="text-[10px] font-black text-tsua-muted uppercase tracking-widest px-4 py-2">
                  {section.title}
                </div>
                {section.rows.map(row => {
                  const best = bestIndex(row);
                  return (
                    <div
                      key={row.label}
                      className="grid gap-3 px-4 py-2 hover:bg-white/3 transition-colors"
                      style={{
                        gridTemplateColumns: `180px repeat(${stockList.length}, 1fr)`,
                        borderBottom: '1px solid rgba(26,40,64,0.3)',
                      }}
                    >
                      <div className="text-xs text-tsua-muted flex items-center font-semibold">
                        {row.label}
                        {row.term && <InfoTooltip term={row.term} size={12} />}
                      </div>
                      {stockList.map((s, i) => {
                        const v = row.get(s);
                        const isBest = best === i;
                        return (
                          <div
                            key={s.ticker}
                            className="text-xs font-mono font-bold flex items-center"
                            style={{ color: isBest ? '#00e5b0' : (v ? '#c8d8f0' : '#5a7090') }}
                            dir="ltr"
                          >
                            {isBest && <span className="me-1">🏆</span>}
                            {v ?? '—'}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}

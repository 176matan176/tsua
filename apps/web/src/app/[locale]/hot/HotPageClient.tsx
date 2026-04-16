'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { buildSparklinePoints, type StockScore } from '@/lib/hotStocks';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface HotResponse {
  market: string;
  updatedAt: string;
  stocks: StockScore[];
}

type SortKey = 'rank' | 'price' | 'changePercent' | 'hotScore' | 'mentions24h';

function Sparkline({ stock }: { stock: StockScore }) {
  const pts = buildSparklinePoints(stock.prevClose, stock.open, stock.low, stock.high, stock.price);
  if (pts.length < 2) return <div className="w-14 h-6 hidden md:block" />;
  const W = 56, H = 24;
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 0.01;
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
  const ys = pts.map(p => H - ((p - min) / range) * (H - 4) - 2);
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0 hidden md:block">
      <path d={d} fill="none" stroke={isUp ? '#00e5b0' : '#ff4d6a'} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function SentimentBar({ s }: { s: StockScore['sentiment'] }) {
  if (s.total === 0) return <span className="text-[10px]" style={{ color: 'var(--muted)' }}>—</span>;
  return (
    <div className="flex flex-col gap-0.5 items-center">
      <div className="flex h-1.5 rounded-full overflow-hidden w-16" style={{ background: 'var(--border)' }}>
        <div style={{ width: `${s.bullish}%`, background: '#00e5b0' }} />
        <div style={{ width: `${s.bearish}%`, background: '#ff4d6a' }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>{s.bullish}% שורי</span>
    </div>
  );
}

function SortHeader({ label, sortKey, current, dir, onClick }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color: active ? 'var(--accent)' : 'var(--muted)' }}
    >
      {label}
      {active
        ? dir === 'desc' ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronUpIcon className="w-3 h-3" />
        : <ChevronDownIcon className="w-3 h-3 opacity-30" />
      }
    </button>
  );
}

function MobileCard({ stock, locale }: { stock: StockScore; locale: string }) {
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98]"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'var(--card)', color: 'var(--muted)' }}>
        {stock.rank}
      </span>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</span>
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0"
            style={{ background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--card)', color: stock.hotScore >= 60 ? '#f58220' : 'var(--muted)' }}
          >
            🔥 {stock.hotScore}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--muted)' }} dir="ltr">{stock.ticker}</span>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{stock.reason}</span>
        </div>
      </div>
      <div className="text-end shrink-0">
        <div className="text-sm font-black font-mono tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
        <div className="text-[11px] font-bold tabular-nums" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
          {stock.changePercent != null ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '—'}
        </div>
      </div>
    </Link>
  );
}

function TableRow({ stock, locale }: { stock: StockScore; locale: string }) {
  const isUp = (stock.changePercent ?? 0) >= 0;
  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150"
      style={{ background: 'transparent' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <span className="w-6 text-xs font-black text-center shrink-0" style={{ color: 'var(--muted)' }}>{stock.rank}</span>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: isUp ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
          border: `1px solid ${isUp ? 'rgba(0,229,176,0.2)' : 'rgba(255,77,106,0.2)'}`,
          color: isUp ? '#00e5b0' : '#ff4d6a',
        }}
      >
        {stock.ticker.slice(0, 2)}
      </div>
      <div className="w-32 shrink-0">
        <div className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{stock.nameHe}</div>
        <div className="text-[10px] font-mono" style={{ color: 'var(--muted)' }} dir="ltr">{stock.ticker}</div>
      </div>
      <div className="w-20 text-end shrink-0">
        <div className="text-sm font-black font-mono tabular-nums" style={{ color: 'var(--text)' }} dir="ltr">
          {stock.price != null ? stock.price.toFixed(2) : '—'}
        </div>
      </div>
      <div className="w-16 text-end shrink-0">
        <span className="text-xs font-bold tabular-nums" style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }} dir="ltr">
          {stock.changePercent != null ? `${isUp ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '—'}
        </span>
      </div>
      <div className="w-16 flex items-center justify-end shrink-0">
        <span
          className="text-xs font-black px-2 py-0.5 rounded-lg"
          style={{
            background: stock.hotScore >= 60 ? 'rgba(245,130,32,0.15)' : 'var(--surface2)',
            color: stock.hotScore >= 60 ? '#f58220' : 'var(--muted)',
            border: `1px solid ${stock.hotScore >= 60 ? 'rgba(245,130,32,0.3)' : 'var(--border)'}`,
          }}
        >
          🔥 {stock.hotScore}
        </span>
      </div>
      <div className="w-24 shrink-0">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{stock.reason}</span>
      </div>
      <div className="w-16 text-center shrink-0">
        <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
          {stock.mentions24h > 0 ? `${stock.mentions24h} 💬` : '—'}
        </span>
      </div>
      <div className="w-20 flex justify-center shrink-0">
        <SentimentBar s={stock.sentiment} />
      </div>
      <div className="w-14 shrink-0">
        <Sparkline stock={stock} />
      </div>
    </Link>
  );
}

export function HotPageClient() {
  const locale = useLocale();
  const [market,  setMarket]  = useState<'il' | 'us'>('il');
  const [dataIL,  setDataIL]  = useState<StockScore[] | null>(null);
  const [dataUS,  setDataUS]  = useState<StockScore[] | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [resIL, resUS] = await Promise.all([
          fetch('/api/stocks/hot?market=il'),
          fetch('/api/stocks/hot?market=us'),
        ]);
        const [jIL, jUS]: [HotResponse, HotResponse] = await Promise.all([resIL.json(), resUS.json()]);
        if (!cancelled) {
          setDataIL(jIL.stocks);
          setDataUS(jUS.stocks);
          setUpdated(jIL.updatedAt);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'rank' ? 'asc' : 'desc'); }
  }

  const rawStocks = market === 'il' ? dataIL : dataUS;

  const stocks = useMemo(() => {
    if (!rawStocks) return [];
    let s = rawStocks.filter(st =>
      !search ||
      st.ticker.includes(search.toUpperCase()) ||
      st.nameHe.includes(search) ||
      st.nameEn.toLowerCase().includes(search.toLowerCase())
    );
    s = [...s].sort((a, b) => {
      const av = (a[sortKey] ?? 0) as number;
      const bv = (b[sortKey] ?? 0) as number;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return s;
  }, [rawStocks, search, sortKey, sortDir]);

  const updatedStr = updated
    ? new Date(updated).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>🔥 מניות חמות היום</h1>
        {updatedStr && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>עודכן לאחרונה: {updatedStr}</p>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(['il', 'us'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMarket(m)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
              style={market === m
                ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }
                : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
              }
            >
              {m === 'il' ? '🇮🇱 ת"א' : '🇺🇸 ארה"ב'}
            </button>
          ))}
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 max-w-xs"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <MagnifyingGlassIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="חיפוש מניה..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border2)' }}>
          <div className="w-6 shrink-0" />
          <div className="w-8 shrink-0" />
          <div className="w-32 shrink-0">
            <SortHeader label="מניה" sortKey="rank" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-20 text-end shrink-0">
            <SortHeader label="מחיר" sortKey="price" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-16 text-end shrink-0">
            <SortHeader label="שינוי%" sortKey="changePercent" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-16 text-end shrink-0">
            <SortHeader label="חום" sortKey="hotScore" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-24 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>סיבה</span>
          </div>
          <div className="w-16 text-center shrink-0">
            <SortHeader label="💬" sortKey="mentions24h" current={sortKey} dir={sortDir} onClick={handleSort} />
          </div>
          <div className="w-20 text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>סנטימנט</span>
          </div>
          <div className="w-14 shrink-0" />
        </div>
        <div className="p-2 space-y-0.5">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
              ))
            : stocks.length === 0
              ? <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>אין מספיק נתונים להיום עדיין 🕐</p>
              : stocks.map(s => <TableRow key={s.ticker} stock={s} locale={locale} />)
          }
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--surface2)' }} />
            ))
          : stocks.length === 0
            ? <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>אין מספיק נתונים להיום עדיין 🕐</p>
            : stocks.map(s => <MobileCard key={s.ticker} stock={s} locale={locale} />)
        }
      </div>
    </div>
  );
}

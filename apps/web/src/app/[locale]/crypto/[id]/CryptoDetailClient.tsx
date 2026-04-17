'use client';

import { useEffect, useState } from 'react';
import { Sparkline } from '@/components/crypto/Sparkline';

interface CryptoDetail {
  id: string;
  symbol: string;
  nameHe: string;
  nameEn: string;
  description: string;
  image: string | null;
  price: number | null;
  changePercent24h: number | null;
  changePercent7d: number | null;
  changePercent30d: number | null;
  marketCap: number | null;
  marketCapRank: number | null;
  volume24h: number | null;
  high24h: number | null;
  low24h: number | null;
  ath: number | null;
  athChangePercent: number | null;
  athDate: string | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  sparkline: Array<[number, number]>;
}

function formatLarge(n: number | null, prefix = '$'): string {
  if (n == null) return '—';
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
  return `${prefix}${n.toLocaleString()}`;
}

function formatPrice(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(8)}`;
}

function formatSupply(n: number | null, symbol: string): string {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B ${symbol}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M ${symbol}`;
  return `${n.toLocaleString()} ${symbol}`;
}

function ChangeCell({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-tsua-muted">—</span>;
  const isUp = pct >= 0;
  const color = isUp ? '#00e5b0' : '#ff4d6a';
  return (
    <span style={{ color }} className="font-bold font-mono" dir="ltr">
      {isUp ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

export function CryptoDetailClient({ coinId }: { coinId: string }) {
  const [data, setData] = useState<CryptoDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch(`/api/crypto/${coinId}`);
        const d = await r.json();
        if (!cancelled && d && !d.error) setData(d);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [coinId]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(26,40,64,0.4)' }} />
        <div className="h-48 rounded-2xl animate-pulse" style={{ background: 'rgba(26,40,64,0.4)' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm text-tsua-muted"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        לא ניתן לטעון נתונים. נסה שוב מאוחר יותר.
      </div>
    );
  }

  const isUp24h = (data.changePercent24h ?? 0) >= 0;

  return (
    <>
      {/* Hero */}
      <header
        className="rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${isUp24h ? 'rgba(0,229,176,0.08)' : 'rgba(255,77,106,0.08)'} 0%, var(--card) 60%)`,
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {data.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.image} alt={data.nameEn} className="w-14 h-14 rounded-full" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-tsua-text">{data.nameHe}</h1>
                <span dir="ltr" className="text-sm font-mono font-bold text-tsua-muted px-2 py-0.5 rounded-lg"
                  style={{ background: 'rgba(26,40,64,0.5)' }}
                >
                  {data.symbol}
                </span>
                {data.marketCapRank && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(247,147,26,0.1)', color: '#f7931a', border: '1px solid rgba(247,147,26,0.25)' }}
                  >
                    #{data.marketCapRank}
                  </span>
                )}
              </div>
              <div className="text-xs text-tsua-muted mt-1">{data.description}</div>
            </div>
          </div>

          {/* Live price */}
          <div className="text-end">
            <div dir="ltr" className="text-3xl font-black font-mono text-tsua-text">
              {formatPrice(data.price)}
            </div>
            <div dir="ltr" className="mt-1">
              <ChangeCell pct={data.changePercent24h} /> <span className="text-xs text-tsua-muted">24ש</span>
            </div>
          </div>
        </div>

        {/* 24h range */}
        {data.low24h != null && data.high24h != null && data.price != null && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-mono text-tsua-muted mb-1">
              <span dir="ltr">{formatPrice(data.low24h)} <span className="text-tsua-muted">שפל</span></span>
              <span className="font-bold">טווח 24 שעות</span>
              <span dir="ltr"><span className="text-tsua-muted">שיא</span> {formatPrice(data.high24h)}</span>
            </div>
            <div className="h-1.5 rounded-full relative" style={{ background: 'rgba(26,40,64,0.6)' }}>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                style={{
                  left: `${((data.price - data.low24h) / (data.high24h - data.low24h)) * 100}%`,
                  transform: `translate(-50%, -50%)`,
                  background: '#00e5b0',
                  boxShadow: '0 0 8px rgba(0,229,176,0.6)',
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* 7-day chart */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-tsua-text">📈 מחיר 7 ימים אחרונים</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-tsua-muted">7ימ</span>
            <ChangeCell pct={data.changePercent7d} />
          </div>
        </div>
        <Sparkline points={data.sparkline} height={200} />
      </section>

      {/* Performance grid */}
      <section className="grid grid-cols-3 gap-3">
        {[
          { label: '24 שעות', pct: data.changePercent24h },
          { label: '7 ימים', pct: data.changePercent7d },
          { label: '30 ימים', pct: data.changePercent30d },
        ].map(({ label, pct }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="text-[10px] font-black text-tsua-muted uppercase tracking-widest mb-1">{label}</div>
            <div className="text-base">
              <ChangeCell pct={pct} />
            </div>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-bold text-tsua-text mb-3">📊 נתונים מרכזיים</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="שווי שוק" value={formatLarge(data.marketCap)} highlight />
          <Stat label="נפח 24 שעות" value={formatLarge(data.volume24h)} />
          <Stat label="דירוג" value={data.marketCapRank ? `#${data.marketCapRank}` : '—'} />
          <Stat label="שיא כל הזמנים" value={formatPrice(data.ath)} />
          <Stat
            label="מרחק משיא"
            value={data.athChangePercent != null ? `${data.athChangePercent.toFixed(1)}%` : '—'}
            color={data.athChangePercent != null ? (data.athChangePercent >= 0 ? '#00e5b0' : '#ff4d6a') : undefined}
          />
          <Stat label="תאריך שיא" value={data.athDate ? new Date(data.athDate).toLocaleDateString('he-IL') : '—'} />
          <Stat label="היצע במחזור" value={formatSupply(data.circulatingSupply, data.symbol)} />
          <Stat label="היצע כולל" value={formatSupply(data.totalSupply, data.symbol)} />
          <Stat label="היצע מקסימלי" value={formatSupply(data.maxSupply, data.symbol)} />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
    >
      <div className="text-[10px] text-tsua-muted mb-1 uppercase tracking-wider font-bold">{label}</div>
      <div
        className="text-sm font-semibold text-tsua-text truncate font-mono"
        dir="ltr"
        style={{ color: color ?? (highlight ? '#00e5b0' : '#c8d8f0') }}
      >
        {value}
      </div>
    </div>
  );
}

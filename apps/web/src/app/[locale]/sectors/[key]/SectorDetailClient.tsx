'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Sector } from '@/lib/sectors';

interface Quote {
  price: number;
  change: number;
  changePercent: number;
}

interface SectorDetailClientProps {
  sector: Sector;
  locale: string;
}

export function SectorDetailClient({ sector, locale }: SectorDetailClientProps) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [etfQuote, setEtfQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch ETF + all top constituents in one batch call
        const symbols = [sector.etf, ...sector.top].join(',');
        const r = await fetch(`/api/stocks/batch?symbols=${symbols}`);
        const data: Record<string, Quote> = await r.json();

        if (cancelled) return;
        setEtfQuote(data[sector.etf] ?? null);
        const constituents = { ...data };
        delete constituents[sector.etf];
        setQuotes(constituents);
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
  }, [sector.etf, sector.top]);

  const isEtfUp = (etfQuote?.changePercent ?? 0) >= 0;

  // Sort constituents by performance
  const sortedTop = [...sector.top].sort((a, b) => {
    const ac = quotes[a]?.changePercent ?? -Infinity;
    const bc = quotes[b]?.changePercent ?? -Infinity;
    return bc - ac;
  });

  return (
    <>
      {/* Sector Hero */}
      <header
        className="rounded-2xl p-6"
        style={{
          background: `linear-gradient(135deg, ${sector.color}22 0%, var(--card) 60%)`,
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-3xl">{sector.emoji}</span>
              <h1 className="text-2xl font-black text-tsua-text">{sector.nameHe}</h1>
              <span
                dir="ltr"
                className="text-xs font-mono px-2 py-0.5 rounded-lg"
                style={{ background: 'rgba(26,40,64,0.5)', color: '#c8d8f0' }}
              >
                {sector.nameEn}
              </span>
            </div>
            <p className="text-sm text-tsua-muted leading-relaxed max-w-xl">
              {sector.description}
            </p>
          </div>

          {/* ETF Live Quote */}
          <Link
            href={`/${locale}/stocks/${sector.etf}`}
            className="rounded-xl px-4 py-3 transition-all hover:scale-[1.02]"
            style={{
              background: 'rgba(13,20,36,0.9)',
              border: '1px solid rgba(26,40,64,0.8)',
            }}
          >
            <div className="text-[10px] text-tsua-muted uppercase tracking-widest font-bold mb-1">
              {'ETF ייצוג'}
            </div>
            <div className="flex items-baseline gap-2" dir="ltr">
              <span className="text-lg font-black font-mono text-tsua-text">{sector.etf}</span>
              {etfQuote && (
                <span className="text-sm font-bold font-mono" style={{ color: isEtfUp ? '#00e5b0' : '#ff4d6a' }}>
                  ${etfQuote.price.toFixed(2)}
                </span>
              )}
            </div>
            {etfQuote && (
              <div
                dir="ltr"
                className="text-xs font-bold mt-1 font-mono"
                style={{ color: isEtfUp ? '#00e5b0' : '#ff4d6a' }}
              >
                {isEtfUp ? '▲' : '▼'} {isEtfUp ? '+' : ''}{etfQuote.changePercent.toFixed(2)}%
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Top Constituents */}
      <section className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-bold text-tsua-text mb-4">🏆 מניות בולטות במגזר</h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sector.top.map((t) => (
              <div key={t} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(26,40,64,0.5)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {sortedTop.map((ticker) => {
              const q = quotes[ticker];
              const up = (q?.changePercent ?? 0) >= 0;
              const color = q ? (up ? '#00e5b0' : '#ff4d6a') : '#5a7090';
              const bg = q
                ? up
                  ? 'rgba(0,229,176,0.08)'
                  : 'rgba(255,77,106,0.08)'
                : 'rgba(26,40,64,0.4)';
              const border = q
                ? up
                  ? 'rgba(0,229,176,0.25)'
                  : 'rgba(255,77,106,0.25)'
                : 'rgba(26,40,64,0.7)';

              return (
                <Link
                  key={ticker}
                  href={`/${locale}/stocks/${ticker}`}
                  className="rounded-xl p-3 transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span dir="ltr" className="text-sm font-black font-mono text-tsua-text">
                      {ticker}
                    </span>
                    {q && (
                      <span className="text-xs font-bold tabular-nums font-mono" style={{ color }} dir="ltr">
                        {up ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {q && (
                    <div dir="ltr" className="text-[11px] text-tsua-muted font-mono mt-0.5">
                      ${q.price.toFixed(2)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

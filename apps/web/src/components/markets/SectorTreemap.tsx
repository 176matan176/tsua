'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { squarify } from '@/lib/squarify';

/**
 * Finviz-style market map.
 *
 * Two-level squarified treemap:
 *   - The full canvas is split into 11 sector rectangles, each sized by the
 *     sum of its constituents' market caps.
 *   - Each sector rectangle is then internally tiled by individual stocks,
 *     sized by market cap, colored green/red by daily % change (intensity
 *     saturates at ±3%).
 *
 * Resizes responsively. Tickers and labels are left-to-right (LTR) since
 * symbols are English; sector header labels stay in Hebrew (RTL).
 */

interface Stock {
  ticker: string;
  sectorKey: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number;
  currency: string;
}

interface SectorMeta {
  key: string;
  nameHe: string;
  nameEn: string;
  emoji: string;
  color: string;
}

interface HeatmapPayload {
  sectors: SectorMeta[];
  stocks: Stock[];
  timestamp: number;
  error?: string;
}

const PCT_CAP = 3; // saturate color intensity at ±3%

function heatColor(pct: number): { bg: string; text: string } {
  const clamped = Math.max(-PCT_CAP, Math.min(PCT_CAP, pct));
  const t = Math.abs(clamped) / PCT_CAP; // 0 → 1
  if (Math.abs(clamped) < 0.05) {
    // near-flat → neutral gray
    return { bg: 'rgb(40,55,75)', text: '#cbd6e3' };
  }
  if (clamped > 0) {
    // green
    const r = Math.round(0  + (1 - t) * 30);
    const g = Math.round(229 - (1 - t) * 80);
    const b = Math.round(176 - (1 - t) * 90);
    return { bg: `rgb(${r},${g},${b})`, text: '#03241c' };
  }
  // red
  const r = Math.round(255 - (1 - t) * 90);
  const g = Math.round(77  - (1 - t) * 25);
  const b = Math.round(106 - (1 - t) * 40);
  return { bg: `rgb(${r},${g},${b})`, text: '#240811' };
}

function fmtPct(p: number): string {
  const s = p >= 0 ? '+' : '';
  return `${s}${p.toFixed(2)}%`;
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

interface StockRectProps {
  stock: Stock;
  rect: { x: number; y: number; w: number; h: number };
  locale: string;
}

function StockRect({ stock, rect, locale }: StockRectProps) {
  const { bg, text } = heatColor(stock.changePercent);
  const area = rect.w * rect.h;
  const showTicker = rect.w > 28 && rect.h > 22;
  const showPct = rect.w > 50 && rect.h > 38;
  const showName = rect.w > 90 && rect.h > 60;
  const tickerSize = Math.min(20, Math.max(9, Math.sqrt(area) / 6));
  const pctSize = Math.min(13, Math.max(8, Math.sqrt(area) / 9));

  return (
    <Link
      href={`/${locale}/stocks/${stock.ticker}`}
      className="absolute overflow-hidden flex flex-col items-center justify-center transition-transform hover:z-10 hover:scale-[1.04] hover:shadow-2xl"
      style={{
        left: rect.x,
        top: rect.y,
        width: Math.max(0, rect.w - 1),
        height: Math.max(0, rect.h - 1),
        background: bg,
        color: text,
      }}
      title={`${stock.ticker} · ${stock.name}\n${fmtPct(stock.changePercent)} · ${fmtCap(stock.marketCap)}\nמחיר: $${stock.price.toFixed(2)}`}
    >
      {showTicker && (
        <span
          className="font-black tracking-tight leading-none"
          style={{ fontSize: tickerSize, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          {stock.ticker}
        </span>
      )}
      {showPct && (
        <span
          className="font-bold tabular-nums leading-none mt-0.5"
          style={{ fontSize: pctSize }}
        >
          {fmtPct(stock.changePercent)}
        </span>
      )}
      {showName && (
        <span
          className="text-[9px] opacity-70 truncate max-w-full px-1 mt-0.5"
        >
          {stock.name}
        </span>
      )}
    </Link>
  );
}

interface SectorBlockProps {
  sector: SectorMeta;
  rect: { x: number; y: number; w: number; h: number };
  stocks: Stock[];
  locale: string;
}

function SectorBlock({ sector, rect, stocks, locale }: SectorBlockProps) {
  const HEADER_H = Math.min(28, Math.max(18, rect.h * 0.07));
  const PADDING = 2;

  const innerBox = {
    x: rect.x + PADDING,
    y: rect.y + HEADER_H,
    w: Math.max(0, rect.w - 2 * PADDING),
    h: Math.max(0, rect.h - HEADER_H - PADDING),
  };

  const items = stocks.map((s) => ({ value: s.marketCap, data: s }));
  const stockRects = squarify(items, innerBox);

  const showHeader = rect.w > 60;

  return (
    <div className="absolute" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      {showHeader && (
        <div
          dir="rtl"
          className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-2 z-[1] pointer-events-none"
          style={{
            height: HEADER_H,
            color: '#cbd6e3',
            fontWeight: 800,
            fontSize: Math.min(13, Math.max(9, HEADER_H * 0.55)),
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            letterSpacing: '-0.01em',
          }}
        >
          <span>{sector.emoji}</span>
          <span className="truncate">{sector.nameHe}</span>
        </div>
      )}
      {stockRects.map((r) => (
        <StockRect
          key={(r.data as Stock).ticker}
          stock={r.data as Stock}
          rect={{
            ...r,
            x: r.x - rect.x,
            y: r.y - rect.y,
          }}
          locale={locale}
        />
      ))}
    </div>
  );
}

export function SectorTreemap() {
  const locale = useLocale();
  const [data, setData] = useState<HeatmapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch heatmap data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/sectors/heatmap');
        const json: HeatmapPayload = await r.json();
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const int = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(int); };
  }, []);

  // Track container size for responsive treemap
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Group stocks by sector + compute sector-level rects
  const layout = useMemo(() => {
    if (!data || size.w === 0 || size.h === 0) return null;

    const stocksBySector = new Map<string, Stock[]>();
    for (const s of data.stocks) {
      const list = stocksBySector.get(s.sectorKey) ?? [];
      list.push(s);
      stocksBySector.set(s.sectorKey, list);
    }

    // Sector value = sum of constituent market caps
    const sectorItems = data.sectors
      .map((sec) => {
        const stocks = stocksBySector.get(sec.key) ?? [];
        const totalCap = stocks.reduce((sum, s) => sum + s.marketCap, 0);
        return { value: totalCap, data: { sector: sec, stocks } };
      })
      .filter((s) => s.value > 0);

    const sectorRects = squarify(sectorItems, { x: 0, y: 0, w: size.w, h: size.h });
    return { sectorRects };
  }, [data, size.w, size.h]);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          aspectRatio: '16 / 10',
          background: 'rgba(13,20,36,0.8)',
          border: '1px solid rgba(26,40,64,0.8)',
        }}
      >
        {loading && !data && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-tsua-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full animate-spin"
                style={{ border: '3px solid rgba(0,229,176,0.2)', borderTopColor: '#00e5b0' }}
              />
              <span>טוען מפת שוק…</span>
            </div>
          </div>
        )}

        {data?.error && !data.stocks.length && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-tsua-muted">
            לא ניתן לטעון את מפת השוק.
          </div>
        )}

        {layout?.sectorRects.map((r) => {
          const { sector, stocks } = r.data;
          return (
            <SectorBlock
              key={sector.key}
              sector={sector}
              rect={r}
              stocks={stocks}
              locale={locale}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-tsua-muted px-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">תנועה יומית:</span>
          <div className="flex items-center rounded-md overflow-hidden border" style={{ borderColor: 'rgba(26,40,64,0.7)' }}>
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(165,52,66)', color: '#240811' }}>-3%</span>
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(210,65,86)', color: '#240811' }}>-1%</span>
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(40,55,75)', color: '#cbd6e3' }}>0%</span>
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(0,180,140)', color: '#03241c' }}>+1%</span>
            <span className="px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(0,229,176)', color: '#03241c' }}>+3%</span>
          </div>
        </div>
        <div>גודל הריבוע = שווי שוק. לחיצה פותחת את דף המניה.</div>
      </div>
    </div>
  );
}

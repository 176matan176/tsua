'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';

interface StockChartProps {
  ticker: string;
}

export function StockChart({ ticker }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const [range, setRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

  const ranges: TimeRange[] = ['1D', '1W', '1M', '3M', '1Y'];

  useEffect(() => {
    if (!containerRef.current) return;

    let chart: any;

    async function initChart() {
      const lc = await import('lightweight-charts');
      const { createChart, ColorType } = lc;

      chart = createChart(containerRef.current!, {
        layout: {
          background: { type: ColorType.Solid, color: '#111827' },
          textColor: '#6b7280',
        },
        grid: {
          vertLines: { color: '#1e2d3d' },
          horzLines: { color: '#1e2d3d' },
        },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: '#1e2d3d' },
        timeScale: {
          borderColor: '#1e2d3d',
          rightOffset: 5,
          fixLeftEdge: true,
        },
        width: containerRef.current!.clientWidth,
        height: 350,
      });

      // Mock OHLCV data
      const mockData = generateMockOHLCV();

      if (chartType === 'candle') {
        const series = chart.addCandlestickSeries({
          upColor: '#00d4a0',
          downColor: '#ef4444',
          borderUpColor: '#00d4a0',
          borderDownColor: '#ef4444',
          wickUpColor: '#00d4a0',
          wickDownColor: '#ef4444',
        });
        series.setData(mockData);
      } else {
        const series = chart.addLineSeries({
          color: '#00d4a0',
          lineWidth: 2,
        });
        series.setData(mockData.map((d: any) => ({ time: d.time, value: d.close })));
      }

      chart.timeScale().fitContent();
    }

    initChart();

    const handleResize = () => {
      chart?.applyOptions({ width: containerRef.current!.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart?.remove();
    };
  }, [ticker, range, chartType]);

  return (
    <div className="bg-tsua-card border border-tsua-border rounded-2xl p-4">
      {/* Chart controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                range === r
                  ? 'bg-tsua-green/20 text-tsua-green border border-tsua-green/40'
                  : 'text-tsua-muted hover:text-tsua-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['candle', 'line'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                chartType === type
                  ? 'border-tsua-green text-tsua-green'
                  : 'border-tsua-border text-tsua-muted hover:border-tsua-green/50'
              }`}
            >
              {type === 'candle' ? (locale === 'he' ? 'נרות' : 'Candle') : (locale === 'he' ? 'קו' : 'Line')}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} />
    </div>
  );
}

function generateMockOHLCV() {
  const data = [];
  let price = 52;
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  for (let i = 90; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 2;
    const open = price;
    const close = +(price + change).toFixed(2);
    const high = +(Math.max(open, close) + Math.random() * 0.8).toFixed(2);
    const low = +(Math.min(open, close) - Math.random() * 0.8).toFixed(2);
    price = close;
    data.push({
      time: now - i * day,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 10_000_000 + 5_000_000),
    });
  }
  return data;
}

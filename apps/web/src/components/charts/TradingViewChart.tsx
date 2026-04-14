'use client';

import { useEffect, useRef, memo, useState } from 'react';
import { useLocale } from 'next-intl';
import { ArrowsPointingOutIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';

interface TradingViewChartProps {
  ticker: string;
}

function toTVSymbol(ticker: string): string {
  const t = ticker.toUpperCase().replace('$', '');
  if (t.endsWith('.TA')) return `TASE:${t.replace('.TA', '')}`;
  const taseOnly = ['TEVA', 'NICE', 'ESLT', 'MNDO', 'LUMI', 'POLI', 'BEZQ', 'ICL', 'ELBIT'];
  if (taseOnly.includes(t)) return `TASE:${t}`;
  const nasdaq = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AMD', 'INTC', 'CHKP'];
  if (nasdaq.includes(t)) return `NASDAQ:${t}`;
  return t;
}

function TradingViewChartInner({ ticker }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const symbol = toTVSymbol(ticker);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'Asia/Jerusalem',
      theme: 'dark',
      style: '1',
      locale: locale === 'he' ? 'he_IL' : 'en',
      backgroundColor: '#0a0f1e',
      gridColor: 'rgba(26,40,64,0.4)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [symbol, locale]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const chartHeight = fullscreen ? '100%' : 'clamp(420px, 65vh, 780px)';

  return (
    <>
      {/* Fullscreen backdrop */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setFullscreen(false)}
        />
      )}

      <div
        className={fullscreen
          ? 'fixed inset-4 z-50 rounded-2xl overflow-hidden flex flex-col'
          : 'rounded-2xl overflow-hidden'
        }
        style={{ border: '1px solid rgba(26,40,64,0.8)' }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: 'rgba(8,13,26,0.95)', borderBottom: '1px solid rgba(26,40,64,0.6)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tsua-green animate-pulse" />
            <span className="text-tsua-green text-sm font-bold">{ticker}</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
            >
              TradingView
            </span>
            <span className="text-tsua-muted text-xs hidden sm:block">{symbol}</span>
          </div>

          {/* Interval pills */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1">
              {['1D', '1W', '1M', '3M', '1Y'].map(i => (
                <span key={i} className="text-[10px] text-tsua-muted px-1.5 py-0.5 rounded cursor-default">
                  {i}
                </span>
              ))}
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 rounded-lg transition-colors hover:bg-tsua-border text-tsua-muted hover:text-tsua-text"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen
                ? <ArrowsPointingInIcon className="w-4 h-4" />
                : <ArrowsPointingOutIcon className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Chart */}
        <div
          ref={containerRef}
          className="tradingview-widget-container flex-1"
          style={{ height: chartHeight, width: '100%', minHeight: 0 }}
        />
      </div>
    </>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);

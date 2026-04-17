'use client';

import { useState } from 'react';
import { StockHeader, StockData } from '@/components/stocks/StockHeader';
import { TradingViewChart } from '@/components/charts/TradingViewChart';
import { SentimentMeter } from '@/components/stocks/SentimentMeter';
import { FeedStream } from '@/components/feed/FeedStream';
import { CompanyOverview } from '@/components/stocks/CompanyOverview';
import { KeyStats } from '@/components/stocks/KeyStats';
import { StockNews } from '@/components/stocks/StockNews';

type Tab = 'feed' | 'news';

export function StockPageClient({ ticker }: { ticker: string }) {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [tab, setTab] = useState<Tab>('feed');

  const sidebarContent = stockData ? (
    <>
      <KeyStats
        ticker={ticker}
        currency={stockData.currency}
        prevClose={stockData.prevClose}
        volume={stockData.volume}
        high={stockData.high}
        low={stockData.low}
        week52High={stockData.week52High}
        week52Low={stockData.week52Low}
        peRatio={stockData.peRatio}
        forwardPE={stockData.forwardPE}
        eps={stockData.eps}
        beta={stockData.beta}
        dividendYield={stockData.dividendYield}
        pbRatio={stockData.pbRatio}
        roeTTM={stockData.roeTTM}
        revenueGrowthTTM={stockData.revenueGrowthTTM}
        marketCap={stockData.marketCap}
      />
      <CompanyOverview
        ticker={ticker}
        name={stockData.name}
        industry={stockData.industry}
        sector={stockData.sector}
        employees={stockData.employees}
        ipo={stockData.ipo}
        weburl={stockData.weburl}
        country={stockData.country}
        exchange={stockData.exchange}
        currency={stockData.currency}
        logo={stockData.logo}
      />
    </>
  ) : (
    <div
      className="rounded-2xl animate-pulse"
      style={{ height: 320, background: 'var(--card)', border: '1px solid var(--border)' }}
    />
  );

  return (
    <div className="space-y-4">
      <StockHeader ticker={ticker} onDataLoaded={setStockData} />
      <TradingViewChart ticker={ticker} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* LEFT */}
        <div className="space-y-4 min-w-0">
          <SentimentMeter ticker={ticker} />

          {/* נתונים מרכזיים — במובייל מופיע כאן, לפני הפיד */}
          <div className="lg:hidden space-y-4">
            {sidebarContent}
          </div>

          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            {([
              ['feed', '💬 דיון קהילתי'],
              ['news', '📰 חדשות'],
            ] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t as Tab)}
                className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                style={tab === t
                  ? { background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#080d1a' }
                  : { color: '#5a7090' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'feed' && <FeedStream ticker={ticker} />}
          {tab === 'news' && <StockNews ticker={ticker} />}
        </div>

        {/* SIDEBAR — דסקטופ בלבד */}
        <div className="hidden lg:block space-y-4 lg:sticky lg:top-[calc(56px+1.5rem)]">
          {sidebarContent}
        </div>
      </div>
    </div>
  );
}

'use client';

import { FeedStream } from '@/components/feed/FeedStream';
import { PostComposer } from '@/components/feed/PostComposer';
import { TrendingStocks } from '@/components/stocks/TrendingStocks';
import { TrendingDiscussions } from '@/components/stocks/TrendingDiscussions';
import { MarketSummary } from '@/components/stocks/MarketSummary';
import { HotStocksWidget } from '@/components/stocks/HotStocksWidget';
import { LiveStream } from '@/components/stream/LiveStream';
import { useState } from 'react';

const STREAM_TOPICS = [
  { topic: 'tase',   topicHe: 'ת"א',    topicEn: 'TASE'      },
  { topic: 'us',     topicHe: 'ארה"ב',  topicEn: 'US Markets' },
  { topic: 'macro',  topicHe: 'מאקרו',  topicEn: 'Macro'      },
  { topic: 'crypto', topicHe: 'קריפטו', topicEn: 'Crypto'     },
];

export default function HomePage() {
  const [streamTopic, setStreamTopic] = useState(0);

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main feed ── */}
      <div className="flex-1 min-w-0 space-y-4">
        <HotStocksWidget />
        <MarketSummary />
        <PostComposer />
        <FeedStream />
      </div>

      {/* ── Right rail ── */}
      <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0 sticky top-[calc(56px+40px)]">
        <TrendingDiscussions />
        <TrendingStocks />

        {/* Live discussion panel */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgb(var(--rgb-bg2) / 0.6)',
            border: '1px solid rgb(var(--rgb-border) / 0.6)',
          }}
        >
          {/* Topic tabs */}
          <div
            className="flex gap-1 px-3 py-2.5 overflow-x-auto scrollbar-none"
            style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.5)' }}
          >
            {STREAM_TOPICS.map((t, i) => (
              <button
                key={t.topic}
                onClick={() => setStreamTopic(i)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all duration-200 shrink-0"
                style={streamTopic === i
                  ? { background: 'rgb(var(--rgb-accent) / 0.15)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.25)' }
                  : { background: 'rgb(var(--rgb-card) / 0.6)', color: 'var(--muted)', border: '1px solid rgb(var(--rgb-border) / 0.6)' }
                }
              >
                {t.topicHe}
              </button>
            ))}
          </div>

          <LiveStream
            topic={STREAM_TOPICS[streamTopic].topic}
            topicHe={STREAM_TOPICS[streamTopic].topicHe}
            topicEn={STREAM_TOPICS[streamTopic].topicEn}
          />
        </div>
      </aside>
    </div>
  );
}

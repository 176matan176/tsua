'use client';

import { FeedStream } from '@/components/feed/FeedStream';
import { PostComposer } from '@/components/feed/PostComposer';
import { TrendingStocks } from '@/components/stocks/TrendingStocks';
import { MarketSummary } from '@/components/stocks/MarketSummary';
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
        <MarketSummary />
        <PostComposer />
        <FeedStream />
      </div>

      {/* ── Right rail ── */}
      <aside className="hidden xl:flex flex-col gap-4 w-72 shrink-0 sticky top-[calc(56px+40px)]">
        <TrendingStocks />

        {/* Live discussion panel */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(13,20,36,0.6)',
            border: '1px solid rgba(26,40,64,0.6)',
          }}
        >
          {/* Topic tabs */}
          <div
            className="flex gap-1 px-3 py-2.5 overflow-x-auto scrollbar-none"
            style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
          >
            {STREAM_TOPICS.map((t, i) => (
              <button
                key={t.topic}
                onClick={() => setStreamTopic(i)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all duration-200 shrink-0"
                style={streamTopic === i
                  ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }
                  : { background: 'rgba(15,25,41,0.6)', color: '#5a7090', border: '1px solid rgba(26,40,64,0.6)' }
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

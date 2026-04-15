'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { TrendingStocks } from '@/components/stocks/TrendingStocks';
import { LiveStream } from '@/components/stream/LiveStream';

const STREAM_TOPICS = [
  { topic: 'tase',   topicHe: 'ת"א',    topicEn: 'TASE'       },
  { topic: 'us',     topicHe: 'ארה"ב',  topicEn: 'US Markets' },
  { topic: 'macro',  topicHe: 'מאקרו',  topicEn: 'Macro'      },
  { topic: 'crypto', topicHe: 'קריפטו', topicEn: 'Crypto'     },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileRightDrawer({ isOpen, onClose }: Props) {
  const [streamTopic, setStreamTopic] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        style={{
          background: 'rgba(2,5,12,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={onClose}
      />

      {/* Drawer — slides in from the right */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[56] w-[85vw] max-w-[320px] flex flex-col overflow-hidden"
        style={{
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-16px 0 48px rgba(0,0,0,0.6)',
          animation: 'slideInRight 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border2)' }}
          dir="rtl"
        >
          <span className="text-sm font-black" style={{ color: 'var(--text)' }}>
            📊 טרנדים ופיד חי
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all active:scale-90"
            style={{
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-4"
          dir="rtl"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <TrendingStocks />

          {/* Live stream panel */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {/* Topic tabs */}
            <div
              className="flex gap-1 px-3 py-2.5 overflow-x-auto scrollbar-none"
              style={{ borderBottom: '1px solid var(--border2)' }}
            >
              {STREAM_TOPICS.map((t, i) => (
                <button
                  key={t.topic}
                  onClick={() => setStreamTopic(i)}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all duration-200 shrink-0"
                  style={streamTopic === i
                    ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }
                    : { background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }
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
        </div>
      </div>
    </>
  );
}

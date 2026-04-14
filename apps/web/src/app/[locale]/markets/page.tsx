'use client';

import { MarketsPage } from '@/components/markets/MarketsPage';
import { LiveStream } from '@/components/stream/LiveStream';


export default function Markets() {
  return (
    <div className="flex gap-4 items-start">
      {/* Main markets content */}
      <div className="flex-1 min-w-0">
        <MarketsPage />
      </div>

      {/* Live stream sidebar */}
      <div className="hidden lg:block w-80 shrink-0 sticky top-20">
        <LiveStream
          topic="markets"
          topicHe='שוק ההון'
          topicEn='Market'
        />
      </div>
    </div>
  );
}

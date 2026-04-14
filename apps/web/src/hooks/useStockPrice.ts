'use client';

import { useEffect, useState } from 'react';
import { connectSocket } from '@/lib/socket';
import type { StockQuote } from '@/types/shared';

export function useStockPrice(ticker: string) {
  const [quote, setQuote] = useState<Partial<StockQuote> | null>(null);

  useEffect(() => {
    const socket = connectSocket();

    socket.emit('subscribe:price', { ticker });
    socket.on(`price:${ticker}`, (data: Partial<StockQuote>) => {
      setQuote(data);
    });

    return () => {
      socket.emit('unsubscribe:price', { ticker });
      socket.off(`price:${ticker}`);
    };
  }, [ticker]);

  return quote;
}

'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  name?: string;
  flash?: 'up' | 'down' | null;
}

interface PriceContextValue {
  prices: Record<string, PriceData>;
  subscribe: (ticker: string) => void;
  unsubscribe: (ticker: string) => void;
}

const PriceContext = createContext<PriceContextValue>({
  prices: {},
  subscribe: () => {},
  unsubscribe: () => {},
});

export function PriceProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const socketRef = useRef<Socket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const refCountRef = useRef<Record<string, number>>({});
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);

  // Connect to backend Socket.io
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!wsUrl) return;

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 3000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Re-subscribe to all active tickers
      subscriptionsRef.current.forEach(ticker => {
        socket.emit('subscribe:price', { ticker });
      });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen for price events for subscribed tickers
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handlers: Record<string, (data: any) => void> = {};

    subscriptionsRef.current.forEach(ticker => {
      const event = `price:${ticker}`;
      const handler = (data: any) => {
        setPrices(prev => {
          const prevPrice = prev[ticker]?.price;
          const newPrice = data.price;
          const flash = prevPrice !== undefined
            ? (newPrice > prevPrice ? 'up' : newPrice < prevPrice ? 'down' : null)
            : null;
          return { ...prev, [ticker]: { ...data, flash } };
        });
        // Clear flash after 800ms
        if (data.price) {
          setTimeout(() => {
            setPrices(prev => prev[ticker] ? { ...prev, [ticker]: { ...prev[ticker], flash: null } } : prev);
          }, 800);
        }
      };
      handlers[event] = handler;
      socket.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket?.off(event, handler);
      });
    };
  }, [connected, Array.from(subscriptionsRef.current).join(',')]);

  // Fallback polling when socket is not connected
  useEffect(() => {
    if (connected) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const poll = async () => {
      const tickers = Array.from(subscriptionsRef.current);
      if (tickers.length === 0) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return;

      try {
        const res = await fetch(`${apiUrl}/api/v1/stocks/batch?symbols=${tickers.join(',')}`);
        if (!res.ok) return;
        const data = await res.json();
        setPrices(prev => {
          const next = { ...prev };
          Object.entries(data).forEach(([ticker, priceData]: [string, any]) => {
            const prevPrice = prev[ticker]?.price;
            const flash = prevPrice !== undefined
              ? (priceData.price > prevPrice ? 'up' : priceData.price < prevPrice ? 'down' : null)
              : null;
            next[ticker] = { ...priceData, flash };
            if (flash) {
              setTimeout(() => {
                setPrices(p => p[ticker] ? { ...p, [ticker]: { ...p[ticker], flash: null } } : p);
              }, 800);
            }
          });
          return next;
        });
      } catch {
        // ignore
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [connected]);

  const subscribe = useCallback((ticker: string) => {
    refCountRef.current[ticker] = (refCountRef.current[ticker] || 0) + 1;
    if (!subscriptionsRef.current.has(ticker)) {
      subscriptionsRef.current.add(ticker);
      socketRef.current?.emit('subscribe:price', { ticker });
    }
  }, []);

  const unsubscribe = useCallback((ticker: string) => {
    refCountRef.current[ticker] = Math.max(0, (refCountRef.current[ticker] || 1) - 1);
    if (refCountRef.current[ticker] === 0) {
      subscriptionsRef.current.delete(ticker);
      socketRef.current?.emit('unsubscribe:price', { ticker });
    }
  }, []);

  return (
    <PriceContext.Provider value={{ prices, subscribe, unsubscribe }}>
      {children}
    </PriceContext.Provider>
  );
}

export function useLivePrice(ticker: string): PriceData | null {
  const { prices, subscribe, unsubscribe } = useContext(PriceContext);

  useEffect(() => {
    if (!ticker) return;
    subscribe(ticker);
    return () => unsubscribe(ticker);
  }, [ticker, subscribe, unsubscribe]);

  return prices[ticker] || null;
}

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface StockData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number | null;
  marketCap: number | null;
  currency: string;
  exchange: string;
  logo: string | null;
  isLive: boolean;
}

export type PriceFlash = 'up' | 'down' | null;

const POLL_INTERVAL = 30_000; // 30 seconds

export function useRealtimeStock(ticker: string) {
  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<PriceFlash>(null);
  const prevPriceRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const triggerFlash = useCallback((newPrice: number) => {
    const prev = prevPriceRef.current;
    if (prev !== null && newPrice !== prev) {
      setFlash(newPrice > prev ? 'up' : 'down');
      setTimeout(() => setFlash(null), 800);
    }
    prevPriceRef.current = newPrice;
  }, []);

  const fetchStock = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks/${ticker}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.price && mountedRef.current) {
        setStock({ ...data, isLive: true });
        triggerFlash(data.price);
        setLoading(false);
        return data;
      }
    } catch {
      // silently ignore
    }
    return null;
  }, [ticker, triggerFlash]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    fetchStock().then((data) => {
      if (!data && mountedRef.current) setLoading(false);
    });

    // ─── Finnhub WebSocket for live trades ───────────────────────
    const wsKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (wsKey && typeof window !== 'undefined') {
      const ws = new WebSocket(`wss://ws.finnhub.io?token=${wsKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: ticker }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'trade' && msg.data?.length && mountedRef.current) {
            const latestTrade = msg.data[msg.data.length - 1];
            const newPrice = latestTrade.p;
            setStock(prev => {
              if (!prev) return prev;
              const change = newPrice - prev.prevClose;
              const changePercent = (change / prev.prevClose) * 100;
              return { ...prev, price: newPrice, change, changePercent, isLive: true };
            });
            triggerFlash(newPrice);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        // Fallback to polling if WebSocket fails
        startPolling();
      };

      ws.onclose = () => {
        if (mountedRef.current) startPolling();
      };
    } else {
      // No WebSocket key — use polling
      startPolling();
    }

    function startPolling() {
      if (pollRef.current) return; // already polling
      pollRef.current = setInterval(fetchStock, POLL_INTERVAL);
    }

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol: ticker }));
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [ticker, fetchStock, triggerFlash]);

  return { stock, loading, flash };
}

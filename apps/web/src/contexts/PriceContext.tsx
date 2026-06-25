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
  // Bumped every time the subscription set actually changes. Used as a
  // useEffect dep so price-event listeners re-register for *new* tickers —
  // we previously used `Array.from(subscriptionsRef.current).join(',')`,
  // but refs don't trigger re-renders so the dep was stale and handlers
  // for tickers subscribed after mount never wired up.
  const [subVersion, setSubVersion] = useState(0);

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
    // `subVersion` is the real signal — bumps whenever the subscription set
    // changes, which the ref alone could never communicate to the effect.
  }, [connected, subVersion]);

  /**
   * Polling cadence that approximates a "live" feel without paying for a
   * real-time data feed. Adapts to whether US/TASE markets are actively
   * trading right now:
   *
   *   - Regular session (US 14:30-21:00 UTC, TASE 06:30-15:30 UTC): 5s
   *   - Extended hours (US pre/post, +-2h around the bell):          10s
   *   - Overnight + weekends:                                        30s
   *
   * The user perception of "Yahoo Finance feels live" comes from the UI
   * ticking + flashing, not from sub-second feed accuracy. 5s polling +
   * a clear green/red flash on each change reads identically to most users
   * vs an actual WebSocket-based system.
   *
   * The internal /api/stocks/batch cache is 60s so even at 5s polling we
   * make at most ~12 cache lookups/min upstream — most resolve from cache.
   */
  function getPollIntervalMs(): number {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return 30_000; // weekend — markets closed

    const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    // US regular session ≈ 14:30-21:00 UTC (DST-adjusted, ignoring half-hour
    // DST drift — 5s during the bigger window is fine even off by 30 min)
    const usOpen = 14 * 60 + 30;
    const usClose = 21 * 60;
    // TASE regular session ≈ 06:30-15:30 UTC
    const taseOpen = 6 * 60 + 30;
    const taseClose = 15 * 60 + 30;
    if ((totalMinutes >= usOpen && totalMinutes <= usClose)
        || (totalMinutes >= taseOpen && totalMinutes <= taseClose)) {
      return 2_000; // 2s — "pulse like Yahoo Finance" feel
    }
    // US extended hours (pre 09:00-14:30, after 21:00-01:00) — still active
    if ((totalMinutes >= 9 * 60 && totalMinutes < usOpen)
        || (totalMinutes > usClose && totalMinutes <= 23 * 60 + 59)) {
      return 5_000;
    }
    return 30_000;
  }

  // Fallback polling when the realtime socket isn't connected.
  //
  // History: this used to require NEXT_PUBLIC_API_URL pointing at an external
  // Express backend. In production that env var isn't always set (and the
  // backend may be cold/down), so the LiveMarketBar / HotStocks / WatchlistRow
  // sat permanently in skeleton state — no socket, no polling, no data.
  //
  // Now: we always have a working fallback by hitting our own Next.js route
  // `/api/stocks/batch`, which itself uses fetchQuote (Finnhub primary + Yahoo
  // fallback) so coverage is broad and reliable. If NEXT_PUBLIC_API_URL is set
  // we still prefer it (lower latency, more frequent updates from the bespoke
  // backend); otherwise we fall through to the relative path.
  useEffect(() => {
    if (connected) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    const externalApi = process.env.NEXT_PUBLIC_API_URL;

    const poll = async () => {
      const tickers = Array.from(subscriptionsRef.current);
      if (tickers.length === 0) return;

      // Try external first (faster + has volume etc.); fall back to internal
      // route which always works as long as Finnhub/Yahoo are reachable.
      const url = externalApi
        ? `${externalApi}/api/v1/stocks/batch?symbols=${tickers.join(',')}`
        : `/api/stocks/batch?symbols=${tickers.join(',')}`;

      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          // If the external API failed and we haven't tried internal yet, try it.
          if (externalApi) {
            const r2 = await fetch(`/api/stocks/batch?symbols=${tickers.join(',')}`, { cache: 'no-store' });
            if (!r2.ok) return;
            return applyBatch(await r2.json());
          }
          return;
        }
        applyBatch(await res.json());
      } catch {
        // Last-ditch: try the internal route from a thrown fetch.
        if (externalApi) {
          try {
            const r2 = await fetch(`/api/stocks/batch?symbols=${tickers.join(',')}`, { cache: 'no-store' });
            if (r2.ok) applyBatch(await r2.json());
          } catch { /* swallow — next interval will retry */ }
        }
      }
    };

    function applyBatch(data: Record<string, { price: number; change: number; changePercent: number }>) {
      setPrices(prev => {
        const next = { ...prev };
        Object.entries(data).forEach(([ticker, priceData]) => {
          if (typeof priceData?.price !== 'number') return;
          const prevPrice = prev[ticker]?.price;
          const flash = prevPrice !== undefined
            ? (priceData.price > prevPrice ? 'up' : priceData.price < prevPrice ? 'down' : null)
            : null;
          next[ticker] = { ...priceData, flash };
          if (flash) {
            // 1500ms flash window — paired with the more saturated background
            // tint in consumer components, gives the price a clear "pulse"
            // that the eye reliably catches even when scanning a busy list.
            setTimeout(() => {
              setPrices(p => p[ticker] ? { ...p, [ticker]: { ...p[ticker], flash: null } } : p);
            }, 1500);
          }
        });
        return next;
      });
    }

    // Recursive setTimeout (not setInterval) so each tick re-evaluates the
    // cadence — a tab kept open as the bell rings should automatically speed
    // up from 30s to 5s without a page reload, and slow back down at close.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleNext() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        // Tab is in the background — pause polling to save battery and avoid
        // hammering Vercel for nothing. visibilitychange handler resumes us.
        return;
      }
      const ms = getPollIntervalMs();
      timeoutId = setTimeout(async () => {
        await poll();
        scheduleNext();
      }, ms);
    }

    function clearScheduled() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        // Tab back in focus — refresh immediately so the user sees current
        // prices instead of whatever was on screen when they left, then
        // resume normal cadence.
        clearScheduled();
        poll();
        scheduleNext();
      } else {
        clearScheduled();
      }
    }

    // First poll fires immediately so the bar doesn't sit empty waiting.
    poll();
    scheduleNext();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      clearScheduled();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, subVersion]);

  const subscribe = useCallback((ticker: string) => {
    refCountRef.current[ticker] = (refCountRef.current[ticker] || 0) + 1;
    if (!subscriptionsRef.current.has(ticker)) {
      subscriptionsRef.current.add(ticker);
      socketRef.current?.emit('subscribe:price', { ticker });
      // Bump the version so the price-listener effect re-runs and registers
      // a handler for this new ticker. Without this, prices flow on the
      // socket but never make it into our state.
      setSubVersion(v => v + 1);
    }
  }, []);

  const unsubscribe = useCallback((ticker: string) => {
    refCountRef.current[ticker] = Math.max(0, (refCountRef.current[ticker] || 1) - 1);
    if (refCountRef.current[ticker] === 0) {
      subscriptionsRef.current.delete(ticker);
      socketRef.current?.emit('unsubscribe:price', { ticker });
      // Drop stale price from the map — otherwise the prices object grows
      // forever as the user navigates between tickers (slow memory leak).
      setPrices(prev => {
        if (!(ticker in prev)) return prev;
        const { [ticker]: _drop, ...rest } = prev;
        return rest;
      });
      setSubVersion(v => v + 1);
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

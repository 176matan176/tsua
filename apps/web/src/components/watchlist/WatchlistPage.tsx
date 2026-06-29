'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLivePrice } from '@/contexts/PriceContext';
import { TrashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon } from '@heroicons/react/24/solid';

interface WatchlistItem {
  id: string;
  ticker: string;
  name_en: string | null;
  name_he: string | null;
  exchange: string;
  logo: string | null;
  added_at: string;
}

function WatchlistRow({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: (ticker: string) => void;
}) {
  const locale = useLocale();
  const live = useLivePrice(item.ticker);
  const [removing, setRemoving] = useState(false);
  // Surface remove failures so the row doesn't appear to "do nothing" and
  // then reappear after page reload (the prior behavior).
  const [removeError, setRemoveError] = useState(false);
  const isUp = (live?.changePercent ?? 0) >= 0;
  const currencySymbol = item.exchange === 'TASE' || item.exchange === 'Tel Aviv Stock Exchange' ? '₪' : '$';

  async function handleRemove() {
    setRemoving(true);
    setRemoveError(false);
    try {
      // Was previously fire-and-forget — the local row disappeared regardless
      // of HTTP status, so a 500 would silently roll back on reload.
      const res = await fetch(`/api/watchlist/${item.ticker}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      onRemove(item.ticker);
      // No need to setRemoving(false) — the component unmounts when onRemove
      // fires and the parent filters this row out of `items`.
    } catch {
      setRemoving(false);
      setRemoveError(true);
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-white/2 group"
      style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.4)' }}
    >
      {/* Logo / Icon */}
      {item.logo ? (
        <img src={item.logo} alt={item.ticker} className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
          style={{ background: 'rgb(var(--rgb-accent) / 0.1)', color: 'var(--accent)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}
        >
          {item.ticker.slice(0, 3)}
        </div>
      )}

      {/* Name + ticker */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/${locale}/stocks/${item.ticker}`}
          className="font-bold text-tsua-text text-sm hover:text-tsua-accent transition-colors flex items-center gap-1.5 group/link"
        >
          <span dir="ltr">${item.ticker}</span>
          <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-0 group-hover/link:opacity-60 transition-opacity" />
        </Link>
        <div className="text-xs text-tsua-muted truncate">
          {item.name_he ?? item.name_en} · {item.exchange}
        </div>
      </div>

      {/* Live price — runtime type-guard on .price so a malformed socket
          payload (price: null or string) can't crash .toFixed and blow up the
          whole row. Same defense as on /stocks/[ticker]. */}
      <div className="text-end shrink-0">
        {live && typeof live.price === 'number' && Number.isFinite(live.price) ? (
          <>
            <div
              dir="ltr"
              className="font-bold font-mono text-sm transition-colors duration-300"
              style={{ color: live.flash === 'up' ? 'var(--accent)' : live.flash === 'down' ? 'var(--red)' : 'var(--text)' }}
            >
              {currencySymbol}{live.price.toFixed(2)}
            </div>
            <div
              dir="ltr"
              className="text-xs font-semibold"
              style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }}
            >
              {isUp ? '▲' : '▼'} {Math.abs(live.changePercent ?? 0).toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="space-y-1 animate-pulse">
            <div className="h-3 w-16 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
            <div className="h-2.5 w-12 rounded ms-auto" style={{ background: 'rgb(var(--rgb-border) / 0.4)' }} />
          </div>
        )}
      </div>

      {/* Remove button + inline error indicator if the DELETE failed. */}
      <div className="flex items-center gap-1">
        {removeError && (
          <span
            className="text-[10px]"
            style={{ color: 'var(--red)' }}
            title="הסרה נכשלה — נסה שוב"
          >
            ⚠️
          </span>
        )}
        <button
          onClick={handleRemove}
          disabled={removing}
          aria-label={`הסר את ${item.ticker} מרשימת המעקב`}
          className="p-2 rounded-xl text-tsua-muted hover:text-red-400 hover:bg-red-500/8 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
          title={removeError ? 'נסה שוב' : 'הסר ממעקב'}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  const locale = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgb(var(--rgb-accent) / 0.08)', border: '1px solid rgb(var(--rgb-accent) / 0.2)' }}
      >
        <BookmarkIcon className="w-8 h-8" style={{ color: 'var(--accent)' }} />
      </div>
      <h2 className="text-lg font-black text-tsua-text mb-2">
        {'רשימת המעקב ריקה'}
      </h2>
      <p className="text-sm text-tsua-muted mb-6 max-w-xs">
        {'הוסף מניות למעקב כדי לעקוב אחרי המחירים שלהן בקלות'}
      </p>
      <Link
        href={`/${locale}/markets`}
        className="text-sm font-bold px-6 py-2.5 rounded-xl text-tsua-bg transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', boxShadow: '0 4px 16px rgb(var(--rgb-accent) / 0.25)' }}
      >
        {'גלה מניות →'}
      </Link>
    </div>
  );
}

export function WatchlistPage() {
  const locale = useLocale();
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Distinct from "items is empty" — lets us show "couldn't load" vs the
  // friendly "discover stocks" empty state.
  const [errored, setErrored] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    setErrored(false);

    fetch('/api/watchlist', { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (ctrl.signal.aborted) return;
        if (Array.isArray(d)) {
          setItems(d);
        } else {
          setErrored(true);
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setErrored(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [user, retry]);

  function removeItem(ticker: string) {
    setItems(prev => prev.filter(i => i.ticker !== ticker));
  }

  // Not logged in
  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="text-5xl mb-4">🔖</div>
        <h2 className="text-lg font-black text-tsua-text mb-2">{'רשימת מעקב'}</h2>
        <p className="text-sm text-tsua-muted mb-6">{'התחבר כדי לנהל את רשימת המעקב שלך'}</p>
        <Link
          href={`/${locale}/login`}
          className="text-sm font-bold px-6 py-2.5 rounded-xl text-tsua-bg"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}
        >
          {'כניסה'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-tsua-text">
            {'🔖 רשימת מעקב'}
          </h1>
          {!loading && items.length > 0 && (
            <p className="text-xs text-tsua-muted mt-0.5">
              {items.length} {'מניות במעקב'}
            </p>
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgb(var(--rgb-bg2) / 0.8)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}
      >
        {/* Column headers */}
        {!loading && items.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-tsua-muted"
            style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}
          >
            <div className="w-10 shrink-0" />
            <div className="flex-1">{'מניה'}</div>
            <div className="text-end pe-10">{'מחיר / שינוי'}</div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="divide-y divide-white/4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
                  <div className="h-2.5 w-32 rounded" style={{ background: 'rgb(var(--rgb-border) / 0.35)' }} />
                </div>
                <div className="space-y-1.5 text-end">
                  <div className="h-3 w-16 rounded ms-auto" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
                  <div className="h-2.5 w-12 rounded ms-auto" style={{ background: 'rgb(var(--rgb-border) / 0.35)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {!loading && items.length > 0 && items.map(item => (
          <WatchlistRow key={item.id} item={item} onRemove={removeItem} />
        ))}

        {/* Honest error state — distinct from the "you haven't added anything"
            empty state below. Without this, a 500 from /api/watchlist looked
            identical to a brand-new account. */}
        {!loading && items.length === 0 && errored && (
          <div className="text-center py-16 px-4">
            <div className="text-3xl mb-2">📡</div>
            <h2 className="text-base font-bold text-tsua-text">לא ניתן לטעון את רשימת המעקב</h2>
            <p className="text-sm text-tsua-muted mt-1">נסה לרענן בעוד מספר רגעים</p>
            <button
              onClick={() => setRetry(r => r + 1)}
              className="mt-4 text-xs font-semibold px-4 py-2 rounded-lg text-tsua-text hover:text-tsua-accent transition-colors"
              style={{ background: 'rgb(var(--rgb-card) / 0.6)', border: '1px solid rgb(var(--rgb-border) / 0.7)' }}
            >
              🔄 נסה שוב
            </button>
          </div>
        )}

        {/* Empty (genuine) */}
        {!loading && items.length === 0 && !errored && <EmptyState />}
      </div>
    </div>
  );
}

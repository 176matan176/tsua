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
  const isUp = (live?.changePercent ?? 0) >= 0;
  const currencySymbol = item.exchange === 'TASE' || item.exchange === 'Tel Aviv Stock Exchange' ? '₪' : '$';

  async function handleRemove() {
    setRemoving(true);
    try {
      await fetch(`/api/watchlist/${item.ticker}`, { method: 'DELETE' });
      onRemove(item.ticker);
    } catch {
      setRemoving(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 transition-all hover:bg-white/2 group"
      style={{ borderBottom: '1px solid rgba(26,40,64,0.4)' }}
    >
      {/* Logo / Icon */}
      {item.logo ? (
        <img src={item.logo} alt={item.ticker} className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
          style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
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

      {/* Live price */}
      <div className="text-end shrink-0">
        {live ? (
          <>
            <div
              dir="ltr"
              className="font-bold font-mono text-sm transition-colors duration-300"
              style={{ color: live.flash === 'up' ? '#00e5b0' : live.flash === 'down' ? '#ff4d6a' : '#e8f0ff' }}
            >
              {currencySymbol}{live.price.toFixed(2)}
            </div>
            <div
              dir="ltr"
              className="text-xs font-semibold"
              style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
            >
              {isUp ? '▲' : '▼'} {Math.abs(live.changePercent).toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="space-y-1 animate-pulse">
            <div className="h-3 w-16 rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
            <div className="h-2.5 w-12 rounded ms-auto" style={{ background: 'rgba(26,40,64,0.4)' }} />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={handleRemove}
        disabled={removing}
        className="p-2 rounded-xl text-tsua-muted hover:text-red-400 hover:bg-red-500/8 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState() {
  const locale = useLocale();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.2)' }}
      >
        <BookmarkIcon className="w-8 h-8" style={{ color: '#00e5b0' }} />
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
        style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.25)' }}
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

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user]);

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
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
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
        style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.8)' }}
      >
        {/* Column headers */}
        {!loading && items.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase text-tsua-muted"
            style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}
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
                <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'rgba(26,40,64,0.5)' }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
                  <div className="h-2.5 w-32 rounded" style={{ background: 'rgba(26,40,64,0.35)' }} />
                </div>
                <div className="space-y-1.5 text-end">
                  <div className="h-3 w-16 rounded ms-auto" style={{ background: 'rgba(26,40,64,0.5)' }} />
                  <div className="h-2.5 w-12 rounded ms-auto" style={{ background: 'rgba(26,40,64,0.35)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {!loading && items.length > 0 && items.map(item => (
          <WatchlistRow key={item.id} item={item} onRemove={removeItem} />
        ))}

        {/* Empty */}
        {!loading && items.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

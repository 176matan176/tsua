'use client';

import { useEffect, useState } from 'react';
import { CircleStackIcon } from '@heroicons/react/24/outline';
import { useLivePrice } from '@/contexts/PriceContext';

interface RowView {
  symbol: string;   // display symbol
  label: string;
  icon: string;
  price: number | null;
  changePercent: number | null;
  decimals: number;
  flash?: 'up' | 'down' | null;
}

function AssetRow({ v, loading }: { v: RowView; loading: boolean }) {
  const isUp = (v.changePercent ?? 0) >= 0;
  const rowBg = v.flash === 'up'
    ? 'rgb(var(--rgb-accent) / 0.10)'
    : v.flash === 'down' ? 'rgb(var(--rgb-red) / 0.10)' : 'transparent';
  return (
    <div
      className="flex items-center justify-between px-4 py-3 hover:bg-white/2"
      style={{ background: rowBg, transition: 'background 1.5s ease-out' }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black shrink-0"
          style={{ background: 'rgb(var(--rgb-border) / 0.4)', color: 'var(--text2)' }}
          dir="ltr"
        >
          {v.icon}
        </span>
        <div>
          <div className="text-sm font-bold text-tsua-text">{v.label}</div>
          <div className="text-[10px] text-tsua-muted font-mono" dir="ltr">{v.symbol}</div>
        </div>
      </div>
      <div className="text-end">
        {v.price === null && loading ? (
          <div className="w-16 h-4 rounded animate-pulse breathe-shimmer" style={{ background: 'rgb(var(--rgb-border) / 0.6)' }} />
        ) : v.price === null ? (
          <span className="text-sm font-black font-mono text-tsua-muted" dir="ltr">—</span>
        ) : (
          <>
            <div
              className="text-sm font-black font-mono"
              dir="ltr"
              style={{
                color: v.flash === 'up' ? 'var(--accent)' : v.flash === 'down' ? 'var(--red)' : 'var(--text)',
                transition: 'color 0.3s ease-out',
              }}
            >
              ${v.price.toLocaleString('en-US', { minimumFractionDigits: v.decimals, maximumFractionDigits: v.decimals })}
            </div>
            {v.changePercent != null && (
              <div className="text-[11px] font-semibold" style={{ color: isUp ? 'var(--accent)' : 'var(--red)' }} dir="ltr">
                {isUp ? '▲' : '▼'} {Math.abs(v.changePercent).toFixed(2)}%
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Commodities are live through the shared PriceContext using Yahoo futures
// symbols (GC=F gold, CL=F WTI). Each row subscribes independently.
function CommodityRow({ ySymbol, display, label, icon, decimals }: {
  ySymbol: string; display: string; label: string; icon: string; decimals: number;
}) {
  const live = useLivePrice(ySymbol);
  return (
    <AssetRow
      loading={live === null}
      v={{
        symbol: display,
        label,
        icon,
        price: live?.price ?? null,
        changePercent: live?.changePercent ?? null,
        decimals,
        flash: live?.flash ?? null,
      }}
    />
  );
}

const CRYPTO = [
  { id: 'bitcoin',  symbol: 'BTC', label: 'ביטקוין',  icon: '₿' },
  { id: 'ethereum', symbol: 'ETH', label: 'את׳ריום', icon: 'Ξ' },
];

const REFRESH_MS = 60 * 1000;

export function CryptoCommodities() {
  const [crypto, setCrypto] = useState<Record<string, { price: number | null; changePercent: number | null }>>({});
  const [loadingCrypto, setLoadingCrypto] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      try {
        const r = await fetch('/api/crypto', { signal: ctrl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const d = await r.json();
        if (ctrl.signal.aborted) return;
        if (Array.isArray(d.coins)) {
          const map: Record<string, { price: number | null; changePercent: number | null }> = {};
          for (const c of d.coins) {
            map[c.id] = { price: c.price ?? null, changePercent: c.changePercent24h ?? null };
          }
          setCrypto(map);
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        // keep prior values on a transient failure
      } finally {
        if (!ctrl.signal.aborted) setLoadingCrypto(false);
      }
    }
    load();
    const int = setInterval(load, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      ctrl.abort();
      clearInterval(int);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--rgb-bg2) / 0.8)', border: '1px solid rgb(var(--rgb-border) / 0.8)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)' }}>
        <h3 className="text-sm font-semibold text-tsua-text tracking-tight flex items-center gap-2">
          <CircleStackIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.75} aria-hidden="true" />
          קריפטו וסחורות
        </h3>
        <span className="text-[10px] text-tsua-muted">נכסים אלטרנטיביים</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'rgb(var(--rgb-border) / 0.35)' }}>
        {CRYPTO.map((c) => (
          <AssetRow
            key={c.id}
            loading={loadingCrypto}
            v={{
              symbol: c.symbol,
              label: c.label,
              icon: c.icon,
              price: crypto[c.id]?.price ?? null,
              changePercent: crypto[c.id]?.changePercent ?? null,
              decimals: 0,
            }}
          />
        ))}
        <CommodityRow ySymbol="GC=F" display="XAU" label="זהב" icon="🥇" decimals={2} />
        <CommodityRow ySymbol="CL=F" display="WTI" label="נפט WTI" icon="🛢️" decimals={2} />
      </div>

      <div className="px-4 py-2" style={{ borderTop: '1px solid rgb(var(--rgb-border) / 0.4)' }}>
        <p className="text-[9px] text-tsua-muted text-center">
          בזמן אמת · קריפטו: CoinGecko · סחורות: חוזים עתידיים
        </p>
      </div>
    </div>
  );
}

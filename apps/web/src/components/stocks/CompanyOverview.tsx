'use client';

import { useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface CompanyOverviewProps {
  ticker: string;
  name: string;
  industry: string | null;
  sector: string | null;
  employees: number | null;
  ipo: string | null;
  weburl: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  logo: string | null;
}

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸', IL: '🇮🇱', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
  JP: '🇯🇵', CN: '🇨🇳', CA: '🇨🇦', AU: '🇦🇺', CH: '🇨🇭',
};

export function CompanyOverview({
  ticker, name, industry, sector, employees,
  ipo, weburl, country, exchange, currency, logo,
}: CompanyOverviewProps) {
  const flag = country ? (COUNTRY_FLAG[country.toUpperCase()] ?? '🌍') : '';
  const currencySymbol = currency === 'ILS' ? '₪' : '$';

  const items = [
    {
      label: 'תעשייה',
      value: industry,
      icon: '🏭',
    },
    {
      label: 'ענף',
      value: sector,
      icon: '📂',
    },
    {
      label: 'עובדים',
      value: employees ? employees.toLocaleString() : null,
      icon: '👥',
    },
    {
      label: 'IPO',
      value: ipo ? new Date(ipo).getFullYear().toString() : null,
      icon: '📅',
    },
    {
      label: 'מדינה',
      value: country ? `${flag} ${country}` : null,
      icon: null,
    },
    {
      label: 'בורסה',
      value: exchange || (currency === 'ILS' ? 'TASE' : null),
      icon: '🏛️',
    },
  ].filter(i => i.value);

  if (!items.length && !weburl) return null;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-tsua-text">
          {'🏢 על החברה'}
        </h3>
        {weburl && (
          <a
            href={weburl.startsWith('http') ? weburl : `https://${weburl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-tsua-muted hover:text-tsua-accent transition-colors"
          >
            {'אתר רשמי'}
            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Company identity */}
      <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid var(--border2)' }}>
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="w-12 h-12 rounded-xl object-contain bg-white p-1 shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
            style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
          >
            {ticker.slice(0, 2)}
          </div>
        )}
        <div>
          <div className="font-bold text-tsua-text text-sm">{name}</div>
          <div className="text-xs text-tsua-muted mt-0.5 font-mono">${ticker} · {currency}</div>
        </div>
      </div>

      {/* Grid of facts */}
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl px-3 py-2.5"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)' }}
          >
            <div className="text-[10px] text-tsua-muted mb-1 uppercase tracking-wider font-bold">
              {item.icon && <span className="me-1">{item.icon}</span>}
              {item.label}
            </div>
            <div className="text-sm font-semibold text-tsua-text truncate" dir="ltr">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

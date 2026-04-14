'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { he } from 'date-fns/locale';

type ReportType = 'all' | 'quarterly' | 'annual' | 'immediate' | 'dividend' | 'insider';
type Exchange = 'all' | 'tase' | 'us';

interface Report {
  id: string;
  company: string;
  ticker: string;
  exchange: 'TASE' | 'NASDAQ' | 'NYSE';
  type: ReportType;
  titleHe: string;
  titleEn: string;
  publishedAt: Date;
  url: string;
  isNew?: boolean;
  value?: string; // e.g. "₪0.45 per share" for dividends
}

const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    company: 'טבע',
    ticker: 'TEVA',
    exchange: 'TASE',
    type: 'quarterly',
    titleHe: 'דוח רבעוני Q2 2024 — תוצאות כספיות',
    titleEn: 'Q2 2024 Quarterly Report — Financial Results',
    publishedAt: new Date(Date.now() - 1000 * 60 * 45),
    url: '#',
    isNew: true,
  },
  {
    id: '2',
    company: 'לאומי',
    ticker: 'LUMI',
    exchange: 'TASE',
    type: 'dividend',
    titleHe: 'הכרזה על חלוקת דיבידנד — ₪0.52 למניה',
    titleEn: 'Dividend Declaration — ₪0.52 per share',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120),
    url: '#',
    isNew: true,
    value: '₪0.52',
  },
  {
    id: '3',
    company: 'נייס',
    ticker: 'NICE',
    exchange: 'NASDAQ',
    type: 'immediate',
    titleHe: 'דיווח מיידי: הסכם עם AWS בשווי 200 מיליון דולר',
    titleEn: 'Immediate Report: AWS Agreement Worth $200M',
    publishedAt: new Date(Date.now() - 1000 * 60 * 200),
    url: '#',
    isNew: true,
  },
  {
    id: '4',
    company: 'צ\'קפוינט',
    ticker: 'CHKP',
    exchange: 'NASDAQ',
    type: 'quarterly',
    titleHe: 'דוח רבעוני Q2 2024 — הכנסות 627 מ\' דולר',
    titleEn: 'Q2 2024 Quarterly Report — Revenue $627M',
    publishedAt: new Date(Date.now() - 1000 * 60 * 360),
    url: '#',
  },
  {
    id: '5',
    company: 'בנק הפועלים',
    ticker: 'POLI',
    exchange: 'TASE',
    type: 'insider',
    titleHe: 'דיווח בעל עניין: רכישת 50,000 מניות ע"י הדירקטוריון',
    titleEn: 'Insider Report: Board Purchase of 50,000 Shares',
    publishedAt: new Date(Date.now() - 1000 * 60 * 480),
    url: '#',
  },
  {
    id: '6',
    company: 'אינטל',
    ticker: 'INTC',
    exchange: 'NASDAQ',
    type: 'annual',
    titleHe: 'דוח שנתי 2023 — 10-K',
    titleEn: 'Annual Report 2023 — 10-K',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    url: '#',
  },
  {
    id: '7',
    company: 'מלאנוקס',
    ticker: 'MLNX',
    exchange: 'TASE',
    type: 'dividend',
    titleHe: 'חלוקת דיבידנד מיוחד — ₪1.20 למניה',
    titleEn: 'Special Dividend — ₪1.20 per share',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    url: '#',
    value: '₪1.20',
  },
  {
    id: '8',
    company: 'גיליאד',
    ticker: 'GILD',
    exchange: 'NASDAQ',
    type: 'immediate',
    titleHe: 'דיווח מיידי: אישור FDA לתרופה חדשה',
    titleEn: 'Immediate Report: FDA Approval for New Drug',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    url: '#',
  },
];

const TYPE_FILTERS: { key: ReportType; labelHe: string; labelEn: string; color: string }[] = [
  { key: 'all', labelHe: 'הכל', labelEn: 'All', color: '' },
  { key: 'quarterly', labelHe: 'רבעוני', labelEn: 'Quarterly', color: 'text-blue-400' },
  { key: 'annual', labelHe: 'שנתי', labelEn: 'Annual', color: 'text-purple-400' },
  { key: 'immediate', labelHe: 'מיידי', labelEn: 'Immediate', color: 'text-orange-400' },
  { key: 'dividend', labelHe: 'דיבידנד', labelEn: 'Dividend', color: 'text-tsua-green' },
  { key: 'insider', labelHe: 'בעל עניין', labelEn: 'Insider', color: 'text-yellow-400' },
];

const TYPE_BADGE: Record<ReportType, { labelHe: string; labelEn: string; className: string }> = {
  all: { labelHe: '', labelEn: '', className: '' },
  quarterly: { labelHe: 'רבעוני', labelEn: 'Q', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  annual: { labelHe: 'שנתי', labelEn: 'Annual', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  immediate: { labelHe: 'מיידי', labelEn: 'Immediate', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  dividend: { labelHe: 'דיבידנד', labelEn: 'Dividend', className: 'bg-tsua-green/10 text-tsua-green border-tsua-green/30' },
  insider: { labelHe: 'בעל עניין', labelEn: 'Insider', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
};

export function ReportsPage() {
  const [typeFilter, setTypeFilter] = useState<ReportType>('all');
  const [exchangeFilter, setExchangeFilter] = useState<Exchange>('all');
  const [search, setSearch] = useState('');

  const filtered = MOCK_REPORTS.filter((r) => {
    const typeMatch = typeFilter === 'all' || r.type === typeFilter;
    const exchMatch = exchangeFilter === 'all' || r.exchange.toLowerCase() === exchangeFilter;
    const searchMatch = !search || r.ticker.toLowerCase().includes(search.toLowerCase()) || r.company.includes(search);
    return typeMatch && exchMatch && searchMatch;
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-tsua-text">
          {'📋 דיווחים ופרסומים'}
        </h1>
        <span className="text-xs text-tsua-muted bg-tsua-card border border-tsua-border px-2 py-1 rounded-lg">
          {'מאיה + SEC + EDGAR'}
        </span>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={'חיפוש לפי מניה או חברה...'}
        className="w-full bg-tsua-card border border-tsua-border rounded-xl px-4 py-2.5 text-sm text-tsua-text placeholder-tsua-muted focus:outline-none focus:border-tsua-green/50 transition-colors"
        dir="rtl"
      />

      {/* Exchange filter */}
      <div className="flex gap-2">
        {(['all', 'tase', 'us'] as Exchange[]).map((ex) => (
          <button
            key={ex}
            onClick={() => setExchangeFilter(ex)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              exchangeFilter === ex
                ? 'bg-tsua-green text-tsua-bg'
                : 'bg-tsua-card border border-tsua-border text-tsua-muted hover:text-tsua-text'
            }`}
          >
            {ex === 'all' ? 'הכל' : ex === 'tase' ? 'ת"א' : '🇺🇸 US'}
          </button>
        ))}
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_FILTERS.map(({ key, labelHe, labelEn, color }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              typeFilter === key
                ? `bg-tsua-card border border-tsua-green/50 ${color || 'text-tsua-green'}`
                : `text-tsua-muted hover:text-tsua-text ${color}`
            }`}
          >
            {labelHe}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="space-y-2">
        {filtered.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-tsua-muted">
            <p className="text-4xl mb-3">📂</p>
            <p>{'לא נמצאו דיווחים'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const badge = TYPE_BADGE[report.type];
  const timeAgo = formatDistanceToNow(report.publishedAt, {
    addSuffix: true,
    locale: he,
  });
  const dateStr = format(report.publishedAt, 'dd/MM/yyyy HH:mm');

  return (
    <a
      href={report.url}
      className="flex items-center gap-3 bg-tsua-card border border-tsua-border rounded-xl px-4 py-3 hover:border-tsua-green/40 transition-all group"
    >
      {/* Ticker */}
      <div className="text-center shrink-0 w-14">
        <div className="text-xs font-bold text-tsua-text font-mono">{report.ticker}</div>
        <div className="text-[10px] text-tsua-muted">{report.exchange}</div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-tsua-border shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {report.isNew && (
            <span className="text-[10px] bg-tsua-green text-tsua-bg px-1.5 py-0.5 rounded font-bold">
              {'חדש'}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
            {badge.labelHe}
          </span>
          {report.value && (
            <span className="text-[10px] text-tsua-green font-bold">{report.value}</span>
          )}
        </div>
        <p className="text-sm text-tsua-text group-hover:text-tsua-green transition-colors truncate">
          {report.titleHe}
        </p>
        <p className="text-[11px] text-tsua-muted mt-0.5">{report.company} · {timeAgo}</p>
      </div>

      {/* Arrow */}
      <div className="text-tsua-muted group-hover:text-tsua-green transition-colors text-sm">
        {'←'}
      </div>
    </a>
  );
}

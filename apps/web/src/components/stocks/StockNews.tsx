'use client';

import { useLocale } from 'next-intl';
import { useState, useEffect } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  datetime: number;
  category: string;
}

function NewsCard({ article }: { article: NewsArticle }) {
  const locale = useLocale();
  const dateLocale = locale === 'he' ? he : enUS;
  const timeAgo = formatDistanceToNow(new Date(article.datetime), { addSuffix: true, locale: dateLocale });

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 p-3 rounded-xl transition-all hover:bg-white/3"
      style={{ borderBottom: '1px solid var(--border2)' }}
    >
      {/* Image */}
      {article.image && (
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-tsua-card">
          <img
            src={article.image}
            alt={article.headline}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Source + time */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase"
            style={{ background: 'rgba(0,229,176,0.08)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.15)' }}
          >
            {article.source}
          </span>
          <span className="text-[10px] text-tsua-muted">{timeAgo}</span>
        </div>

        {/* Headline */}
        <h4 className="text-sm font-semibold text-tsua-text leading-snug line-clamp-2 group-hover:text-tsua-accent transition-colors">
          {article.headline}
        </h4>
      </div>

      <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-tsua-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
    </a>
  );
}

function SkeletonNews() {
  return (
    <div className="space-y-3 animate-pulse px-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex gap-3 p-3">
          <div className="w-16 h-16 rounded-lg shrink-0" style={{ background: 'var(--border)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
            <div className="h-3 w-full rounded" style={{ background: 'var(--border2)' }} />
            <div className="h-3 w-3/4 rounded" style={{ background: 'var(--border2)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StockNews({ ticker }: { ticker: string }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/${ticker}/news`)
      .then(r => r.json())
      .then(data => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [ticker]);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border2)' }}>
        <h3 className="text-sm font-bold text-tsua-text">
          {'📰 חדשות אחרונות'}
        </h3>
      </div>

      <div className="py-1">
        {loading && <SkeletonNews />}

        {!loading && news.length === 0 && (
          <div className="text-center py-8 text-tsua-muted text-sm">
            {'אין חדשות זמינות כרגע'}
          </div>
        )}

        {!loading && news.map(article => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

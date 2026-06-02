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

// Articles older than this are dimmed + flagged. The freshness signal
// matters on a trading platform — a 3-day-old "breaking" headline is
// misleading, especially after a weekend.
const STALE_ARTICLE_MS = 24 * 60 * 60 * 1000;

function NewsCard({ article }: { article: NewsArticle }) {
  const locale = useLocale();
  const dateLocale = locale === 'he' ? he : enUS;
  const timeAgo = formatDistanceToNow(new Date(article.datetime), { addSuffix: true, locale: dateLocale });
  const isStale = Date.now() - article.datetime > STALE_ARTICLE_MS;

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
          <span
            className="text-[10px] flex items-center gap-1"
            style={{ color: isStale ? '#ffd166' : 'var(--muted)' }}
            title={isStale ? `הכתבה מ-${new Date(article.datetime).toLocaleString('he-IL')}` : undefined}
          >
            {isStale && <span>⚠️</span>}
            {timeAgo}
          </span>
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

// Discriminated union so "empty array because API failed" and "empty array
// because the ticker genuinely has no recent news" can render different copy.
type NewsState =
  | { status: 'loading' }
  | { status: 'ok'; news: NewsArticle[] }
  | { status: 'error' };

export function StockNews({ ticker }: { ticker: string }) {
  const [state, setState] = useState<NewsState>({ status: 'loading' });
  // Retry button increments this; useEffect re-runs.
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });

    fetch(`/api/stocks/${ticker}/news`, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (ctrl.signal.aborted) return;
        // Server now returns { error } on upstream failure; only set ok when
        // we actually got an array.
        if (Array.isArray(data)) {
          setState({ status: 'ok', news: data });
        } else {
          setState({ status: 'error' });
        }
      })
      .catch((err) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setState({ status: 'error' });
      });

    return () => ctrl.abort();
  }, [ticker, retry]);

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
        {state.status === 'loading' && <SkeletonNews />}

        {state.status === 'error' && (
          <div className="text-center py-8">
            <div className="text-2xl mb-1">📡</div>
            <div className="text-sm text-tsua-muted">לא ניתן לטעון חדשות כעת</div>
            <button
              onClick={() => setRetry(r => r + 1)}
              className="mt-3 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-tsua-text hover:text-tsua-accent transition-colors"
              style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.7)' }}
            >
              🔄 נסה שוב
            </button>
          </div>
        )}

        {state.status === 'ok' && state.news.length === 0 && (
          <div className="text-center py-8 text-tsua-muted text-sm">
            {'אין חדשות זמינות כרגע'}
          </div>
        )}

        {state.status === 'ok' && state.news.map(article => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

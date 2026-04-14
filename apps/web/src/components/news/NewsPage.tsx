'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

type NewsSource = 'all' | 'themarker' | 'calcalist' | 'globes' | 'reuters';
type NewsCategory = 'all' | 'tase' | 'us' | 'macro' | 'crypto' | 'real-estate';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceIcon: string;
  category: NewsCategory;
  ticker?: string;
  imageUrl?: string;
  url: string;
  publishedAt: Date;
  isBreaking?: boolean;
}

// Shape returned by the API
interface ApiArticle {
  id: string;
  source: string | null;
  titleHe: string | null;
  titleEn: string | null;
  summaryHe: string | null;
  summaryEn: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  lang: string | null;
  stockTags: { stock: { ticker: string; nameEn: string; nameHe: string } }[];
}

function sourceToIcon(source: string | null): string {
  if (!source) return '??';
  const s = source.toLowerCase();
  if (s.includes('themarker') || s === 'themarker') return 'TM';
  if (s.includes('calcalist')) return 'CA';
  if (s.includes('globes')) return 'GL';
  if (s.includes('reuters')) return 'RE';
  // Finnhub fallback sources
  return source.slice(0, 2).toUpperCase();
}

function mapApiArticle(a: ApiArticle): NewsArticle {
  const title = a.titleHe || a.titleEn || '(ללא כותרת)';
  const summary = a.summaryHe || a.summaryEn || '';
  const source = a.source ?? 'Unknown';
  const sourceIcon = sourceToIcon(a.source);
  const ticker = a.stockTags?.[0]?.stock?.ticker ?? undefined;
  return {
    id: a.id,
    title,
    summary,
    source,
    sourceIcon,
    category: 'all' as NewsCategory,
    ticker,
    imageUrl: a.imageUrl ?? undefined,
    url: a.url,
    publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
  };
}

const SOURCE_FILTERS: { key: NewsSource; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'themarker', label: 'TheMarker' },
  { key: 'calcalist', label: 'כלכליסט' },
  { key: 'globes', label: 'גלובס' },
  { key: 'reuters', label: 'Reuters' },
];

const CATEGORY_FILTERS: { key: NewsCategory; labelHe: string; labelEn: string }[] = [
  { key: 'all', labelHe: 'הכל', labelEn: 'All' },
  { key: 'tase', labelHe: 'ת"א', labelEn: 'TASE' },
  { key: 'us', labelHe: 'ארה"ב', labelEn: 'US' },
  { key: 'macro', labelHe: 'מאקרו', labelEn: 'Macro' },
  { key: 'real-estate', labelHe: 'נדל"ן', labelEn: 'Real Estate' },
  { key: 'crypto', labelHe: 'קריפטו', labelEn: 'Crypto' },
];

const SOURCE_COLORS: Record<string, string> = {
  TM: 'bg-blue-600',
  CA: 'bg-orange-600',
  GL: 'bg-purple-600',
  RE: 'bg-red-600',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://tsua-api-production.up.railway.app';

export function NewsPage() {
  const [source, setSource] = useState<NewsSource>('all');
  const [category, setCategory] = useState<NewsCategory>('all');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams({ lang: 'he', page: String(pageNum) });
      const res = await fetch(`${API_BASE}/api/v1/news?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { articles: ApiArticle[]; page: number; hasMore: boolean };

      const mapped = data.articles.map(mapApiArticle);
      setArticles(prev => replace ? mapped : [...prev, ...mapped]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError('שגיאה בטעינת חדשות');
      console.error('[NewsPage] fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Refetch when source/category filter changes (reset to page 1)
  useEffect(() => {
    fetchNews(1, true);
  }, [fetchNews]);

  const filtered = articles.filter((n) => {
    const sourceMatch =
      source === 'all' ||
      n.source.toLowerCase().replace(/\s/g, '') === source ||
      sourceToIcon(n.source).toLowerCase() === source.slice(0, 2).toLowerCase();
    const catMatch = category === 'all' || n.category === category;
    return sourceMatch && catMatch;
  });

  const breaking = filtered.filter((n) => n.isBreaking);
  const regular = filtered.filter((n) => !n.isBreaking);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-tsua-text">
          {'📰 חדשות שוק'}
        </h1>
        <span className="text-xs text-tsua-muted">
          {'מתעדכן בזמן אמת'}
          <span className="inline-block w-2 h-2 bg-tsua-green rounded-full mx-1 animate-pulse" />
        </span>
      </div>

      {/* Source filter */}
      <div className="flex gap-2 flex-wrap">
        {SOURCE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSource(key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              source === key
                ? 'bg-tsua-green text-tsua-bg'
                : 'bg-tsua-card border border-tsua-border text-tsua-muted hover:text-tsua-text hover:border-tsua-green/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORY_FILTERS.map(({ key, labelHe }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              category === key
                ? 'bg-tsua-blue/20 text-blue-400 border border-blue-500/40'
                : 'text-tsua-muted hover:text-tsua-text'
            }`}
          >
            {labelHe}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-12 text-tsua-muted">
          <p className="text-4xl mb-3">⚠️</p>
          <p>{error}</p>
          <button
            onClick={() => fetchNews(1, true)}
            className="mt-4 text-xs px-4 py-2 bg-tsua-card border border-tsua-border rounded-full hover:border-tsua-green/40 transition-colors"
          >
            {'נסה שוב'}
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Breaking news */}
          {breaking.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded animate-pulse">
                  {'בשידור חי'}
                </span>
              </div>
              {breaking.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          )}

          {/* Regular news */}
          <div className="space-y-3">
            {regular.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-tsua-muted">
                <p className="text-4xl mb-3">📭</p>
                <p>{'אין חדשות כרגע — נסה שוב בעוד מספר דקות'}</p>
              </div>
            )}
          </div>

          {/* Load more */}
          {hasMore && filtered.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchNews(page + 1, false)}
                disabled={loadingMore}
                className="text-xs px-6 py-2 bg-tsua-card border border-tsua-border rounded-full text-tsua-muted hover:text-tsua-text hover:border-tsua-green/40 transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'טוען...' : 'טען עוד חדשות'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-tsua-card border border-tsua-border rounded-2xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-tsua-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-3 w-16 rounded bg-tsua-border" />
            <div className="h-3 w-12 rounded bg-tsua-border" />
          </div>
          <div className="h-4 w-3/4 rounded bg-tsua-border" />
          <div className="h-3 w-full rounded bg-tsua-border" />
          <div className="h-3 w-2/3 rounded bg-tsua-border" />
        </div>
      </div>
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  const timeAgo = formatDistanceToNow(article.publishedAt, {
    addSuffix: true,
    locale: he,
  });

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-tsua-card border border-tsua-border rounded-2xl p-4 hover:border-tsua-green/40 transition-all hover:bg-tsua-card/80 group"
    >
      <div className="flex gap-3">
        {/* Source badge */}
        <div className={`w-9 h-9 rounded-xl ${SOURCE_COLORS[article.sourceIcon] || 'bg-tsua-border'} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {article.sourceIcon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs text-tsua-muted">{article.source}</span>
            {article.ticker && (
              <span className="text-xs bg-tsua-green/10 text-tsua-green px-2 py-0.5 rounded-md font-mono">
                ${article.ticker}
              </span>
            )}
            <span className="text-xs text-tsua-muted">{timeAgo}</span>
          </div>

          <h3 className="text-sm font-semibold text-tsua-text leading-snug mb-1 group-hover:text-tsua-green transition-colors">
            {article.title}
          </h3>

          <p className="text-xs text-tsua-muted leading-relaxed line-clamp-2">
            {article.summary}
          </p>
        </div>
      </div>
    </a>
  );
}

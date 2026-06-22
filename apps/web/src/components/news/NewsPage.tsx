'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

type NewsSource = 'all' | 'themarker' | 'calcalist' | 'globes' | 'bizportal' | 'ynet';
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

/**
 * Map a Google News source label to our canonical outlet key + Hebrew name +
 * brand color. The key drives the colored accent bar; the Hebrew name is
 * what the user reads — much friendlier than 2-letter initials.
 */
interface SourceMeta {
  key: string;        // canonical short id used for color/styling
  nameHe: string;     // Hebrew display name
  color: string;      // brand accent (HEX) for left-border + tint
}

function classifySource(source: string | null): SourceMeta {
  const s = (source ?? '').toLowerCase();
  if (s.includes('themarker') || s.includes('דה') && s.includes('מארקר') || s.includes('הארץ')) {
    return { key: 'themarker', nameHe: 'TheMarker', color: '#d52b1e' };
  }
  if (s.includes('calcalist') || s.includes('כלכליסט')) {
    return { key: 'calcalist', nameHe: 'כלכליסט', color: '#ff8c00' };
  }
  if (s.includes('globes') || s.includes('גלובס')) {
    return { key: 'globes', nameHe: 'גלובס', color: '#7a3eb2' };
  }
  if (s.includes('bizportal') || s.includes('ביזפורטל')) {
    return { key: 'bizportal', nameHe: 'ביזפורטל', color: '#0099cc' };
  }
  if (s.includes('ynet')) {
    return { key: 'ynet', nameHe: 'Ynet כלכלה', color: '#e63946' };
  }
  if (s.includes('מעריב') || s.includes('maariv')) {
    return { key: 'maariv', nameHe: 'מעריב', color: '#003f87' };
  }
  if (s.includes('reuters')) {
    return { key: 'reuters', nameHe: 'Reuters', color: '#ff8000' };
  }
  if (s.includes('investing')) {
    return { key: 'investing', nameHe: 'Investing.com', color: '#0066b2' };
  }
  if (s.includes('bitcoin') || s.includes('ביטקוין')) {
    return { key: 'bitcoin', nameHe: source ?? 'קריפטו', color: '#f7931a' };
  }
  // Long-tail: keep the original name, neutral color.
  return { key: 'other', nameHe: source ?? 'מקור לא ידוע', color: '#5a7090' };
}

function sourceToIcon(source: string | null): string {
  return classifySource(source).key;
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
  { key: 'bizportal', label: 'ביזפורטל' },
  { key: 'ynet', label: 'Ynet' },
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

// Use our internal /api/news route which aggregates from Israeli outlets
// via Google News RSS (TheMarker, Calcalist, Globes, BizPortal, etc.).
// Switched off the external Railway API which wasn't returning Israeli sources.
const NEWS_ENDPOINT = '/api/news';

export function NewsPage() {
  const [source, setSource] = useState<NewsSource>('all');
  const [category, setCategory] = useState<NewsCategory>('all');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef to thread the latest AbortController through the callback so
  // rapid filter taps (category, source) cancel in-flight requests instead
  // of racing each other into setArticles.
  const inFlightRef = useRef<AbortController | null>(null);

  const fetchNews = useCallback(async (pageNum: number, replace: boolean, cat: NewsCategory, src: NewsSource) => {
    inFlightRef.current?.abort();
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;

    try {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams({
        category: cat,
        source: src,
        page: String(pageNum),
      });
      const res = await fetch(`${NEWS_ENDPOINT}?${params}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { articles: ApiArticle[]; page: number; hasMore: boolean };
      if (ctrl.signal.aborted) return;

      const mapped = data.articles.map(mapApiArticle);
      setArticles(prev => replace ? mapped : [...prev, ...mapped]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setError('שגיאה בטעינת חדשות');
      console.error('[NewsPage] fetch error:', err);
    } finally {
      if (!ctrl.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // Refetch when source/category filter changes (reset to page 1). Server-side
  // filtering means we don't need a separate post-filter on `articles`.
  useEffect(() => {
    fetchNews(1, true, category, source);
  }, [fetchNews, category, source]);

  // Auto-refresh every 3 minutes — Israeli economic news moves throughout
  // the day, especially during TASE trading hours. Plus an immediate refresh
  // when the tab comes back to focus.
  useEffect(() => {
    const interval = setInterval(() => fetchNews(1, true, category, source), 3 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') fetchNews(1, true, category, source); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchNews, category, source]);

  // Server already filtered by category+source, so just split into
  // breaking/regular. We don't have isBreaking from Google News yet —
  // future enhancement could derive it from publishedAt < 30 min ago.
  const breaking = articles.filter((n) => n.isBreaking);
  const regular = articles.filter((n) => !n.isBreaking);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-black text-tsua-text leading-tight">
            חדשות שוק ההון
          </h1>
          <p className="text-xs text-tsua-muted mt-0.5">
            מאוגד מ-TheMarker, כלכליסט, גלובס, ביזפורטל, Ynet ועוד
          </p>
        </div>
        <span className="text-[11px] text-tsua-muted flex items-center gap-1.5" style={{ background: 'rgba(0,229,176,0.06)', border: '1px solid rgba(0,229,176,0.18)', padding: '4px 10px', borderRadius: '999px' }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e5b0' }} />
          חי
        </span>
      </div>

      {/* Categories — primary filter, large pills */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.map(({ key, labelHe }) => {
          const active = category === key;
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className="text-xs font-bold transition-all"
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                background: active ? '#00e5b0' : 'rgba(15,25,41,0.6)',
                color: active ? '#080d1a' : '#9ab1cc',
                border: active ? '1px solid transparent' : '1px solid rgba(26,40,64,0.7)',
              }}
            >
              {labelHe}
            </button>
          );
        })}
      </div>

      {/* Sources — secondary filter, smaller pills with brand color hint */}
      <div className="flex gap-1.5 flex-wrap items-center" style={{ marginTop: '-8px' }}>
        <span className="text-[10px] text-tsua-muted">מקור:</span>
        {SOURCE_FILTERS.map(({ key, label }) => {
          const active = source === key;
          const meta = key !== 'all' ? classifySource(label) : null;
          return (
            <button
              key={key}
              onClick={() => setSource(key)}
              className="text-[11px] font-semibold transition-all"
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background: active && meta ? `${meta.color}22` : (active ? 'rgba(0,229,176,0.12)' : 'transparent'),
                color: active && meta ? meta.color : (active ? '#00e5b0' : '#5a7090'),
                border: `1px solid ${active && meta ? `${meta.color}55` : (active ? 'rgba(0,229,176,0.3)' : 'rgba(26,40,64,0.6)')}`,
              }}
            >
              {label}
            </button>
          );
        })}
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
            onClick={() => fetchNews(1, true, category, source)}
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
            {articles.length === 0 && (
              <div className="text-center py-12 text-tsua-muted">
                <p className="text-4xl mb-3">📭</p>
                <p>{'אין חדשות כרגע — נסה שוב בעוד מספר דקות'}</p>
              </div>
            )}
          </div>

          {/* Load more */}
          {hasMore && articles.length > 0 && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchNews(page + 1, false, category, source)}
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

// More than 24h old gets ⚠️ on a financial news feed — stocks move fast,
// stale headlines are worse than no headlines.
const STALE_ARTICLE_MS = 24 * 60 * 60 * 1000;

function NewsCard({ article }: { article: NewsArticle }) {
  const meta = classifySource(article.source);
  const timeAgo = formatDistanceToNow(article.publishedAt, {
    addSuffix: true,
    locale: he,
  });
  const isStale = Date.now() - article.publishedAt.getTime() > STALE_ARTICLE_MS;

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group transition-all hover:translate-x-[-2px]"
      style={{
        background: 'rgba(15,25,41,0.7)',
        border: '1px solid rgba(26,40,64,0.7)',
        borderInlineStartWidth: '3px',
        borderInlineStartColor: meta.color,
        borderRadius: '14px',
        padding: '14px 16px',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Outlet badge — Hebrew brand name on a brand-tinted pill, not a
            cryptic 2-letter monogram. Source identity is half the trust signal
            on a financial news feed. */}
        <div className="flex flex-col items-start gap-1 shrink-0" style={{ minWidth: '88px' }}>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-md"
            style={{
              background: `${meta.color}22`,
              color: meta.color,
              border: `1px solid ${meta.color}55`,
            }}
          >
            {meta.nameHe}
          </span>
          <span
            className="text-[10px] flex items-center gap-1"
            style={{ color: isStale ? '#ffd166' : 'rgba(154,177,204,0.7)' }}
            title={isStale ? `הכתבה מ-${article.publishedAt.toLocaleString('he-IL')}` : undefined}
          >
            {isStale && <span>⚠️</span>}
            {timeAgo}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="text-[14px] font-bold leading-snug text-tsua-text group-hover:text-tsua-accent transition-colors"
            style={{ marginBottom: article.summary ? '4px' : 0 }}
          >
            {article.title}
            {article.ticker && (
              <span
                className="text-[11px] mx-1.5 px-1.5 py-0.5 rounded font-mono align-middle"
                style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0' }}
                dir="ltr"
              >
                ${article.ticker}
              </span>
            )}
          </h3>

          {article.summary && (
            <p className="text-[12px] leading-relaxed line-clamp-2 text-tsua-muted">
              {article.summary}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

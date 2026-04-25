'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PostCard } from './PostCard';
import type { Post } from '@/types/shared';

// Mock fallback posts (shown when DB is empty / not set up yet)
const MOCK_POSTS: Post[] = [
  {
    id: 'mock-1',
    author: { id: 'u1', username: 'trader_il', displayName: 'משה כהן', isVerified: true },
    body: '$TEVA שוברת שיאים חדשים! הרווחים הרבעוניים הפתיעו לטובה 🚀',
    lang: 'he', sentiment: 'bullish', imageUrls: [],
    likeCount: 47, replyCount: 12, repostCount: 8,
    stockMentions: [{ ticker: 'TEVA', nameEn: 'Teva', nameHe: 'טבע', exchange: 'NYSE' }],
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'mock-2',
    author: { id: 'u2', username: 'wallst_watcher', displayName: 'David Levi', isVerified: false },
    body: '$NVDA looking incredibly strong. AI infrastructure buildout is just getting started. Adding to my position.',
    lang: 'en', sentiment: 'bullish', imageUrls: [],
    likeCount: 83, replyCount: 29, repostCount: 15,
    stockMentions: [{ ticker: 'NVDA', nameEn: 'NVIDIA', nameHe: 'אנבידיה', exchange: 'NASDAQ' }],
    createdAt: new Date(Date.now() - 1000 * 60 * 31).toISOString(),
  },
  {
    id: 'mock-3',
    author: { id: 'u3', username: 'tase_analyst', displayName: 'רחל מזרחי', isVerified: true },
    body: 'מדד ת"א 35 סגר בירידה על רקע אי הוודאות הגיאופוליטית. $NICE ו-$LUMI ספגו את עיקר הנטל.',
    lang: 'he', sentiment: 'bearish', imageUrls: [],
    likeCount: 34, replyCount: 18, repostCount: 5,
    stockMentions: [
      { ticker: 'NICE', nameEn: 'NICE Systems', nameHe: 'ניס', exchange: 'NASDAQ' },
      { ticker: 'LUMI', nameEn: 'Bank Leumi', nameHe: 'לאומי', exchange: 'TASE' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
  {
    id: 'mock-4',
    author: { id: 'u4', username: 'options_pro', displayName: 'נועה שפירא', isVerified: true },
    body: '$CHKP עם תוצאות שוות! הסייבר ממשיך לגדול וה-FCF חזק. לדעתי זה עדיין זול ביחס לסקטור. מחזיקה 💪',
    lang: 'he', sentiment: 'bullish', imageUrls: [],
    likeCount: 55, replyCount: 14, repostCount: 7,
    stockMentions: [{ ticker: 'CHKP', nameEn: 'Check Point', nameHe: 'צ\'ק פוינט', exchange: 'NASDAQ' }],
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

interface FeedStreamProps {
  ticker?: string;
  onPostsLoaded?: (count: number) => void;
  /** Show the sentiment/language filter bar above the feed. Default: true on home, false on stock pages */
  showFilters?: boolean;
}

type SentimentFilter = 'all' | 'bullish' | 'bearish' | 'neutral';
type LangFilter = 'all' | 'he' | 'en';

// Filter chip — small toggleable pill used in the filter bar
function FilterChip({
  active,
  onClick,
  label,
  activeColor = '#00e5b0',
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: active ? `${activeColor}1f` : 'transparent',
        color: active ? activeColor : '#5a7090',
        border: `1px solid ${active ? `${activeColor}66` : 'rgba(26,40,64,0.7)'}`,
      }}
    >
      {label}
    </button>
  );
}

export function FeedStream({ ticker, onPostsLoaded, showFilters = true }: FeedStreamProps) {
  const supabase = createClient();

  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all');
  const [langFilter, setLangFilter] = useState<LangFilter>('all');

  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (cursorDate?: string) => {
    try {
      const url = new URL('/api/posts', window.location.origin);
      url.searchParams.set('limit', '20');
      if (ticker) url.searchParams.set('ticker', ticker);
      if (cursorDate) url.searchParams.set('cursor', cursorDate);

      const res = await fetch(url.toString(), { cache: 'no-store' });

      if (!res.ok) throw new Error('fetch failed');
      const data: Post[] = await res.json();

      if (!data || data.length === 0) {
        if (!cursorDate) {
          setPosts(MOCK_POSTS);
          setUsingMock(true);
        }
        setHasMore(false);
        return;
      }

      if (cursorDate) {
        setPosts(prev => [...prev, ...data]);
      } else {
        setPosts(data);
        setUsingMock(false);
        onPostsLoaded?.(data.length);
      }

      setHasMore(data.length === 20);
      setCursor(data[data.length - 1].createdAt);
    } catch {
      if (!cursorDate) {
        setPosts(MOCK_POSTS);
        setUsingMock(true);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [ticker, onPostsLoaded]);

  const loadMore = async () => {
    if (!cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(cursor);
  };

  useEffect(() => {
    setLoading(true);
    setCursor(null);
    setHasMore(true);
    setPosts([]);
    setPendingPosts([]);
    fetchPosts();

    // Supabase Realtime — new posts appear instantly.
    //
    // Use a unique channel name per effect run so StrictMode / HMR
    // doesn't hand us back an already-subscribed channel (realtime
    // throws "cannot add postgres_changes callbacks after subscribe()"
    // when .on() is called on a live channel). Wrap the whole thing
    // in try/catch so a realtime hiccup never blanks the feed.
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      const suffix = Math.random().toString(36).slice(2, 10);
      channel = supabase
        .channel(`posts-feed:${suffix}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          async (payload) => {
            if (cancelled) return;
            if (payload.new.parent_id) return;
            if (ticker && !payload.new.stock_mentions?.includes(ticker.toUpperCase())) return;

            const res = await fetch(`/api/posts?limit=1`, { cache: 'no-store' });
            if (!res.ok || cancelled) return;
            const [freshPost] = await res.json();
            if (!freshPost || freshPost.id !== payload.new.id) return;

            // If user is at the top of the feed (scrolled within 200px), insert
            // immediately. Otherwise queue into pendingPosts so they don't get
            // bumped while reading. Mock posts always get cleared the moment
            // a real post arrives.
            const nearTop = typeof window !== 'undefined' && window.scrollY < 200;

            if (nearTop) {
              setPosts(prev => {
                if (prev[0]?.id === freshPost.id) return prev;
                return [freshPost, ...prev.filter(p => !p.id.startsWith('mock-'))];
              });
              setFreshIds(prev => new Set([...prev, freshPost.id]));
              // Strip "fresh" flag after animation completes
              setTimeout(() => {
                setFreshIds(prev => {
                  const next = new Set(prev);
                  next.delete(freshPost.id);
                  return next;
                });
              }, 1200);
              setUsingMock(false);
            } else {
              setPendingPosts(prev => {
                if (prev.some(p => p.id === freshPost.id)) return prev;
                return [freshPost, ...prev];
              });
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('[FeedStream] realtime subscribe failed', err);
    }

    return () => {
      cancelled = true;
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
  }, [ticker]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-2xl p-5 animate-pulse"
            style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.7)', minHeight: '130px' }}
          >
            <div className="flex gap-3">
              <div className="w-11 h-11 rounded-full shrink-0" style={{ background: 'rgba(26,40,64,0.8)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="h-3 w-24 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
                  <div className="h-3 w-16 rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
                </div>
                <div className="h-3 w-full rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
                <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function showPending() {
    if (pendingPosts.length === 0) return;
    const flushedIds = pendingPosts.map(p => p.id);
    setPosts(prev => {
      const merged = [...pendingPosts, ...prev.filter(p => !p.id.startsWith('mock-'))];
      // Dedupe by id, preserving order
      const seen = new Set<string>();
      return merged.filter(p => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    });
    setFreshIds(prev => new Set([...prev, ...flushedIds]));
    // Strip "fresh" flag after animation completes
    setTimeout(() => {
      setFreshIds(prev => {
        const next = new Set(prev);
        flushedIds.forEach(id => next.delete(id));
        return next;
      });
    }, 1200);
    setPendingPosts([]);
    setUsingMock(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Apply client-side filters
  const filteredPosts = posts.filter(p => {
    if (sentimentFilter !== 'all') {
      const s = p.sentiment ?? 'neutral';
      if (s !== sentimentFilter) return false;
    }
    if (langFilter !== 'all' && p.lang !== langFilter) return false;
    return true;
  });

  const filtersActive = sentimentFilter !== 'all' || langFilter !== 'all';

  return (
    <div className="space-y-3 relative">
      {/* Filter bar */}
      {showFilters && !loading && posts.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl"
          style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
        >
          {/* Sentiment filters */}
          <FilterChip
            active={sentimentFilter === 'all'}
            onClick={() => setSentimentFilter('all')}
            label="הכל"
          />
          <FilterChip
            active={sentimentFilter === 'bullish'}
            onClick={() => setSentimentFilter('bullish')}
            label="📈 שורי"
            activeColor="#00e5b0"
          />
          <FilterChip
            active={sentimentFilter === 'bearish'}
            onClick={() => setSentimentFilter('bearish')}
            label="📉 דובי"
            activeColor="#ff4d6a"
          />
          <FilterChip
            active={sentimentFilter === 'neutral'}
            onClick={() => setSentimentFilter('neutral')}
            label="◯ נייטרלי"
            activeColor="#5a7090"
          />

          <div className="mx-1 h-5 w-px" style={{ background: 'rgba(26,40,64,0.7)' }} />

          {/* Language filters */}
          <FilterChip
            active={langFilter === 'all'}
            onClick={() => setLangFilter('all')}
            label="🌐"
            title="כל השפות"
          />
          <FilterChip
            active={langFilter === 'he'}
            onClick={() => setLangFilter('he')}
            label="עב"
            title="עברית בלבד"
          />
          <FilterChip
            active={langFilter === 'en'}
            onClick={() => setLangFilter('en')}
            label="EN"
            title="אנגלית בלבד"
          />

          {filtersActive && (
            <button
              onClick={() => { setSentimentFilter('all'); setLangFilter('all'); }}
              className="ms-auto text-[11px] font-bold transition-colors"
              style={{ color: '#5a7090' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#e5ecf5'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#5a7090'}
            >
              נקה ✕
            </button>
          )}
        </div>
      )}

      {/* New-posts pill — shown when realtime delivers posts while user is reading */}
      {pendingPosts.length > 0 && (
        <button
          onClick={showPending}
          className="sticky top-4 z-30 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #00e5b0, #00a884)',
            color: '#060b16',
            boxShadow: '0 8px 24px rgba(0, 229, 176, 0.35), 0 0 0 1px rgba(0, 229, 176, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'fit-content',
            position: 'sticky',
            insetInlineStart: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <span style={{ fontSize: '14px' }}>↑</span>
          <span>
            {pendingPosts.length === 1
              ? 'פוסט חדש'
              : `${pendingPosts.length} פוסטים חדשים`}
          </span>
        </button>
      )}

      {/* Mock data notice */}
      {usingMock && (
        <div
          className="text-center text-xs text-tsua-muted py-2.5 rounded-xl"
          style={{ background: 'rgba(26,40,64,0.25)', border: '1px solid rgba(26,40,64,0.4)' }}
        >
          {'📋 מציג פוסטים לדוגמה — התחבר ופרסם את הראשון!'}
        </div>
      )}

      {filteredPosts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLikeToggle={handleLikeToggle}
          isFresh={freshIds.has(post.id)}
        />
      ))}

      {/* Empty — no posts at all */}
      {posts.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
        >
          <div className="text-4xl mb-3">📭</div>
          <div className="text-tsua-muted text-sm font-medium">
            {'אין פוסטים עדיין — היה הראשון!'}
          </div>
        </div>
      )}

      {/* Empty — filters active but nothing matches */}
      {posts.length > 0 && filteredPosts.length === 0 && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
        >
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-tsua-muted text-sm font-medium mb-3">
            {'אין פוסטים שתואמים לסינון'}
          </div>
          <button
            onClick={() => { setSentimentFilter('all'); setLangFilter('all'); }}
            className="text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }}
          >
            נקה סינון
          </button>
        </div>
      )}

      {/* Load more */}
      {hasMore && !usingMock && filteredPosts.length > 0 && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            background: 'rgba(26,40,64,0.3)',
            border: '1px solid rgba(26,40,64,0.6)',
            color: '#5a7090',
          }}
        >
          {loadingMore ? 'טוען...' : 'טען עוד פוסטים'}
        </button>
      )}
    </div>
  );

  // Like toggle — optimistic update + API call
  async function handleLikeToggle(postId: string) {
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
        : p
    ));

    // Skip API call for mock posts
    if (postId.startsWith('mock-')) return;

    try {
      await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
    } catch {
      // Revert on error
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      ));
    }
  }
}

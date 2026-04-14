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
}

export function FeedStream({ ticker, onPostsLoaded }: FeedStreamProps) {
  const supabase = createClient();

  const [posts, setPosts] = useState<Post[]>([]);
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
    fetchPosts();

    // Supabase Realtime — new posts appear instantly
    const channel = supabase
      .channel('posts-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // Only care about top-level posts in this feed
          if (payload.new.parent_id) return;
          if (ticker && !payload.new.stock_mentions?.includes(ticker.toUpperCase())) return;

          // Fetch full post with author profile
          const res = await fetch(`/api/posts?limit=1`, { cache: 'no-store' });
          if (!res.ok) return;
          const [freshPost] = await res.json();
          if (freshPost?.id === payload.new.id) {
            setPosts(prev => {
              if (prev[0]?.id === freshPost.id) return prev; // dedupe
              return [freshPost, ...prev.filter(p => !p.id.startsWith('mock-'))];
            });
            setUsingMock(false);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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

  return (
    <div className="space-y-3">
      {/* Mock data notice */}
      {usingMock && (
        <div
          className="text-center text-xs text-tsua-muted py-2.5 rounded-xl"
          style={{ background: 'rgba(26,40,64,0.25)', border: '1px solid rgba(26,40,64,0.4)' }}
        >
          {'📋 מציג פוסטים לדוגמה — התחבר ופרסם את הראשון!'}
        </div>
      )}

      {posts.map(post => (
        <PostCard key={post.id} post={post} onLikeToggle={handleLikeToggle} />
      ))}

      {/* Empty */}
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

      {/* Load more */}
      {hasMore && !usingMock && posts.length > 0 && (
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

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import { PostCard } from '@/components/feed/PostCard';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import type { Post } from '@/types/shared';

function BookmarkSkeleton() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'rgba(26,40,64,0.8)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded-full w-1/3" style={{ background: 'rgba(26,40,64,0.8)' }} />
          <div className="h-3 rounded-full w-full" style={{ background: 'rgba(26,40,64,0.6)' }} />
          <div className="h-3 rounded-full w-2/3" style={{ background: 'rgba(26,40,64,0.6)' }} />
        </div>
      </div>
    </div>
  );
}

export function BookmarksPage() {
  const locale = useLocale();
  const { user } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/bookmarks');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPosts(data);
      } catch {
        setError('שגיאה בטעינת הסימניות');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 text-3xl"
          style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.15)' }}
        >
          🔖
        </div>
        <h2 className="text-xl font-black text-tsua-text mb-2">
          הסימניות שלך
        </h2>
        <p className="text-tsua-muted text-sm mb-6 max-w-xs">
          התחבר כדי לשמור ולצפות בפוסטים שסימנת
        </p>
        <Link
          href={`/${locale}/login`}
          className="font-bold px-6 py-2.5 rounded-xl text-tsua-bg text-sm"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
        >
          כניסה
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.2)' }}
        >
          <BookmarkSolid className="w-5 h-5" style={{ color: '#00e5b0' }} />
        </div>
        <div>
          <h1 className="text-lg font-black text-tsua-text">
            הסימניות שלי
          </h1>
          <p className="text-xs text-tsua-muted">
            {loading
              ? 'טוען...'
              : posts.length > 0
                ? `${posts.length} פוסטים שמורים`
                : 'אין עדיין פוסטים שמורים'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-6 text-sm font-medium" style={{ color: '#ff4d6a' }}>
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <BookmarkSkeleton key={i} />)}
        </div>
      )}

      {/* Posts */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(26,40,64,0.4)', border: '1px dashed rgba(26,40,64,0.8)' }}
          >
            <BookmarkIcon className="w-7 h-7 text-tsua-muted" />
          </div>
          <h3 className="text-base font-bold text-tsua-muted mb-1">
            עוד אין פוסטים שמורים
          </h3>
          <p className="text-xs text-tsua-muted max-w-xs">
            לחץ על אייקון הסימניה בכל פוסט כדי לשמור אותו לכאן
          </p>
          <Link
            href={`/${locale}`}
            className="mt-4 text-sm font-bold px-4 py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
          >
            לפיד הראשי
          </Link>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowRightIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { PostCard } from '@/components/feed/PostCard';
import type { Post } from '@/types/shared';

function PostSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 animate-pulse"
      style={{ background: 'rgba(13,20,36,0.7)', border: '1px solid rgba(26,40,64,0.7)', minHeight: '160px' }}
    >
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: 'rgba(26,40,64,0.8)' }} />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-32 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
          <div className="h-3 w-full rounded" style={{ background: 'rgba(26,40,64,0.6)' }} />
          <div className="h-3 w-3/4 rounded" style={{ background: 'rgba(26,40,64,0.5)' }} />
        </div>
      </div>
    </div>
  );
}

export function PostDetailPage({ postId }: { postId: string }) {
  const locale = useLocale();
  const [post, setPost] = useState<Post | null>(null);
  const [parent, setParent] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setPost(null);
    setParent(null);
    setReplies([]);

    (async () => {
      try {
        // Fetch the post itself + its replies in parallel
        const [postRes, repliesRes] = await Promise.all([
          fetch(`/api/posts/${postId}`, { cache: 'no-store' }),
          fetch(`/api/posts/${postId}/replies`, { cache: 'no-store' }),
        ]);

        if (cancelled) return;
        if (postRes.status === 404) { setNotFound(true); return; }
        if (!postRes.ok) { setNotFound(true); return; }

        const postData: Post = await postRes.json();
        if (cancelled) return;
        setPost(postData);

        if (repliesRes.ok) {
          const repliesData: Post[] = await repliesRes.json();
          if (!cancelled) setReplies(repliesData);
        }

        // If this post is a reply, fetch parent for context
        if (postData.parentId) {
          const pRes = await fetch(`/api/posts/${postData.parentId}`, { cache: 'no-store' });
          if (pRes.ok && !cancelled) {
            setParent(await pRes.json());
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [postId]);

  if (loading) {
    return (
      <div className="space-y-3" dir="rtl">
        <PostSkeleton />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 text-4xl"
          style={{ background: 'rgba(26,40,64,0.4)', border: '1px dashed rgba(26,40,64,0.8)' }}
        >
          📭
        </div>
        <h2 className="text-xl font-black text-tsua-text mb-2">הפוסט לא נמצא</h2>
        <p className="text-tsua-muted text-sm mb-6 max-w-xs">
          ייתכן שהוא נמחק או שהקישור שגוי
        </p>
        <Link
          href={`/${locale}`}
          className="font-bold px-6 py-2.5 rounded-xl text-tsua-bg text-sm"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
        >
          חזרה לפיד
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      {/* Back link */}
      <Link
        href={`/${locale}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
        style={{ color: '#5a7090' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e8f0ff')}
        onMouseLeave={e => (e.currentTarget.style.color = '#5a7090')}
      >
        <ArrowRightIcon className="w-3.5 h-3.5" />
        חזרה לפיד
      </Link>

      {/* Parent context (if this is a reply) */}
      {parent && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold px-1" style={{ color: '#5a7090' }}>
            <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5" />
            בתגובה ל־
          </div>
          <PostCard post={parent} />
          <div
            className="mx-auto w-px h-4"
            style={{ background: 'linear-gradient(180deg, rgba(26,40,64,0.8), transparent)' }}
          />
        </div>
      )}

      {/* The post */}
      <PostCard post={post} />

      {/* Replies thread */}
      {replies.length > 0 && (
        <>
          <div
            className="flex items-center gap-2 px-1 pt-2 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: '#5a7090' }}
          >
            <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5" />
            <span>{replies.length} {replies.length === 1 ? 'תגובה' : 'תגובות'}</span>
          </div>
          <div className="space-y-2">
            {replies.map(reply => (
              <PostCard key={reply.id} post={reply} isReply />
            ))}
          </div>
        </>
      )}

      {/* No replies */}
      {replies.length === 0 && (
        <div
          className="text-center py-8 rounded-2xl"
          style={{ background: 'rgba(13,20,36,0.5)', border: '1px solid rgba(26,40,64,0.5)' }}
        >
          <div className="text-2xl mb-1.5">💬</div>
          <div className="text-tsua-muted text-xs font-medium">
            עוד אין תגובות — היה הראשון להגיב
          </div>
        </div>
      )}
    </div>
  );
}

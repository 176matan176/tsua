'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { Post } from '@/types/shared';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChatBubbleOvalLeftIcon, ArrowPathIcon, BookmarkIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, BookmarkIcon as BookmarkSolid, ArrowPathIcon as ArrowPathSolid } from '@heroicons/react/24/solid';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useLivePrice } from '@/contexts/PriceContext';
import { useAuth } from '@/contexts/AuthContext';
import { renderPostBody } from './renderPostBody';

interface PostCardProps {
  post: Post;
  onLikeToggle?: (postId: string) => void;
  isReply?: boolean;
  /** Highlight new posts that just slid in from realtime — gets the slide-in animation */
  isFresh?: boolean;
}

function StockPill({ ticker, exchange }: { ticker: string; exchange: string }) {
  const locale = useLocale();
  const live = useLivePrice(ticker);
  const changePercent = live?.changePercent ?? 0;
  const isUp = changePercent >= 0;
  const isFlashing = live?.flash === 'up' || live?.flash === 'down';

  return (
    <Link href={`/${locale}/stocks/${ticker}`}>
      <span
        className="inline-flex items-center gap-0 cursor-pointer transition-all duration-150 hover:scale-[1.03] active:scale-95 overflow-hidden"
        style={{
          borderRadius: '8px',
          border: `1px solid ${isFlashing ? (live?.flash === 'up' ? 'rgba(0,229,176,0.5)' : 'rgba(255,77,106,0.5)') : 'rgba(26,40,64,0.9)'}`,
          boxShadow: isFlashing
            ? (live?.flash === 'up' ? '0 0 16px rgba(0,229,176,0.2)' : '0 0 16px rgba(255,77,106,0.2)')
            : 'none',
        }}
      >
        {/* Ticker label */}
        <span
          className="px-2.5 py-1.5 text-[11px] font-black tracking-wider"
          style={{
            background: 'rgba(8,14,26,0.95)',
            color: '#00e5b0',
            borderRight: '1px solid rgba(26,40,64,0.6)',
            fontFamily: 'monospace',
          }}
        >
          ${ticker}
        </span>
        {/* Price data */}
        {live ? (
          <span
            className="px-2 py-1.5 flex items-center gap-1.5"
            style={{ background: 'rgba(12,18,32,0.95)' }}
          >
            <span className="text-[11px] font-bold font-mono tabular-nums" style={{ color: '#a0b4cc' }}>
              {live.price >= 1000 ? live.price.toLocaleString('en', { maximumFractionDigits: 0 }) : live.price.toFixed(2)}
            </span>
            <span
              className="text-[10px] font-black font-mono tabular-nums"
              style={{ color: isUp ? '#00e5b0' : '#ff4d6a' }}
            >
              {isUp ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </span>
        ) : (
          <span className="px-2 py-1.5 text-[10px]" style={{ background: 'rgba(12,18,32,0.95)', color: 'rgba(90,112,144,0.6)' }}>
            {exchange === 'TASE' ? 'ת"א' : exchange}
          </span>
        )}
      </span>
    </Link>
  );
}

function ReplyComposer({
  postId,
  onReply,
  onCancel,
}: {
  postId: string;
  onReply: (reply: Post) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayName = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '?';
  const initial = displayName.charAt(0).toUpperCase();

  async function submit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang: 'he', parentId: postId }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setText('');
        onReply(newReply);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-tsua-bg"
        style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
      >
        {initial}
      </div>
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="כתוב תגובה..."
          rows={2}
          maxLength={280}
          className="w-full resize-none rounded-xl px-3 py-2 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
          style={{
            background: 'rgba(15,25,41,0.6)',
            border: '1px solid rgba(26,40,64,0.6)',
            color: '#e8f0ff',
          }}
          onFocus={e => {
            e.target.style.border = '1px solid rgba(0,229,176,0.3)';
            e.target.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.06)';
          }}
          onBlur={e => {
            e.target.style.border = '1px solid rgba(26,40,64,0.6)';
            e.target.style.boxShadow = 'none';
          }}
          autoFocus
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-tsua-muted">{text.length}/280</span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="text-xs px-3 py-1 rounded-lg text-tsua-muted hover:text-tsua-text transition-colors"
            >
              ביטול
            </button>
            <button
              onClick={submit}
              disabled={!text.trim() || loading}
              className="text-xs font-bold px-4 py-1 rounded-lg text-tsua-bg transition-all disabled:opacity-40 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}
            >
              {loading ? 'שולח...' : 'שלח'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCard({ post, onLikeToggle, isReply = false, isFresh = false }: PostCardProps) {
  const locale = useLocale();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Post[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [replyCount, setReplyCount] = useState(post.replyCount);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount);
  const [shareToast, setShareToast] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: he });
  const initial = (post.author.displayName ?? post.author.username).charAt(0).toUpperCase();

  const isBullish = post.sentiment === 'bullish';
  const isBearish = post.sentiment === 'bearish';

  function toggleLike() {
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);
    onLikeToggle?.(post.id);
  }

  async function handleReplyClick() {
    if (!user) return;
    if (!repliesLoaded && (replyCount > 0)) {
      await loadReplies();
    }
    setShowReplies(true);
    setShowComposer(true);
  }

  async function loadReplies() {
    if (repliesLoaded) return;
    setRepliesLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/replies`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data);
        setRepliesLoaded(true);
      }
    } catch {
      // ignore
    } finally {
      setRepliesLoading(false);
    }
  }

  async function toggleRepliesPanel() {
    if (!showReplies) {
      if (!repliesLoaded) await loadReplies();
      setShowReplies(true);
    } else {
      setShowReplies(false);
      setShowComposer(false);
    }
  }

  async function toggleBookmark() {
    if (!user) return;
    const next = !bookmarked;
    setBookmarked(next);
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
    } catch { setBookmarked(!next); }
  }

  async function toggleRepost() {
    if (!user) return;
    const next = !reposted;
    setReposted(next);
    setRepostCount(c => next ? c + 1 : c - 1);
    try {
      await fetch('/api/reposts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
    } catch { setReposted(!next); setRepostCount(c => next ? c - 1 : c + 1); }
  }

  async function handleShare() {
    const url = `${window.location.origin}/${locale}/posts/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.author.displayName, text: post.body, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }

  function handleNewReply(reply: Post) {
    setReplies(prev => [...prev, reply]);
    setReplyCount(c => c + 1);
    setShowComposer(false);
    setRepliesLoaded(true);
  }

  const sentimentColor = isBullish ? '#00e5b0' : isBearish ? '#ff4d6a' : null;

  return (
    <article
      className={`group relative transition-all duration-200 ${!isReply ? 'hover:-translate-y-px' : ''} ${isFresh ? 'tsua-fresh-post' : ''}`}
      style={{
        background: isReply
          ? 'rgba(8,13,24,0.6)'
          : isBullish
          ? 'linear-gradient(135deg, rgba(0,229,176,0.03) 0%, rgba(10,16,30,0.92) 40%)'
          : isBearish
          ? 'linear-gradient(135deg, rgba(255,77,106,0.03) 0%, rgba(10,16,30,0.92) 40%)'
          : 'rgba(10,16,30,0.88)',
        border: `1px solid ${isReply ? 'rgba(26,40,64,0.35)' : sentimentColor ? `rgba(${isBullish ? '0,229,176' : '255,77,106'},0.18)` : 'rgba(26,40,64,0.65)'}`,
        borderRadius: '12px',
        borderInlineStart: sentimentColor ? `3px solid ${sentimentColor}` : undefined,
        boxShadow: !isReply
          ? sentimentColor
            ? `0 2px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)`
            : '0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)'
          : 'none',
      }}
      onMouseEnter={e => {
        if (!isReply) {
          (e.currentTarget as HTMLElement).style.boxShadow = sentimentColor
            ? `0 6px 32px rgba(0,0,0,0.3), 0 0 0 1px ${sentimentColor}22`
            : '0 6px 32px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,229,176,0.1)';
        }
      }}
      onMouseLeave={e => {
        if (!isReply) {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)';
        }
      }}
    >
      <div className={`p-4 ${sentimentColor ? 'ps-4' : 'ps-4'}`}>
        <div className="flex gap-3">

          {/* Avatar column */}
          <div className="shrink-0 flex flex-col items-center">
            <Link href={`/${locale}/profile/${post.author.username}`}>
              <div className="relative group/avatar">
                {/* Square avatar with cut corners */}
                <div
                  className="w-10 h-10 flex items-center justify-center font-black text-[13px] select-none transition-all duration-200 group-hover/avatar:scale-105"
                  style={{
                    borderRadius: '10px',
                    background: isBullish
                      ? 'linear-gradient(135deg, #00e5b0 0%, #006b52 100%)'
                      : isBearish
                      ? 'linear-gradient(135deg, #ff4d6a 0%, #8b1a2e 100%)'
                      : 'linear-gradient(135deg, #1e3a5f 0%, #0d2240 100%)',
                    color: '#fff',
                    boxShadow: sentimentColor ? `0 0 16px ${sentimentColor}30` : 'none',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {initial}
                </div>
                {/* Online dot */}
                <span
                  className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: '#00e5b0', borderColor: '#060b16' }}
                />
              </div>
            </Link>
            {showReplies && replies.length > 0 && (
              <div className="w-px flex-1 mt-2 min-h-4" style={{ background: 'linear-gradient(180deg, rgba(26,40,64,0.8), transparent)' }} />
            )}
          </div>

          <div className="flex-1 min-w-0">

            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 flex-wrap leading-none">
                <Link
                  href={`/${locale}/profile/${post.author.username}`}
                  className="text-[15px] font-black transition-colors hover:text-tsua-green"
                  style={{ color: '#ddeeff', letterSpacing: '-0.01em' }}
                >
                  {post.author.displayName ?? post.author.username}
                </Link>

                {post.author.isVerified && (
                  <span
                    className="w-[15px] h-[15px] rounded-full flex items-center justify-center text-[8px] font-black shrink-0"
                    style={{ background: 'linear-gradient(135deg, #00e5b0, #0090ff)', color: '#060b16' }}
                  >✓</span>
                )}

                {post.author.rating && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 shrink-0"
                    style={{ borderRadius: '5px', background: 'rgba(245,185,66,0.1)', color: '#f5b942', border: '1px solid rgba(245,185,66,0.18)' }}
                  >
                    ★ {post.author.rating}
                  </span>
                )}
              </div>

              {/* Sentiment badge — top right */}
              {sentimentColor && (
                <span
                  className="shrink-0 text-[10px] font-black px-2 py-1 flex items-center gap-1"
                  style={{
                    borderRadius: '6px',
                    background: isBullish ? 'rgba(0,229,176,0.1)' : 'rgba(255,77,106,0.1)',
                    color: sentimentColor,
                    border: `1px solid ${sentimentColor}30`,
                    boxShadow: `0 0 12px ${sentimentColor}18`,
                    letterSpacing: '0.02em',
                  }}
                >
                  {isBullish ? '▲' : '▼'} {isBullish ? 'שורי' : 'דובי'}
                </span>
              )}
            </div>

            {/* Metadata line */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[11px] font-mono" style={{ color: 'rgba(90,112,144,0.8)' }}>
                @{post.author.username}
              </span>
              <span style={{ color: 'rgba(26,40,64,0.8)' }}>·</span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(90,112,144,0.7)' }}>
                {timeAgo}
              </span>
            </div>

            {/* Body */}
            <p
              dir="auto"
              className="break-words whitespace-pre-wrap"
              style={{
                color: '#c0d4ee',
                fontSize: '14.5px',
                lineHeight: '1.7',
                fontWeight: 400,
              }}
            >
              {renderPostBody(post.body, { locale })}
            </p>

            {/* Post images */}
            {post.imageUrls && post.imageUrls.length > 0 && (
              <div
                className={`mt-3 grid gap-1 overflow-hidden ${post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                style={{ borderRadius: '8px', border: '1px solid rgba(26,40,64,0.5)' }}
              >
                {post.imageUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-full object-cover"
                    style={{ maxHeight: post.imageUrls.length === 1 ? '320px' : '180px' }}
                  />
                ))}
              </div>
            )}

            {/* Stock pills */}
            {post.stockMentions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.stockMentions.map((m) => (
                  <StockPill key={m.ticker} ticker={m.ticker} exchange={m.exchange} />
                ))}
              </div>
            )}

            {/* Action row */}
            <div
              className="flex items-center gap-0 mt-3 pt-3 -mx-1"
              style={{ borderTop: '1px solid rgba(26,40,64,0.4)' }}
            >
              {/* Like */}
              <button
                onClick={toggleLike}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:bg-red-500/8 group/like"
              >
                <span className={`transition-all duration-200 ${likeAnim ? 'scale-[1.3]' : 'scale-100'}`}>
                  {liked
                    ? <HeartSolid className="w-[17px] h-[17px] text-tsua-red" style={{ filter: 'drop-shadow(0 0 5px rgba(255,77,106,0.6))' }} />
                    : <HeartIcon className="w-[17px] h-[17px] group-hover/like:text-tsua-red transition-colors" style={{ color: 'rgba(90,112,144,0.7)' }} />
                  }
                </span>
                {likeCount > 0 && (
                  <span className={`text-[11px] font-bold font-mono tabular-nums transition-colors ${liked ? 'text-tsua-red' : 'group-hover/like:text-tsua-red'}`} style={{ color: liked ? undefined : 'rgba(90,112,144,0.7)' }}>
                    {likeCount}
                  </span>
                )}
              </button>

              {/* Reply */}
              <button
                onClick={isReply ? undefined : (replyCount > 0 ? toggleRepliesPanel : handleReplyClick)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:bg-blue-500/8 group/reply"
              >
                <ChatBubbleOvalLeftIcon
                  className="w-[17px] h-[17px] transition-colors group-hover/reply:text-blue-400"
                  style={{ color: showReplies ? '#60a5fa' : 'rgba(90,112,144,0.7)' }}
                />
                {replyCount > 0 && (
                  <span
                    className="text-[11px] font-bold font-mono tabular-nums transition-colors group-hover/reply:text-blue-400"
                    style={{ color: showReplies ? '#60a5fa' : 'rgba(90,112,144,0.7)' }}
                  >
                    {replyCount}
                  </span>
                )}
              </button>

              {/* Repost */}
              {!isReply && (
                <button
                  onClick={toggleRepost}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 hover:bg-green-500/8 group/repost"
                >
                  {reposted
                    ? <ArrowPathSolid className="w-[17px] h-[17px]" style={{ color: '#00e5b0' }} />
                    : <ArrowPathIcon className="w-[17px] h-[17px] group-hover/repost:text-tsua-green transition-colors" style={{ color: 'rgba(90,112,144,0.7)' }} />
                  }
                  {repostCount > 0 && (
                    <span className="text-[11px] font-bold font-mono tabular-nums transition-colors" style={{ color: reposted ? '#00e5b0' : 'rgba(90,112,144,0.7)' }}>
                      {repostCount}
                    </span>
                  )}
                </button>
              )}

              <div className="flex-1" />

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg transition-all duration-200 hover:bg-white/5"
                  style={{ color: 'rgba(90,112,144,0.7)' }}
                >
                  <ArrowUpTrayIcon className="w-[17px] h-[17px]" />
                </button>
                {shareToast && (
                  <div
                    className="absolute bottom-full mb-2 end-0 text-[10px] font-bold px-2 py-1 whitespace-nowrap"
                    style={{ borderRadius: '6px', background: 'rgba(0,229,176,0.12)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.25)' }}
                  >
                    הועתק ✓
                  </div>
                )}
              </div>

              {/* Bookmark */}
              <button
                onClick={toggleBookmark}
                className="p-1.5 rounded-lg transition-all duration-200 hover:bg-yellow-500/8"
              >
                {bookmarked
                  ? <BookmarkSolid className="w-[17px] h-[17px]" style={{ color: '#f5b942', filter: 'drop-shadow(0 0 4px rgba(245,185,66,0.4))' }} />
                  : <BookmarkIcon className="w-[17px] h-[17px]" style={{ color: 'rgba(90,112,144,0.7)' }} />
                }
              </button>
            </div>

            {/* Replies thread */}
            {showReplies && !isReply && (
              <div className="mt-3">
                {repliesLoading && (
                  <div className="flex items-center gap-2 py-3 text-tsua-muted text-xs">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-tsua-muted border-t-tsua-accent animate-spin" />
                    טוען תגובות...
                  </div>
                )}

                {!repliesLoading && replies.length > 0 && (
                  <div className="space-y-2 mt-1">
                    {replies.map(reply => (
                      <PostCard key={reply.id} post={reply} isReply />
                    ))}
                  </div>
                )}

                {!repliesLoading && replies.length === 0 && repliesLoaded && (
                  <div className="text-xs text-tsua-muted py-2">
                    היה הראשון להגיב!
                  </div>
                )}

                {showComposer && user && (
                  <ReplyComposer
                    postId={post.id}
                    onReply={handleNewReply}
                    onCancel={() => setShowComposer(false)}
                  />
                )}

                {!showComposer && user && (
                  <button
                    onClick={() => setShowComposer(true)}
                    className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <ChatBubbleOvalLeftIcon className="w-3.5 h-3.5" />
                    הוסף תגובה
                  </button>
                )}

                <button
                  onClick={() => { setShowReplies(false); setShowComposer(false); }}
                  className="mt-2 text-xs text-tsua-muted hover:text-tsua-text transition-colors flex items-center gap-1"
                >
                  <XMarkIcon className="w-3 h-3" />
                  הסתר תגובות
                </button>
              </div>
            )}

            {/* Show composer without loading replies (first reply) */}
            {!isReply && showComposer && !showReplies && user && (
              <ReplyComposer
                postId={post.id}
                onReply={(r) => { setReplies([r]); setReplyCount(c => c + 1); setShowComposer(false); setRepliesLoaded(true); setShowReplies(true); }}
                onCancel={() => setShowComposer(false)}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

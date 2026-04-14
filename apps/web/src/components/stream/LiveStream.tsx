'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

interface StreamPost {
  id: string;
  author: string;
  avatarLetter: string;
  avatarGradient: string;
  body: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  ticker?: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: Date;
  isNew?: boolean;
}

interface LiveStreamProps {
  topic: string;
  topicHe: string;
  topicEn: string;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#3b82f6,#8b5cf6)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#3b82f6)',
  'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f97316,#ec4899)',
];

const SEED_POSTS: StreamPost[] = [
  {
    id: '1',
    author: 'AnalystMatan',
    avatarLetter: 'M',
    avatarGradient: AVATAR_GRADIENTS[0],
    body: 'טבע מדווחת מחר — מצפה לנתוני גנריקה טובים מארה"ב. יש לי פוזיציה לונג קטנה. מי איתי? 🚀',
    sentiment: 'bullish',
    ticker: 'TEVA',
    likeCount: 12,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
  },
  {
    id: '2',
    author: 'TradingDan',
    avatarLetter: 'D',
    avatarGradient: AVATAR_GRADIENTS[1],
    body: 'לדעתי ת"א 35 ייסגר היום בשלילי. היחלשות השקל + חשש ביטחוני. שימו לב לבנקים.',
    sentiment: 'bearish',
    likeCount: 7,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '3',
    author: 'ValueInvestorR',
    avatarLetter: 'ר',
    avatarGradient: AVATAR_GRADIENTS[2],
    body: 'שאלה לקהילה: מה אתם חושבים על צ\'קפוינט לאחר תוצאות Q2? האם ה-AI security מגולם במחיר?',
    ticker: 'CHKP',
    likeCount: 19,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 3),
  },
];

const MOCK_INCOMING: Partial<StreamPost>[] = [
  { author: 'MorningTrader', avatarLetter: 'O', avatarGradient: AVATAR_GRADIENTS[3], body: 'יחס קונים למוכרים ב-TEVA עלה ל-1.8 — סימן חיובי לפני הדוח 📈', sentiment: 'bullish', ticker: 'TEVA' },
  { author: 'MacroWatcher',  avatarLetter: 'W', avatarGradient: AVATAR_GRADIENTS[4], body: 'ריבית הפד — כולם שוכחים שעוד יש שתי ישיבות לפני סוף השנה. אל תהיו אגרסיביים.', sentiment: 'neutral' },
  { author: 'TechAnalyst',   avatarLetter: 'T', avatarGradient: AVATAR_GRADIENTS[5], body: 'NICE ו-CyberArk — שני סטוקים ישראליים שנסחרים בחסר. מי מסכים?', ticker: 'NICE', sentiment: 'bullish' },
  { author: 'DayTraderYosi', avatarLetter: 'י', avatarGradient: AVATAR_GRADIENTS[0], body: 'יצאתי מ-POLI בבוקר בריווח קטן. הבנקים לחצ אחרי נתוני האשראי.', sentiment: 'bearish', ticker: 'POLI' },
];

export function LiveStream({ topic, topicHe, topicEn }: LiveStreamProps) {
  const [posts, setPosts] = useState<StreamPost[]>(SEED_POSTS);
  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [autoScroll, setAutoScroll] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const incomingIndex = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = MOCK_INCOMING[incomingIndex.current % MOCK_INCOMING.length];
      incomingIndex.current++;
      const newPost: StreamPost = {
        id: Date.now().toString(),
        author: next.author!,
        avatarLetter: next.avatarLetter!,
        avatarGradient: next.avatarGradient!,
        body: next.body!,
        sentiment: next.sentiment as any,
        ticker: next.ticker,
        likeCount: Math.floor(Math.random() * 10),
        isLiked: false,
        createdAt: new Date(),
        isNew: true,
      };
      setPosts(prev => [...prev, newPost]);
      if (!autoScroll) setNewCount(c => c + 1);
    }, 12000);
    return () => clearInterval(timer);
  }, [autoScroll]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(atBottom);
    if (atBottom) setNewCount(0);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    setNewCount(0);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitPost = () => {
    if (!body.trim()) return;
    const newPost: StreamPost = {
      id: Date.now().toString(),
      author: 'אתה',
      avatarLetter: 'א',
      avatarGradient: 'linear-gradient(135deg,#00e5b0,#3b82f6)',
      body: body.trim(),
      sentiment,
      likeCount: 0,
      isLiked: false,
      createdAt: new Date(),
      isNew: true,
    };
    setPosts(prev => [...prev, newPost]);
    setBody('');
    setAutoScroll(true);
  };

  const toggleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 } : p
    ));
  };

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        height: '500px',
        background: 'rgba(13,20,36,0.7)',
        border: '1px solid rgba(26,40,64,0.7)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse shrink-0"
            style={{ background: '#00e5b0', boxShadow: '0 0 8px rgba(0,229,176,0.8)' }}
          />
          <span className="text-sm font-bold text-tsua-text">
            {`דיון חי · ${topicHe}`}
          </span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
          style={{ background: 'rgba(26,40,64,0.6)', color: '#5a7090', border: '1px solid rgba(26,40,64,0.6)' }}
        >
          {posts.length}
        </span>
      </div>

      {/* Posts */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(26,40,64,0.8) transparent' }}
      >
        {posts.map(post => (
          <StreamPostCard
            key={post.id}
            post={post}
            onLike={() => toggleLike(post.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* New messages pill */}
      {newCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="mx-3 mb-1 py-1.5 text-xs font-bold rounded-xl text-center shrink-0 transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'rgba(0,229,176,0.15)',
            border: '1px solid rgba(0,229,176,0.3)',
            color: '#00e5b0',
          }}
        >
          ↓ {newCount} {'הודעות חדשות'}
        </button>
      )}

      {/* Composer */}
      <div
        className="shrink-0 px-3 py-3 space-y-2"
        style={{ borderTop: '1px solid rgba(26,40,64,0.5)', background: 'rgba(6,11,22,0.4)' }}
      >
        {/* Sentiment */}
        <div className="flex gap-1">
          {(['bullish', 'bearish', 'neutral'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSentiment(s)}
              className="text-[10px] px-2 py-1 rounded-lg font-bold transition-all duration-150"
              style={sentiment === s
                ? s === 'bullish'
                  ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }
                  : s === 'bearish'
                  ? { background: 'rgba(255,77,106,0.15)', color: '#ff4d6a', border: '1px solid rgba(255,77,106,0.3)' }
                  : { background: 'rgba(90,112,144,0.2)', color: '#8aaccf', border: '1px solid rgba(90,112,144,0.3)' }
                : { background: 'rgba(15,25,41,0.6)', color: '#5a7090', border: '1px solid rgba(26,40,64,0.6)' }
              }
            >
              {s === 'bullish' ? '▲' : s === 'bearish' ? '▼' : '●'}{' '}
              {s === 'bullish' ? 'שורי' : s === 'bearish' ? 'דובי' : 'ניטרלי'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPost(); } }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={`מה דעתך על ${topicHe}?`}
            dir="auto"
            rows={2}
            className="flex-1 rounded-xl px-3 py-2 text-sm placeholder:text-tsua-muted focus:outline-none resize-none transition-all duration-200"
            style={{
              background: 'rgba(8,13,26,0.8)',
              border: inputFocused ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(26,40,64,0.7)',
              color: '#d4e4ff',
              boxShadow: inputFocused ? '0 0 0 3px rgba(0,229,176,0.06)' : 'none',
            }}
          />
          <button
            onClick={submitPost}
            disabled={!body.trim()}
            className="px-3 rounded-xl font-black text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
              color: '#060b16',
              boxShadow: body.trim() ? '0 4px 12px rgba(0,229,176,0.25)' : 'none',
            }}
          >
            {'←'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StreamPostCard({ post, onLike }: { post: StreamPost; onLike: () => void }) {
  const timeAgo = formatDistanceToNow(post.createdAt, { addSuffix: false, locale: he });

  const sentimentStyle = post.sentiment === 'bullish'
    ? { bg: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: 'rgba(0,229,176,0.2)', label: '▲ שורי' }
    : post.sentiment === 'bearish'
    ? { bg: 'rgba(255,77,106,0.1)', color: '#ff4d6a', border: 'rgba(255,77,106,0.2)', label: '▼ דובי' }
    : null;

  return (
    <div
      className={`flex gap-2.5 px-2 py-2 rounded-xl transition-all duration-200 group ${post.isNew ? 'animate-fade-in' : ''}`}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,40,64,0.3)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5"
        style={{ background: post.avatarGradient, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
      >
        {post.avatarLetter}
      </div>

      <div className="flex-1 min-w-0">
        {/* Meta */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-bold text-tsua-text">{post.author}</span>
          {sentimentStyle && (
            <span
              className="text-[9px] font-bold px-1 py-px rounded"
              style={{ background: sentimentStyle.bg, color: sentimentStyle.color, border: `1px solid ${sentimentStyle.border}` }}
            >
              {sentimentStyle.label}
            </span>
          )}
          {post.ticker && (
            <span className="text-[10px] font-black" style={{ color: '#00e5b0' }}>${post.ticker}</span>
          )}
          <span className="text-[9px] text-tsua-muted ms-auto">{timeAgo}</span>
        </div>

        {/* Body */}
        <p className="text-xs leading-relaxed break-words" style={{ color: '#b0c4de' }} dir="auto">
          {post.body}
        </p>

        {/* Like */}
        <button
          onClick={onLike}
          className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold transition-all duration-200 ${
            post.isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
          }`}
          style={{ color: post.isLiked ? '#ff4d6a' : '#5a7090' }}
        >
          {post.isLiked
            ? <HeartSolid className="w-3 h-3" style={{ filter: 'drop-shadow(0 0 4px rgba(255,77,106,0.5))' }} />
            : <HeartIcon className="w-3 h-3" />
          }
          {post.likeCount > 0 && post.likeCount}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';

type Period = '7d' | '30d' | 'alltime';
type Category = 'all' | 'tase' | 'us';

interface Trader {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  followersCount: number;
  postCount: number;
  totalLikes: number;
  bullishCount: number;
  bearishCount: number;
  accuracy: number;
  badge: 'legend' | 'expert' | 'rising' | 'rookie' | null;
  score: number;
}

const BADGE_CONFIG = {
  legend: { emoji: '👑', labelHe: 'אגדה', labelEn: 'Legend', color: '#f5b942', bg: 'rgba(245,185,66,0.12)', border: 'rgba(245,185,66,0.3)' },
  expert:  { emoji: '⭐', labelHe: 'מומחה', labelEn: 'Expert',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
  rising:  { emoji: '🚀', labelHe: 'עולה', labelEn: 'Rising',  color: '#00e5b0', bg: 'rgba(0,229,176,0.12)', border: 'rgba(0,229,176,0.3)' },
  rookie:  { emoji: '🌱', labelHe: 'מתחיל', labelEn: 'Rookie', color: '#a8bcd4', bg: 'rgba(168,188,212,0.1)', border: 'rgba(168,188,212,0.2)' },
};

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold text-tsua-muted w-7 text-center">#{rank}</span>;
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const color = accuracy >= 70 ? '#00e5b0' : accuracy >= 40 ? '#f5b942' : '#ff4d6a';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(26,40,64,0.6)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(accuracy, 100)}%`, background: color, boxShadow: `0 0 6px ${color}40` }}
        />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{accuracy}%</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl animate-pulse"
      style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
    >
      <div className="w-8 h-5 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
      <div className="w-10 h-10 rounded-full" style={{ background: 'rgba(26,40,64,0.8)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-28 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
        <div className="h-2 w-full rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
        <div className="h-2 w-20 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
      </div>
      <div className="w-12 space-y-1">
        <div className="h-4 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
        <div className="h-3 rounded" style={{ background: 'rgba(26,40,64,0.8)' }} />
      </div>
    </div>
  );
}

function AvatarCircle({ trader, size = 'md', isFirst = false }: { trader: Trader; size?: 'sm' | 'md'; isFirst?: boolean }) {
  const sizeClass = size === 'md' ? 'w-10 h-10 text-sm' : 'w-12 h-12';
  const bg = isFirst
    ? 'linear-gradient(135deg, #f5b942, #e8a020)'
    : 'linear-gradient(135deg, #00e5b0, #3b82f6)';

  if (trader.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trader.avatarUrl}
        alt={trader.displayName}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-tsua-bg shrink-0`}
      style={{ background: bg }}
    >
      {(trader.displayName || trader.username).charAt(0).toUpperCase()}
    </div>
  );
}

export function LeaderboardPage() {
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>('30d');
  const [category, setCategory] = useState<Category>('all');
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const apiPeriod = period === 'alltime' ? 'all' : period;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/leaderboard?period=${apiPeriod}&category=${category}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Trader[]) => {
        setTraders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[leaderboard] fetch error:', err);
        setError('שגיאה בטעינת הנתונים');
        setLoading(false);
      });
  }, [period, category]);

  const top3 = traders.slice(0, 3);
  // Podium order: 2nd, 1st, 3rd
  const podium: (Trader | undefined)[] = [top3[1], top3[0], top3[2]];
  const rest = traders.slice(3);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-black text-tsua-text">
          🏆 {'לוח המובילים'}
        </h1>
        <p className="text-tsua-muted text-sm mt-1">
          {'הסוחרים הפעילים ביותר בקהילה — מדורגים לפי פעילות ולייקים'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl flex-1" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
          {(['7d', '30d', 'alltime'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all"
              style={period === p ? { background: 'linear-gradient(135deg, #00e5b0, #00c49a)', color: '#080d1a' } : { color: '#5a7090' }}
            >
              {p === '7d' ? '7 ימים' : p === '30d' ? '30 ימים' : 'הכל'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}>
          {(['all', 'tase', 'us'] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={category === c ? { background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' } : { color: '#5a7090' }}
            >
              {c === 'all' ? 'הכל' : c === 'tase' ? '🇮🇱 ת"א' : '🇺🇸 US'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          className="rounded-2xl p-4 text-center text-sm"
          style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#ff4d6a' }}
        >
          {error}
        </div>
      )}

      {/* Loading: skeleton podium + list */}
      {loading && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`rounded-2xl p-3 animate-pulse ${i === 1 ? 'py-5' : 'mt-4'}`}
                style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
              >
                <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ background: 'rgba(26,40,64,0.8)' }} />
                <div className="w-12 h-12 rounded-full mx-auto mb-2" style={{ background: 'rgba(26,40,64,0.8)' }} />
                <div className="h-3 w-16 rounded mx-auto mb-1" style={{ background: 'rgba(26,40,64,0.8)' }} />
                <div className="h-3 w-10 rounded mx-auto" style={{ background: 'rgba(26,40,64,0.8)' }} />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && traders.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
        >
          <div className="text-4xl mb-3">📭</div>
          <p className="text-tsua-muted text-sm">{'אין נתונים לתקופה הנבחרת עדיין'}</p>
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && traders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {podium.map((trader, i) => {
            const podiumRank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const isFirst = podiumRank === 1;
            if (!trader) return <div key={i} className={isFirst ? '' : 'mt-4'} />;
            const badge = trader.badge ? BADGE_CONFIG[trader.badge] : null;
            return (
              <Link key={trader.username} href={`/${locale}/profile/${trader.username}`}>
                <div
                  className={`relative text-center rounded-2xl p-3 cursor-pointer transition-all hover:scale-105 ${isFirst ? 'py-5' : 'mt-4'}`}
                  style={{
                    background: isFirst ? 'rgba(245,185,66,0.08)' : 'rgba(15,25,41,0.7)',
                    border: isFirst ? '1px solid rgba(245,185,66,0.3)' : '1px solid rgba(26,40,64,0.8)',
                    boxShadow: isFirst ? '0 0 20px rgba(245,185,66,0.1)' : 'none',
                  }}
                >
                  <div className="text-2xl mb-1">
                    {podiumRank === 1 ? '🥇' : podiumRank === 2 ? '🥈' : '🥉'}
                  </div>
                  <div className="flex justify-center mb-2">
                    <AvatarCircle trader={trader} size="md" isFirst={isFirst} />
                  </div>
                  <div className="text-xs font-bold text-tsua-text truncate">{trader.displayName}</div>
                  <div className="text-[10px] text-tsua-muted">@{trader.username}</div>
                  <div className="mt-1.5 text-sm font-black" style={{ color: isFirst ? '#f5b942' : '#00e5b0' }}>
                    {Math.round(trader.score).toLocaleString()}
                  </div>
                  <div className="text-[10px]" style={{ color: '#00e5b0' }}>{trader.postCount} {'פוסטים'}</div>
                  {badge && (
                    <div className="mt-1">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                      >
                        {badge.emoji} {badge.labelHe}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Ranks 4+ list */}
      {!loading && rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((trader) => {
            const badge = trader.badge ? BADGE_CONFIG[trader.badge] : null;
            const scoreUp = trader.totalLikes >= 0;
            return (
              <Link key={trader.username} href={`/${locale}/profile/${trader.username}`}>
                <div
                  className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all"
                  style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,176,0.2)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(15,25,41,0.9)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(26,40,64,0.8)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(15,25,41,0.6)';
                  }}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    <RankMedal rank={trader.rank} />
                  </div>

                  {/* Avatar */}
                  <AvatarCircle trader={trader} size="md" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-tsua-text truncate">{trader.displayName}</span>
                      {trader.isVerified && (
                        <span
                          className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-[8px] font-black text-tsua-bg shrink-0"
                          style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
                        >
                          ✓
                        </span>
                      )}
                      {badge && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                        >
                          {badge.emoji} {badge.labelHe}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <AccuracyBar accuracy={trader.accuracy} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-tsua-muted">
                      {trader.postCount} {'פוסטים'} ·{' '}
                      <span style={{ color: '#3b82f6' }}>{'שור:'} {trader.bullishCount}</span>
                      {' / '}
                      <span style={{ color: '#ff4d6a' }}>{'דוב:'} {trader.bearishCount}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-tsua-text">{Math.round(trader.score).toLocaleString()}</div>
                    <div className="text-[11px] font-bold" style={{ color: '#00e5b0' }}>
                      ♥ {trader.totalLikes}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.1)' }}
      >
        <h3 className="text-sm font-bold text-tsua-text mb-3">
          {'❓ איך עובד הדירוג?'}
        </h3>
        <div className="space-y-2 text-xs text-tsua-muted">
          <div className="flex items-start gap-2">
            <span className="text-tsua-green font-bold shrink-0">✍️</span>
            <span>{'כל פוסט שתפרסם מוסיף לניקוד שלך'}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-tsua-green font-bold shrink-0">♥</span>
            <span>{'לייקים מגבירים את הדירוג — כתוב תוכן איכותי!'}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-tsua-green font-bold shrink-0">📈</span>
            <span>{'פוסטים עם עמדות שור/דוב מחושבים בנפרד'}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-tsua-green font-bold shrink-0">👑</span>
            <span>{'מדרגות: מתחיל → עולה → מומחה → אגדה'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Stats {
  snapshotAt: string;
  viewer: { email: string };
  totals: { users: number; posts: number; likes: number; follows: number };
  deltas: { users24h: number; users7d: number; posts24h: number; posts7d: number };
  recentUsers: Array<{
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  }>;
  recentPosts: Array<{
    id: string;
    body: string;
    author_id: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    stock_mentions: string[] | null;
    sentiment: string | null;
    profiles: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  }>;
  topAuthors: Array<{
    author_id: string;
    count: number;
    profile: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
  }>;
}

function relTime(iso: string) {
  try { return formatDistanceToNow(new Date(iso), { locale: he, addSuffix: true }); }
  catch { return ''; }
}

function MetricCard({
  label, value, delta, accent, icon,
}: {
  label: string;
  value: number | string;
  delta?: string;
  accent: string;
  icon: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${accent}18, transparent 60%)` }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-tsua-muted tracking-wide uppercase mb-1">{label}</p>
          <p className="text-2xl font-black text-tsua-text font-mono tabular-nums">{value}</p>
          {delta && (
            <p className="mt-1 text-[11px] font-semibold" style={{ color: accent }}>
              {delta}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({ viewerEmail, locale }: { viewerEmail: string; locale: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (alive) { setStats(data); setError(null); }
      } catch (e: any) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (loading && !stats) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(26,40,64,0.5)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.25)' }}>
        <p className="text-sm font-bold" style={{ color: '#ff4d6a' }}>שגיאה בטעינת נתונים</p>
        <p className="text-xs text-tsua-muted mt-1">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div dir="rtl" className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-tsua-text flex items-center gap-2">
            <span>🎛️ חדר בקרה</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }}>
              ADMIN
            </span>
          </h1>
          <p className="text-xs text-tsua-muted mt-0.5">
            מחובר כ-{viewerEmail} · מתעדכן כל 30 שניות
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-tsua-muted">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00e5b0' }} />
          LIVE
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="משתמשים"
          value={stats.totals.users.toLocaleString('he-IL')}
          delta={`+${stats.deltas.users24h} ב-24ש׳ · +${stats.deltas.users7d} ב-7ימ׳`}
          accent="#00e5b0"
          icon="👥"
        />
        <MetricCard
          label="פוסטים"
          value={stats.totals.posts.toLocaleString('he-IL')}
          delta={`+${stats.deltas.posts24h} ב-24ש׳ · +${stats.deltas.posts7d} ב-7ימ׳`}
          accent="#4dabf7"
          icon="📝"
        />
        <MetricCard
          label="לייקים"
          value={stats.totals.likes.toLocaleString('he-IL')}
          accent="#ff6b9d"
          icon="❤️"
        />
        <MetricCard
          label="עוקבים"
          value={stats.totals.follows.toLocaleString('he-IL')}
          accent="#ffd93d"
          icon="🔗"
        />
      </div>

      {/* Recent signups + Top authors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
            <h2 className="text-sm font-black text-tsua-text">🆕 הרשמות אחרונות</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }}>
            {stats.recentUsers.length === 0 && (
              <p className="text-xs text-tsua-muted text-center py-6">אין הרשמות חדשות</p>
            )}
            {stats.recentUsers.map(u => (
              <Link
                key={u.id}
                href={`/${locale}/profile/${u.username ?? u.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'rgba(0,229,176,0.15)', color: '#00e5b0' }}>
                    {(u.display_name ?? u.username ?? '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-tsua-text truncate">
                    {u.display_name ?? u.username ?? 'משתמש'}
                  </p>
                  <p className="text-[11px] text-tsua-muted truncate">
                    @{u.username ?? '—'} · {relTime(u.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
            <h2 className="text-sm font-black text-tsua-text">🏆 יוצרים מובילים (7 ימים)</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }}>
            {stats.topAuthors.length === 0 && (
              <p className="text-xs text-tsua-muted text-center py-6">עדיין אין פוסטים השבוע</p>
            )}
            {stats.topAuthors.map((a, i) => (
              <Link
                key={a.author_id}
                href={`/${locale}/profile/${a.profile?.username ?? a.author_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <span className="w-6 text-center text-[11px] font-black text-tsua-muted">{i + 1}</span>
                {a.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(77,171,247,0.15)', color: '#4dabf7' }}>
                    {(a.profile?.display_name ?? a.profile?.username ?? '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-tsua-text truncate">
                    {a.profile?.display_name ?? a.profile?.username ?? 'משתמש'}
                  </p>
                  <p className="text-[11px] text-tsua-muted">{a.count} פוסטים</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Recent posts */}
      <section
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
          <h2 className="text-sm font-black text-tsua-text">📝 פוסטים אחרונים</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(26,40,64,0.35)' }}>
          {stats.recentPosts.length === 0 && (
            <p className="text-xs text-tsua-muted text-center py-6">אין פוסטים חדשים</p>
          )}
          {stats.recentPosts.map(p => (
            <article key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-tsua-text">
                  {p.profiles?.display_name ?? p.profiles?.username ?? 'משתמש'}
                </span>
                <span className="text-[10px] text-tsua-muted">· {relTime(p.created_at)}</span>
                {p.sentiment && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{
                      background: p.sentiment === 'bullish' ? 'rgba(0,229,176,0.15)' : p.sentiment === 'bearish' ? 'rgba(255,77,106,0.15)' : 'rgba(154,177,204,0.15)',
                      color: p.sentiment === 'bullish' ? '#00e5b0' : p.sentiment === 'bearish' ? '#ff4d6a' : '#9ab1cc',
                    }}
                  >
                    {p.sentiment === 'bullish' ? 'שורי' : p.sentiment === 'bearish' ? 'דובי' : 'נייטרלי'}
                  </span>
                )}
                {(p.stock_mentions ?? []).slice(0, 3).map(t => (
                  <span key={t} className="text-[10px] font-mono font-bold text-tsua-muted">${t}</span>
                ))}
              </div>
              <p className="text-sm text-tsua-text leading-relaxed line-clamp-2">{p.body}</p>
              <div className="flex gap-3 mt-1.5 text-[11px] text-tsua-muted">
                <span>❤️ {p.like_count}</span>
                <span>💬 {p.reply_count}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="text-[10px] text-tsua-muted text-center pt-2 pb-4">
        צילום מסך נוצר ב-{new Date(stats.snapshotAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
    </div>
  );
}

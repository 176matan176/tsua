'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { COMMUNITIES } from '@/lib/communities';

interface LastMessage { body: string; createdAt: string; authorName: string }
interface Summary { slug: string; members: number; isMember: boolean; lastMessage: LastMessage | null }

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.floor(h / 24)} ימים`;
}

export function RoomsDirectory() {
  const locale = useLocale();
  const [summary, setSummary] = useState<Record<string, Summary>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/rooms/summary', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive || !d?.communities) return;
        const map: Record<string, Summary> = {};
        for (const c of d.communities as Summary[]) map[c.slug] = c;
        setSummary(map);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoaded(true); });
    load();
    // Refresh previews/counts when the tab regains focus.
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {COMMUNITIES.map((room) => {
        const s = summary[room.slug];
        const members = s?.members ?? 0;
        const last = s?.lastMessage ?? null;
        return (
          <Link key={room.slug} href={`/${locale}/rooms/${room.slug}`}>
            <div className="bg-tsua-card border border-tsua-border rounded-2xl p-4 hover:border-tsua-green/50 hover:bg-tsua-card/80 transition-all cursor-pointer group">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{room.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-tsua-text group-hover:text-tsua-green transition-colors">
                      {locale === 'he' ? room.nameHe : room.nameEn}
                    </h3>
                    {room.isOfficial && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-tsua-green/10 text-tsua-green border border-tsua-green/30 rounded-full">
                        ✓ {locale === 'he' ? 'רשמית' : 'Official'}
                      </span>
                    )}
                    {s?.isMember && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgb(var(--rgb-border) / 0.4)', color: 'var(--text2)' }}>
                        {locale === 'he' ? '✓ חבר' : '✓ Member'}
                      </span>
                    )}
                  </div>
                  <p className="text-tsua-muted text-sm mt-1 truncate">
                    {locale === 'he' ? room.descHe : room.descEn}
                  </p>

                  {/* Last message preview — makes the directory feel alive. */}
                  {last && (
                    <div className="flex items-center gap-1.5 mt-2 rounded-lg px-2 py-1.5" style={{ background: 'rgb(var(--rgb-border) / 0.18)' }}>
                      <span className="text-xs shrink-0">💬</span>
                      <span className="text-xs text-tsua-text/80 truncate min-w-0">
                        <span className="text-tsua-muted">{last.authorName}: </span>{last.body}
                      </span>
                      <span className="text-[10px] text-tsua-muted ms-auto shrink-0 whitespace-nowrap">{relTime(last.createdAt)}</span>
                    </div>
                  )}

                  {/* Real member count */}
                  <div className="flex items-center gap-1 mt-2 text-tsua-muted text-xs">
                    {!loaded ? (
                      <span className="inline-block w-20 h-3 rounded animate-pulse" style={{ background: 'rgb(var(--rgb-border) / 0.5)' }} />
                    ) : members > 0 ? (
                      <>
                        <span>👥</span>
                        <span className="tabular-nums" dir="ltr">{members.toLocaleString()}</span>
                        <span>{locale === 'he' ? 'חברים' : 'members'}</span>
                      </>
                    ) : (
                      <span style={{ color: 'var(--accent)' }}>
                        🌱 {locale === 'he' ? 'קהילה חדשה — הצטרפו!' : 'New community — join!'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon, ChartBarIcon, UsersIcon, BellIcon, NewspaperIcon, DocumentTextIcon, TrophyIcon, BriefcaseIcon,
  BookmarkIcon, Cog6ToothIcon, FireIcon, Squares2X2Icon, CurrencyDollarIcon, ScaleIcon, CalendarDaysIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckIconSolid } from '@heroicons/react/24/solid';
import { TrendingWidget } from './TrendingWidget';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UsersIcon as UsersIconSolid,
  BellIcon as BellIconSolid,
  NewspaperIcon as NewspaperIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  TrophyIcon as TrophyIconSolid,
  BriefcaseIcon as BriefcaseIconSolid,
  BookmarkIcon as BookmarkSolid,
  Cog6ToothIcon as Cog6ToothSolid,
  FireIcon as FireIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  ScaleIcon as ScaleIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
} from '@heroicons/react/24/solid';

const NAV_ITEMS = [
  { key: 'feed',        icon: HomeIcon,         iconActive: HomeIconSolid,         href: '',             label: 'פיד' },
  { key: 'markets',     icon: ChartBarIcon,     iconActive: ChartBarIconSolid,     href: '/markets',     label: 'שווקים' },
  { key: 'sectors',     icon: Squares2X2Icon,   iconActive: Squares2X2IconSolid,   href: '/sectors',     label: '🗺️ מגזרים' },
  { key: 'crypto',      icon: CurrencyDollarIcon, iconActive: CurrencyDollarIconSolid, href: '/crypto',   label: '₿ קריפטו' },
  { key: 'compare',     icon: ScaleIcon,        iconActive: ScaleIconSolid,        href: '/compare',     label: '⚖️ השוואה' },
  { key: 'earnings',    icon: CalendarDaysIcon, iconActive: CalendarDaysIconSolid, href: '/earnings',    label: '📅 דוחות' },
  { key: 'hot',         icon: FireIcon,         iconActive: FireIconSolid,         href: '/hot',         label: '🔥 חמות' },
  { key: 'news',        icon: NewspaperIcon,    iconActive: NewspaperIconSolid,    href: '/news',        label: 'חדשות' },
  { key: 'rooms',       icon: UsersIcon,        iconActive: UsersIconSolid,        href: '/rooms',       label: 'חדרים' },
  { key: 'leaderboard', icon: TrophyIcon,       iconActive: TrophyIconSolid,       href: '/leaderboard', label: 'לידרבורד' },
  { key: 'bookmarks',   icon: BookmarkIcon,     iconActive: BookmarkSolid,         href: '/bookmarks',   label: 'שמורים' },
  { key: 'portfolio',   icon: BriefcaseIcon,    iconActive: BriefcaseIconSolid,    href: '/portfolio',   label: 'תיק השקעות' },
  { key: 'reports',     icon: DocumentTextIcon, iconActive: DocumentTextIconSolid, href: '/reports',     label: 'דוחות' },
  { key: 'alerts',      icon: BellIcon,         iconActive: BellIconSolid,         href: '/alerts',      label: 'התראות' },
  { key: 'settings',    icon: Cog6ToothIcon,    iconActive: Cog6ToothSolid,        href: '/settings',    label: 'הגדרות' },
] as const;

export function Sidebar() {
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  const displayName = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const initial = displayName.charAt(0).toUpperCase();

  // Show admin link only for users whose email is in ADMIN_EMAILS.
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    let alive = true;
    fetch('/api/admin/check', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (alive) setIsAdmin(!!d?.isAdmin); })
      .catch(() => {});
    return () => { alive = false; };
  }, [user]);

  return (
    <aside className="hidden md:flex flex-col w-52 shrink-0 gap-0.5 pt-1">

      {/* Nav items */}
      {NAV_ITEMS.map(({ key, icon: Icon, iconActive: IconActive, href, label }) => {
        const fullHref = `/${locale}${href}`;
        const isActive = href === ''
          ? pathname === `/${locale}` || pathname === `/${locale}/`
          : pathname.startsWith(fullHref);

        return (
          <Link
            key={key}
            href={fullHref}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
            style={isActive
              ? {
                  background: 'rgba(0,229,176,0.08)',
                  border: '1px solid rgba(0,229,176,0.15)',
                }
              : {
                  border: '1px solid transparent',
                }
            }
          >
            {/* Active accent bar */}
            {isActive && (
              <span
                className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-e-full"
                style={{ background: '#00e5b0', boxShadow: '2px 0 10px rgba(0,229,176,0.6)' }}
              />
            )}

            {/* Icon */}
            <span className={`transition-all duration-150 ${isActive ? '' : 'group-hover:translate-x-0.5'}`}
              style={{ color: isActive ? '#00e5b0' : undefined }}>
              {isActive
                ? <IconActive
                    className="w-[18px] h-[18px] shrink-0"
                    style={{ color: '#00e5b0', filter: 'drop-shadow(0 0 5px rgba(0,229,176,0.5))' }}
                  />
                : <Icon
                    className="w-[18px] h-[18px] shrink-0 transition-colors"
                    style={{ color: 'var(--muted)' }}
                  />
              }
            </span>

            {/* Label */}
            <span
              className="text-[13px] transition-colors"
              style={{
                color: isActive ? 'var(--text)' : 'var(--text2)',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.01em',
              }}
            >
              {label}
            </span>

            {/* Alerts live dot */}
            {key === 'alerts' && (
              <span
                className="ms-auto w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ background: '#00e5b0', boxShadow: '0 0 6px rgba(0,229,176,0.8)' }}
              />
            )}
          </Link>
        );
      })}

      {/* Admin shortcut — only visible to admins */}
      {isAdmin && (() => {
        const adminHref = `/${locale}/admin`;
        const adminActive = pathname.startsWith(adminHref);
        const AdminIcon = adminActive ? ShieldCheckIconSolid : ShieldCheckIcon;
        return (
          <Link
            href={adminHref}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
            style={adminActive
              ? { background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.3)' }
              : { border: '1px solid rgba(0,229,176,0.08)' }}
          >
            <AdminIcon
              className="w-[18px] h-[18px] shrink-0"
              style={{ color: '#00e5b0', filter: 'drop-shadow(0 0 5px rgba(0,229,176,0.5))' }}
            />
            <span
              className="text-[13px]"
              style={{ color: '#00e5b0', fontWeight: 800, letterSpacing: '-0.01em' }}
            >
              חדר בקרה
            </span>
            <span
              className="ms-auto text-[9px] font-black px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,229,176,0.15)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.3)' }}
            >
              ADMIN
            </span>
          </Link>
        );
      })()}

      {/* Divider */}
      <div className="my-2 mx-1" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      {/* Trending widget */}
      <TrendingWidget />

      <div className="my-2 mx-1" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />

      {/* User card or CTA */}
      {user ? (
        <Link
          href={`/${locale}/profile/${displayName}`}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group hover:bg-white/3"
          style={{ border: '1px solid var(--border)' }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px] shrink-0 transition-transform group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #003d2e 0%, #00e5b0 150%)',
              border: '1px solid rgba(0,229,176,0.25)',
              color: '#00e5b0',
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-[13px] font-bold truncate"
              style={{ color: '#ddeeff', letterSpacing: '-0.01em' }}
            >
              {displayName}
            </div>
            <div className="text-[10px] font-mono" style={{ color: 'rgba(90,112,144,0.7)' }}>
              הפרופיל שלי →
            </div>
          </div>
        </Link>
      ) : (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,176,0.04) 0%, rgba(10,16,30,0.6) 100%)',
            border: '1px solid rgba(0,229,176,0.12)',
          }}
        >
          <div className="text-center space-y-1">
            <div
              className="text-xs font-black uppercase tracking-widest"
              style={{ color: 'rgba(0,229,176,0.7)' }}
            >
              הצטרף עכשיו
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text2)' }}>
              קהילת המשקיעים הישראלים
            </p>
          </div>
          <Link
            href={`/${locale}/signup`}
            className="block text-center text-[12px] font-black py-2 rounded-lg transition-all hover:brightness-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00e5b0, #00a884)',
              color: '#060b16',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 16px rgba(0,229,176,0.2)',
            }}
          >
            הצטרף חינם
          </Link>
          <Link
            href={`/${locale}/login`}
            className="block text-center text-[11px] font-semibold py-1.5 transition-colors"
            style={{ color: 'rgba(90,112,144,0.7)' }}
          >
            כבר יש לי חשבון
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {['תנאי שימוש', 'פרטיות', 'צור קשר'].map((label, i) => (
          <a
            key={i}
            href={i === 0 ? '/terms' : i === 1 ? '/privacy' : 'mailto:support@tsua.co'}
            className="text-[10px] transition-colors hover:text-tsua-muted"
            style={{ color: 'var(--muted2)', fontFamily: 'monospace' }}
          >
            {label}
          </a>
        ))}
      </div>
    </aside>
  );
}

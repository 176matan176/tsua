'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
  HomeIcon, ChartBarIcon, NewspaperIcon, TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  NewspaperIcon as NewspaperIconSolid,
  TrophyIcon as TrophyIconSolid,
} from '@heroicons/react/24/solid';
import { ThemeToggleIcon } from './ThemeToggle';
import { MobileComposeSheet } from '@/components/feed/MobileComposeSheet';
import { MobileRightDrawer } from './MobileRightDrawer';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon as ArrowTrendingUpIconSolid } from '@heroicons/react/24/solid';

const LEFT_ITEMS = [
  { key: 'feed',    icon: HomeIcon,     iconActive: HomeIconSolid,     href: '',         label: 'פיד' },
  { key: 'markets', icon: ChartBarIcon, iconActive: ChartBarIconSolid, href: '/markets', label: 'שווקים' },
] as const;

const RIGHT_ITEMS = [
  { key: 'leaderboard', icon: TrophyIcon,    iconActive: TrophyIconSolid,    href: '/leaderboard', label: 'דירוג' },
  { key: 'news',        icon: NewspaperIcon, iconActive: NewspaperIconSolid, href: '/news',        label: 'חדשות' },
] as const;

function NavItem({ navKey, icon: Icon, iconActive: IconActive, href, locale, pathname, label }: {
  navKey: string; icon: any; iconActive: any; href: string; locale: string; pathname: string; label: string;
}) {
  const fullHref = `/${locale}${href}`;
  const isActive = href === ''
    ? pathname === `/${locale}` || pathname === `/${locale}/` || pathname === '/' || pathname === ''
    : pathname.startsWith(fullHref) || pathname.startsWith(href);

  return (
    <Link
      href={fullHref}
      className="relative flex flex-col items-center justify-center gap-1 px-5 py-1 transition-all duration-200 active:scale-90"
    >
      {isActive && (
        <span
          className="absolute inset-0 rounded-2xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,229,176,0.1) 0%, transparent 70%)' }}
        />
      )}
      {isActive && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }}
        />
      )}
      {isActive
        ? <IconActive
            className="w-6 h-6 relative"
            style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(0,229,176,0.6))' }}
          />
        : <Icon
            className="w-6 h-6 relative transition-colors"
            style={{ color: 'var(--muted)' }}
          />
      }
      <span
        className="text-[10px] font-semibold relative"
        style={{
          color: isActive ? 'var(--accent)' : 'var(--muted)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const locale = useLocale();
  const pathname = usePathname();
  const [composeOpen, setComposeOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <div
          className="flex items-center justify-around px-1 pt-1.5"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {LEFT_ITEMS.map(item => (
            <NavItem
              key={item.key}
              navKey={item.key}
              icon={item.icon}
              iconActive={item.iconActive}
              href={item.href}
              locale={locale}
              pathname={pathname}
              label={item.label}
            />
          ))}

          {/* Center compose button — opens sheet */}
          <button
            onClick={() => setComposeOpen(true)}
            className="flex flex-col items-center gap-1 -mt-5 transition-transform duration-150 active:scale-90"
          >
            <div
              className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
                boxShadow: '0 0 24px rgba(0,229,176,0.4), 0 6px 16px rgba(0,0,0,0.4)',
                border: '1.5px solid rgba(0,229,176,0.35)',
              }}
            >
              <PlusIcon className="w-6 h-6" style={{ color: 'var(--accent-contrast)', strokeWidth: 3 }} />
            </div>
            <span
              className="text-[10px] font-black"
              style={{ color: 'var(--accent)', letterSpacing: '0.02em' }}
            >
              פרסם
            </span>
          </button>

          {RIGHT_ITEMS.map(item => (
            <NavItem
              key={item.key}
              navKey={item.key}
              icon={item.icon}
              iconActive={item.iconActive}
              href={item.href}
              locale={locale}
              pathname={pathname}
              label={item.label}
            />
          ))}

          {/* Trending drawer trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex flex-col items-center justify-center gap-1 px-5 py-1 transition-all duration-200 active:scale-90"
          >
            {drawerOpen && (
              <span
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(0,229,176,0.1) 0%, transparent 70%)' }}
              />
            )}
            {drawerOpen && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }}
              />
            )}
            {drawerOpen
              ? <ArrowTrendingUpIconSolid className="w-6 h-6 relative" style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 8px rgba(0,229,176,0.6))' }} />
              : <ArrowTrendingUpIcon     className="w-6 h-6 relative" style={{ color: 'var(--muted)' }} />
            }
            <span
              className="text-[10px] font-semibold relative"
              style={{ color: drawerOpen ? 'var(--accent)' : 'var(--muted)', letterSpacing: '0.01em' }}
            >
              טרנד
            </span>
          </button>

          <ThemeToggleIcon />
        </div>
      </nav>

      {/* Mobile compose sheet */}
      <MobileComposeSheet
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
      />

      {/* Mobile right drawer */}
      <MobileRightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}

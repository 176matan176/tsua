'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
  HomeIcon, ChartBarIcon, NewspaperIcon, TrophyIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggleIcon } from './ThemeToggle';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  NewspaperIcon as NewspaperIconSolid,
  TrophyIcon as TrophyIconSolid,
} from '@heroicons/react/24/solid';

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
      {/* Glow bg on active */}
      {isActive && (
        <span
          className="absolute inset-0 rounded-2xl"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,229,176,0.1) 0%, transparent 70%)' }}
        />
      )}

      {/* Top line indicator */}
      {isActive && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #00e5b0, transparent)' }}
        />
      )}

      {isActive
        ? <IconActive
            className="w-6 h-6 relative"
            style={{ color: '#00e5b0', filter: 'drop-shadow(0 0 8px rgba(0,229,176,0.7))' }}
          />
        : <Icon
            className="w-6 h-6 relative transition-colors"
            style={{ color: 'rgba(90,112,144,0.7)' }}
          />
      }
      <span
        className="text-[10px] font-semibold relative"
        style={{
          color: isActive ? '#00e5b0' : 'rgba(90,112,144,0.6)',
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

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(5,9,18,0.97)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderTop: '1px solid rgba(26,40,64,0.45)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
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

        {/* Center compose button */}
        <Link
          href={`/${locale}`}
          className="flex flex-col items-center gap-1 -mt-5 transition-transform duration-150 active:scale-90"
        >
          <div
            className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00e5b0 0%, #009972 100%)',
              boxShadow: '0 0 24px rgba(0,229,176,0.45), 0 6px 16px rgba(0,0,0,0.5)',
              border: '1.5px solid rgba(0,229,176,0.4)',
            }}
          >
            <PlusIcon className="w-6 h-6" style={{ color: '#03120d', strokeWidth: 3 }} />
          </div>
          <span
            className="text-[10px] font-black"
            style={{ color: '#00e5b0', letterSpacing: '0.02em' }}
          >
            פרסם
          </span>
        </Link>

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

        {/* Theme toggle */}
        <ThemeToggleIcon />
      </div>
    </nav>
  );
}

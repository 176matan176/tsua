'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  XMarkIcon,
  HomeIcon,
  ChartBarIcon,
  NewspaperIcon,
  TrophyIcon,
  BellIcon,
  BookmarkIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  UsersIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  FireIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
  ScaleIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface NavLinkProps {
  href: string;
  icon: any;
  label: string;
  locale: string;
  pathname: string;
  onClose: () => void;
  badge?: string;
}

function NavLink({ href, icon: Icon, label, locale, pathname, onClose, badge }: NavLinkProps) {
  const fullHref = `/${locale}${href}`;
  const isActive = href === ''
    ? pathname === `/${locale}` || pathname === `/${locale}/`
    : pathname.startsWith(fullHref);

  return (
    <Link
      href={fullHref}
      onClick={onClose}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]"
      style={isActive
        ? {
            background: 'rgba(0,229,176,0.1)',
            border: '1px solid rgba(0,229,176,0.22)',
            color: 'var(--text, #e8f4ff)',
          }
        : { color: 'var(--text, #e8f4ff)' }
      }
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: isActive ? 'rgba(0,229,176,0.2)' : 'var(--surface2, rgba(15,25,41,0.5))',
          border: isActive ? '1px solid rgba(0,229,176,0.35)' : '1px solid var(--border, rgba(26,40,64,0.6))',
          boxShadow: isActive ? '0 0 10px rgba(0,229,176,0.15)' : 'none',
        }}
      >
        <Icon style={{ color: isActive ? '#00e5b0' : 'var(--accent, #00e5b0)', width: 18, height: 18 }} />
      </div>
      <span
        className="text-sm flex-1 truncate"
        style={{ fontWeight: isActive ? 800 : 600 }}
      >
        {label}
      </span>
      {badge && (
        <span
          className="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0"
          style={{
            background: 'rgba(0,229,176,0.15)',
            color: '#00e5b0',
            border: '1px solid rgba(0,229,176,0.3)',
          }}
        >
          {badge}
        </span>
      )}
      <span style={{ color: 'var(--muted, #5a7090)' }} className="text-xs opacity-50">←</span>
    </Link>
  );
}

export function MobileNavDrawer({ isOpen, onClose }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName =
    user?.user_metadata?.username ||
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    '';
  const initial = displayName.charAt(0).toUpperCase();

  const close = () => onClose();

  // Main navigation — main public destinations
  const mainLinks = [
    { href: '',             icon: HomeIcon,      label: 'פיד' },
    { href: '/markets',     icon: ChartBarIcon,  label: 'שווקים' },
    { href: '/news',        icon: NewspaperIcon, label: 'חדשות' },
    { href: '/leaderboard', icon: TrophyIcon,    label: 'לידרבורד' },
    { href: '/rooms',       icon: UsersIcon,     label: 'חדרים' },
    { href: '/live',        icon: MegaphoneIcon, label: 'פיד חי' },
  ];

  // Discovery — market exploration
  const discoveryLinks = [
    { href: '/sectors',  icon: Squares2X2Icon,     label: 'מגזרים' },
    { href: '/crypto',   icon: CurrencyDollarIcon, label: 'קריפטו' },
    { href: '/hot',      icon: FireIcon,           label: 'חמות', badge: '🔥' },
    { href: '/compare',  icon: ScaleIcon,          label: 'השוואה' },
    { href: '/earnings', icon: CalendarDaysIcon,   label: 'דוחות כספיים' },
  ];

  // Personal (only shown for logged in user)
  const personalLinks = user ? [
    { href: `/profile/${displayName}`, icon: UserCircleIcon,    label: 'הפרופיל שלי' },
    { href: '/alerts',                 icon: BellIcon,          label: 'התראות' },
    { href: '/portfolio',              icon: BriefcaseIcon,     label: 'תיק השקעות' },
    { href: '/watchlist',              icon: BookmarkIcon,      label: 'רשימת מעקב' },
    { href: '/bookmarks',              icon: BookmarkIcon,      label: 'שמורים' },
    { href: '/reports',                icon: DocumentTextIcon,  label: 'דוחות' },
  ] : [];

  async function handleLogout() {
    close();
    await signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] md:hidden"
        style={{
          background: 'rgba(2,5,12,0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.22s ease-out',
        }}
        onClick={close}
      />

      {/* Drawer — slides in from the start side (right in RTL) */}
      <div
        className="fixed top-0 bottom-0 z-[91] w-[88vw] max-w-[360px] flex flex-col overflow-hidden md:hidden"
        style={{
          // Hamburger is on the START (right in RTL) → drawer comes from the same side
          insetInlineStart: 0,
          background: 'var(--card, rgba(8,14,26,0.99))',
          borderInlineEnd: '1px solid var(--border, rgba(26,40,64,0.6))',
          boxShadow: '16px 0 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
          animation: 'slideInStart 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
        dir="rtl"
      >
        {/* Header with logo + close */}
        <div
          className="shrink-0 px-4 py-4"
          style={{ borderBottom: '1px solid var(--border2, rgba(26,40,64,0.6))' }}
        >
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/${locale}`}
              onClick={close}
              className="flex items-center gap-2.5"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #00e5b0 0%, #0090cc 100%)',
                  boxShadow: '0 0 14px rgba(0,229,176,0.35)',
                }}
              >
                <span style={{ color: '#03120d', fontWeight: 900, fontSize: '16px', fontFamily: 'Heebo, Arial, sans-serif' }}>ת</span>
              </div>
              <div className="flex flex-col leading-none gap-0.5">
                <span style={{ color: 'var(--text, #e8f4ff)', fontWeight: 900, fontSize: '16px', letterSpacing: '-0.02em' }}>תשואה</span>
                <div className="flex items-center gap-1">
                  <span
                    className="w-1 h-1 rounded-full animate-pulse"
                    style={{ background: '#00e5b0', boxShadow: '0 0 4px rgba(0,229,176,0.8)' }}
                  />
                  <span style={{ color: 'rgba(0,229,176,0.7)', fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.12em' }}>LIVE</span>
                </div>
              </div>
            </Link>
            <button
              onClick={close}
              className="p-1.5 rounded-lg transition-all active:scale-90"
              style={{
                color: 'var(--muted, #5a7090)',
                border: '1px solid var(--border, rgba(26,40,64,0.7))',
                background: 'var(--surface2, rgba(15,25,41,0.5))',
              }}
              aria-label="סגור"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(26,40,64,0.5)' }} />
          ) : user ? (
            <Link
              href={`/${locale}/profile/${displayName}`}
              onClick={close}
              className="flex items-center gap-3 p-2 rounded-xl transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(59,130,246,0.05))',
                border: '1px solid rgba(0,229,176,0.18)',
              }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #00e5b0, #3b82f6)',
                  color: '#060b16',
                  boxShadow: '0 0 12px rgba(0,229,176,0.25)',
                }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate" style={{ color: 'var(--text, #e8f4ff)' }}>
                  {displayName}
                </div>
                <div className="text-[11px] truncate" style={{ color: 'var(--muted, #5a7090)' }}>
                  {user.email}
                </div>
              </div>
              <span style={{ color: 'var(--muted, #5a7090)' }} className="text-xs">←</span>
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                href={`/${locale}/login`}
                onClick={close}
                className="flex-1 text-center text-sm font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95"
                style={{
                  color: 'var(--text, #e8f4ff)',
                  background: 'var(--surface2, rgba(15,25,41,0.6))',
                  border: '1px solid var(--border, rgba(26,40,64,0.7))',
                }}
              >
                כניסה
              </Link>
              <Link
                href={`/${locale}/signup`}
                onClick={close}
                className="flex-1 text-center text-sm font-black px-3 py-2.5 rounded-xl transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
                  color: '#060b16',
                  boxShadow: '0 4px 14px rgba(0,229,176,0.3)',
                }}
              >
                הצטרף חינם
              </Link>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {/* Main navigation */}
          <div className="px-2 pt-3 pb-1">
            <div
              className="px-3 pb-1.5 text-[10px] font-black tracking-widest uppercase"
              style={{ color: 'var(--muted, #5a7090)' }}
            >
              ראשי
            </div>
            {mainLinks.map(link => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                locale={locale}
                pathname={pathname}
                onClose={close}
              />
            ))}
          </div>

          {/* Discovery */}
          <div
            className="px-2 pt-3 pb-1 mt-2"
            style={{ borderTop: '1px solid var(--border2, rgba(26,40,64,0.5))' }}
          >
            <div
              className="px-3 pb-1.5 pt-2 text-[10px] font-black tracking-widest uppercase"
              style={{ color: 'var(--muted, #5a7090)' }}
            >
              גלה שוק
            </div>
            {discoveryLinks.map(link => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                locale={locale}
                pathname={pathname}
                onClose={close}
                badge={(link as any).badge}
              />
            ))}
          </div>

          {/* Personal section */}
          {user && personalLinks.length > 0 && (
            <div
              className="px-2 pt-3 pb-1 mt-2"
              style={{ borderTop: '1px solid var(--border2, rgba(26,40,64,0.5))' }}
            >
              <div
                className="px-3 pb-1.5 pt-2 text-[10px] font-black tracking-widest uppercase"
                style={{ color: 'var(--muted, #5a7090)' }}
              >
                שלי
              </div>
              {personalLinks.map(link => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  icon={link.icon}
                  label={link.label}
                  locale={locale}
                  pathname={pathname}
                  onClose={close}
                />
              ))}
            </div>
          )}

          {/* Tools — theme + settings + logout */}
          <div
            className="px-2 pt-3 pb-2 mt-2"
            style={{ borderTop: '1px solid var(--border2, rgba(26,40,64,0.5))' }}
          >
            <div
              className="px-3 pb-1.5 pt-2 text-[10px] font-black tracking-widest uppercase"
              style={{ color: 'var(--muted, #5a7090)' }}
            >
              כלים
            </div>

            {/* Theme toggle row */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ color: 'var(--text, #e8f4ff)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--surface2, rgba(15,25,41,0.5))',
                  border: '1px solid var(--border, rgba(26,40,64,0.6))',
                }}
              >
                <span style={{ fontSize: 16 }}>🎨</span>
              </div>
              <span className="text-sm font-semibold flex-1">מצב תצוגה</span>
              <div onClick={(e) => e.stopPropagation()}>
                <ThemeToggle />
              </div>
            </div>

            {user && (
              <NavLink
                href="/settings"
                icon={Cog6ToothIcon}
                label="הגדרות"
                locale={locale}
                pathname={pathname}
                onClose={close}
              />
            )}

            {user && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] text-right"
                style={{ color: '#ff4d6a' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(255,77,106,0.08)',
                    border: '1px solid rgba(255,77,106,0.18)',
                  }}
                >
                  <ArrowLeftOnRectangleIcon style={{ color: '#ff4d6a', width: 18, height: 18 }} />
                </div>
                <span className="text-sm font-bold flex-1">יציאה</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 pt-4 pb-2 mt-2 flex flex-wrap gap-x-3 gap-y-1 justify-center"
            style={{ borderTop: '1px solid var(--border2, rgba(26,40,64,0.5))' }}
          >
            <Link
              href={`/${locale}/terms`}
              onClick={close}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--muted, rgba(90,112,144,0.7))', fontFamily: 'monospace' }}
            >
              תנאי שימוש
            </Link>
            <Link
              href={`/${locale}/privacy`}
              onClick={close}
              className="text-[10px] transition-colors"
              style={{ color: 'var(--muted, rgba(90,112,144,0.7))', fontFamily: 'monospace' }}
            >
              פרטיות
            </Link>
            <a
              href="mailto:support@tsua.co"
              className="text-[10px] transition-colors"
              style={{ color: 'var(--muted, rgba(90,112,144,0.7))', fontFamily: 'monospace' }}
            >
              צור קשר
            </a>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes slideInStart {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

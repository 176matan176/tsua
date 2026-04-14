'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon, UserCircleIcon, ChevronDownIcon, XMarkIcon, BookmarkIcon, BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface StockResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

interface UserResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  followers: number;
}

interface SearchResults {
  stocks: StockResult[];
  users: UserResult[];
}

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleSearchChange(val: string) {
    setSearchQuery(val);
    setSearchOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 280);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  function goToStock(ticker: string) {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    setMobileSearchOpen(false);
    router.push(`/${locale}/stocks/${ticker}`);
  }

  function goToUser(username: string) {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    setMobileSearchOpen(false);
    router.push(`/${locale}/profile/${username}`);
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults(null);
    setSearchOpen(false);
  }

  const hasResults = searchResults && (searchResults.stocks.length > 0 || searchResults.users.length > 0);
  const showDropdown = searchOpen && searchQuery.length > 0;

  const displayName = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const initial = displayName.charAt(0).toUpperCase();

  const SearchDropdown = () => (
    <div
      className="absolute top-full mt-2 left-0 right-0 rounded-2xl overflow-hidden z-50"
      style={{
        background: 'rgba(8,14,26,0.99)',
        border: '1px solid rgba(26,40,64,0.8)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      {searchLoading && (
        <div className="flex items-center justify-center py-6 gap-2 text-tsua-muted text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-tsua-muted border-t-tsua-accent animate-spin" />
          מחפש...
        </div>
      )}

      {!searchLoading && !hasResults && searchQuery.length > 0 && (
        <div className="py-6 text-center text-tsua-muted text-sm">
          {`אין תוצאות עבור "${searchQuery}"`}
        </div>
      )}

      {!searchLoading && hasResults && (
        <>
          {/* Stocks */}
          {searchResults!.stocks.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase"
                style={{ color: '#5a7090', borderBottom: '1px solid rgba(26,40,64,0.5)' }}
              >
                מניות
              </div>
              {searchResults!.stocks.map(s => (
                <button
                  key={s.ticker}
                  onClick={() => goToStock(s.ticker)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-white/4 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs"
                    style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
                  >
                    {s.ticker.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-tsua-text group-hover:text-tsua-accent transition-colors">
                        ${s.ticker}
                      </span>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(26,40,64,0.6)', color: '#5a7090' }}
                      >
                        {s.exchange || s.type}
                      </span>
                    </div>
                    <div className="text-xs text-tsua-muted truncate">{s.name}</div>
                  </div>
                  <span className="text-tsua-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              ))}
            </div>
          )}

          {/* Users */}
          {searchResults!.users.length > 0 && (
            <div style={{ borderTop: searchResults!.stocks.length > 0 ? '1px solid rgba(26,40,64,0.5)' : 'none' }}>
              <div
                className="px-4 py-2 text-[10px] font-bold tracking-widest uppercase"
                style={{ color: '#5a7090', borderBottom: '1px solid rgba(26,40,64,0.5)' }}
              >
                משתמשים
              </div>
              {searchResults!.users.map(u => (
                <button
                  key={u.id}
                  onClick={() => goToUser(u.username)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-start hover:bg-white/4 transition-colors group"
                >
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.username} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                      style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)', color: '#060b16' }}
                    >
                      {(u.display_name || u.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-tsua-text group-hover:text-tsua-accent transition-colors truncate">
                        {u.display_name || u.username}
                      </span>
                      {u.is_verified && (
                        <span style={{ color: '#00e5b0' }} className="text-xs">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-tsua-muted">
                      @{u.username}
                      {u.followers > 0 && (
                        <span className="ml-2">
                          {`${u.followers.toLocaleString()} עוקבים`}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick tips when just opened */}
      {!searchLoading && !searchResults && searchQuery.length > 0 && (
        <div className="py-4 px-4 text-xs text-tsua-muted">
          מחפש...
        </div>
      )}
    </div>
  );

  return (
    <>
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(5,9,18,0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(26,40,64,0.4)',
          boxShadow: '0 1px 0 rgba(0,229,176,0.03), 0 4px 24px rgba(0,0,0,0.35)',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 md:px-5 h-14 flex items-center gap-3">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 shrink-0 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #00e5b0 0%, #0090cc 100%)',
                boxShadow: '0 0 18px rgba(0,229,176,0.3)',
              }}
            >
              <span style={{ color: '#03120d', fontWeight: 900, fontSize: '15px', fontFamily: 'Heebo, Arial, sans-serif' }}>ת</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none gap-0.5">
              <span style={{ color: '#e8f4ff', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em' }}>תשואה</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-1 h-1 rounded-full animate-pulse"
                  style={{ background: '#00e5b0', boxShadow: '0 0 4px rgba(0,229,176,0.8)' }}
                />
                <span style={{ color: 'rgba(0,229,176,0.6)', fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.12em' }}>LIVE</span>
              </div>
            </div>
          </Link>

          {/* Desktop Search */}
          <div className="flex-1 max-w-sm hidden sm:block" ref={searchRef}>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10" style={{ color: 'rgba(90,112,144,0.6)' }} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="$TEVA, NVDA, חיפוש..."
                className="w-full rounded-lg py-2 ps-9 pe-8 text-[13px] placeholder:text-tsua-muted focus:outline-none transition-all duration-200 font-mono"
                style={{
                  background: searchOpen ? 'rgba(12,20,36,0.98)' : 'rgba(12,18,32,0.7)',
                  border: searchOpen ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(26,40,64,0.6)',
                  boxShadow: searchOpen ? '0 0 0 3px rgba(0,229,176,0.07), inset 0 1px 0 rgba(255,255,255,0.02)' : 'inset 0 1px 0 rgba(255,255,255,0.01)',
                  color: '#c8ddf4',
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-tsua-muted hover:text-tsua-text transition-colors"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dropdown */}
              {showDropdown && <SearchDropdown />}
            </div>
          </div>

          <div className="flex-1 sm:hidden" />

          {/* Mobile search button */}
          <button
            onClick={() => { setMobileSearchOpen(true); setTimeout(() => mobileInputRef.current?.focus(), 50); }}
            className="sm:hidden p-2 rounded-xl text-tsua-muted hover:text-tsua-text transition-colors hover:bg-tsua-card"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Theme toggle — desktop only (mobile uses BottomNav) */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* Notifications */}
            {user && (
              <div className="hidden md:block">
                <NotificationsDropdown userId={user.id} />
              </div>
            )}

            {/* Auth area */}
            {loading ? (
              <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(26,40,64,0.6)' }} />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 hover:opacity-90"
                  style={{
                    background: menuOpen ? 'rgba(15,25,41,0.95)' : 'rgba(15,25,41,0.7)',
                    border: menuOpen ? '1px solid rgba(0,229,176,0.2)' : '1px solid rgba(26,40,64,0.7)',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-black text-tsua-bg text-xs shrink-0"
                    style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)', boxShadow: '0 0 10px rgba(0,229,176,0.3)' }}
                  >
                    {initial}
                  </div>
                  <span className="text-sm font-semibold text-tsua-text hidden sm:block max-w-[80px] truncate">
                    {displayName}
                  </span>
                  <ChevronDownIcon className={`w-3.5 h-3.5 text-tsua-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div
                    className="absolute end-0 top-full mt-2 w-52 rounded-2xl py-1.5 z-50"
                    style={{ background: 'rgba(10,16,30,0.99)', border: '1px solid rgba(26,40,64,0.8)', boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)' }}
                  >
                    {/* User info */}
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.6)' }}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-black text-tsua-bg text-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
                        >
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-tsua-text truncate">{displayName}</div>
                          <div className="text-[11px] text-tsua-muted truncate">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href={`/${locale}/profile/${displayName}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <UserCircleIcon className="w-4 h-4 shrink-0" />
                        הפרופיל שלי
                      </Link>
                      <Link
                        href={`/${locale}/watchlist`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <BookmarkIcon className="w-4 h-4 shrink-0" />
                        רשימת מעקב
                      </Link>
                      <Link
                        href={`/${locale}/portfolio`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <span className="text-base leading-none">💼</span>
                        התיק שלי
                      </Link>
                      <Link
                        href={`/${locale}/alerts`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <BellIcon className="w-4 h-4 shrink-0" />
                        התראות
                      </Link>
                      <Link
                        href={`/${locale}/bookmarks`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <span className="text-base leading-none">🔖</span>
                        סימניות
                      </Link>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(26,40,64,0.6)' }} className="py-1">
                      <Link
                        href={`/${locale}/settings`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-tsua-muted hover:text-tsua-text hover:bg-tsua-card transition-all"
                      >
                        <Cog6ToothIcon className="w-4 h-4 shrink-0" />
                        הגדרות
                      </Link>
                      <button
                        onClick={async () => { setMenuOpen(false); await signOut(); router.push(`/${locale}`); router.refresh(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all text-start hover:bg-red-500/8"
                        style={{ color: '#ff4d6a' }}
                      >
                        <span className="text-base leading-none">↩</span>
                        יציאה
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/${locale}/login`}
                  className="text-sm font-semibold px-3 py-1.5 rounded-xl text-tsua-muted hover:text-tsua-text transition-all hidden sm:block"
                  style={{ background: 'rgba(15,25,41,0.5)', border: '1px solid rgba(26,40,64,0.7)' }}
                >
                  כניסה
                </Link>
                <Link
                  href={`/${locale}/signup`}
                  className="flex items-center gap-1.5 text-sm font-black px-4 py-1.5 rounded-xl text-tsua-bg transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.3)' }}
                >
                  <span className="hidden sm:inline">הצטרף חינם</span>
                  <span className="sm:hidden">+</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen search overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[100] sm:hidden flex flex-col"
          style={{ background: 'rgba(6,11,22,0.98)', backdropFilter: 'blur(24px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(26,40,64,0.5)' }}>
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tsua-muted pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="חפש מניה או משתמש..."
                className="w-full rounded-xl py-2.5 ps-9 pe-4 text-sm placeholder:text-tsua-muted focus:outline-none"
                style={{
                  background: 'rgba(15,25,41,0.8)',
                  border: '1px solid rgba(0,229,176,0.3)',
                  boxShadow: '0 0 0 3px rgba(0,229,176,0.08)',
                  color: '#e8f0ff',
                }}
                autoFocus
              />
            </div>
            <button
              onClick={() => { setMobileSearchOpen(false); clearSearch(); }}
              className="text-sm font-semibold px-3 py-2 rounded-xl text-tsua-muted hover:text-tsua-text transition-colors"
              style={{ background: 'rgba(15,25,41,0.5)', border: '1px solid rgba(26,40,64,0.6)' }}
            >
              ביטול
            </button>
          </div>

          {/* Results area */}
          <div className="flex-1 overflow-y-auto">
            {searchLoading && (
              <div className="flex items-center justify-center py-12 gap-2 text-tsua-muted">
                <div className="w-5 h-5 rounded-full border-2 border-tsua-muted border-t-tsua-accent animate-spin" />
                <span>מחפש...</span>
              </div>
            )}

            {!searchLoading && searchQuery && !hasResults && (
              <div className="py-12 text-center text-tsua-muted">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-sm">{`אין תוצאות עבור "${searchQuery}"`}</div>
              </div>
            )}

            {!searchLoading && !searchQuery && (
              <div className="px-4 pt-8">
                <div className="text-xs font-bold tracking-widest uppercase text-tsua-muted mb-4">
                  דוגמאות לחיפוש
                </div>
                <div className="flex flex-wrap gap-2">
                  {['TEVA', 'NVDA', 'AAPL', 'TSLA'].map(t => (
                    <button
                      key={t}
                      onClick={() => handleSearchChange(t)}
                      className="text-sm px-3 py-1.5 rounded-xl font-semibold transition-all"
                      style={{ background: 'rgba(0,229,176,0.08)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
                    >
                      ${t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searchLoading && hasResults && (
              <>
                {/* Stocks */}
                {searchResults!.stocks.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase sticky top-0"
                      style={{ color: '#5a7090', background: 'rgba(6,11,22,0.95)', borderBottom: '1px solid rgba(26,40,64,0.4)' }}
                    >
                      מניות
                    </div>
                    {searchResults!.stocks.map(s => (
                      <button
                        key={s.ticker}
                        onClick={() => goToStock(s.ticker)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-start active:bg-white/5 transition-colors"
                        style={{ borderBottom: '1px solid rgba(26,40,64,0.3)' }}
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs"
                          style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
                        >
                          {s.ticker.slice(0, 3)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-tsua-text">${s.ticker}</span>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                              style={{ background: 'rgba(26,40,64,0.6)', color: '#5a7090' }}
                            >
                              {s.exchange || s.type}
                            </span>
                          </div>
                          <div className="text-xs text-tsua-muted truncate mt-0.5">{s.name}</div>
                        </div>
                        <span className="text-tsua-muted text-lg">›</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Users */}
                {searchResults!.users.length > 0 && (
                  <div>
                    <div
                      className="px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase sticky top-0"
                      style={{ color: '#5a7090', background: 'rgba(6,11,22,0.95)', borderBottom: '1px solid rgba(26,40,64,0.4)' }}
                    >
                      משתמשים
                    </div>
                    {searchResults!.users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => goToUser(u.username)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-start active:bg-white/5 transition-colors"
                        style={{ borderBottom: '1px solid rgba(26,40,64,0.3)' }}
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} className="w-11 h-11 rounded-full object-cover shrink-0" />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base shrink-0"
                            style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)', color: '#060b16' }}
                          >
                            {(u.display_name || u.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-tsua-text">
                              {u.display_name || u.username}
                            </span>
                            {u.is_verified && <span style={{ color: '#00e5b0' }} className="text-xs">✓</span>}
                          </div>
                          <div className="text-xs text-tsua-muted mt-0.5">@{u.username}</div>
                        </div>
                        <span className="text-tsua-muted text-lg">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

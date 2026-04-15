'use client';

import { useTheme } from '@/contexts/ThemeContext';

// Full toggle — desktop navbar
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'עבור למצב יום' : 'עבור למצב לילה'}
      className="relative flex items-center p-1 rounded-lg transition-all duration-200 hover:bg-white/5"
      style={{ border: '1px solid var(--border)' }}
    >
      <div
        className="relative w-11 h-6 rounded-full transition-all duration-300"
        style={{
          background: isDark ? 'rgba(26,40,64,0.8)' : 'linear-gradient(135deg, #ffe066, #ffaa00)',
          border: isDark ? '1px solid rgba(26,40,64,0.9)' : '1px solid rgba(255,180,0,0.4)',
          boxShadow: isDark ? 'none' : '0 0 12px rgba(255,180,0,0.3)',
        }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] transition-all duration-300"
          style={{
            background: isDark ? 'rgba(40,60,100,0.9)' : '#fff',
            boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.2)',
            transform: isDark ? 'translateX(2px)' : 'translateX(22px)',
          }}
        >
          {isDark ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  );
}

// Icon-only — mobile BottomNav
export function ThemeToggleIcon() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'מצב יום' : 'מצב לילה'}
      className="relative flex flex-col items-center justify-center gap-1 px-4 py-1 transition-all duration-200 active:scale-90"
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[16px] transition-all duration-300"
        style={{
          background: isDark ? 'rgba(26,40,64,0.6)' : 'rgba(255,200,0,0.15)',
          boxShadow: isDark ? 'none' : '0 0 10px rgba(255,200,0,0.3)',
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </div>
      <span
        className="text-[10px] font-semibold"
        style={{ color: isDark ? 'rgba(90,112,144,0.6)' : '#c9901e', letterSpacing: '0.01em' }}
      >
        {isDark ? 'לילה' : 'יום'}
      </span>
    </button>
  );
}

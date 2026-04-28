'use client';

import { useTheme } from '@/contexts/ThemeContext';

/* ─── Icons ──────────────────────────────────────────────────────────── */
function SunIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

/* ─── Full toggle — desktop & mobile navbar ─────────────────────────── */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // 44px wide rail × 22px tall, knob is 18×18 with 2px inset.
  // Knob slides between left:2 and left:24.
  const knobOffset = isDark ? 2 : 24;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      onClick={toggleTheme}
      aria-label={isDark ? 'מעבר למצב יום' : 'מעבר למצב לילה'}
      title={isDark ? 'מצב יום' : 'מצב לילה'}
      className="group relative inline-flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        // focus ring uses theme accent
        // @ts-expect-error CSS variable
        '--ring': 'var(--accent)',
      }}
    >
      <span
        className="relative inline-block transition-colors duration-300 ease-out"
        style={{
          width: 44,
          height: 22,
          borderRadius: 999,
          background: isDark
            ? 'linear-gradient(135deg, rgba(20,30,52,0.95), rgba(10,16,30,0.95))'
            : 'linear-gradient(135deg, #ffe9b8, #f5cd80)',
          border: isDark
            ? '1px solid rgba(60,90,130,0.55)'
            : '1px solid rgba(180,140,60,0.45)',
          boxShadow: isDark
            ? 'inset 0 1px 2px rgba(0,0,0,0.45)'
            : 'inset 0 1px 2px rgba(255,255,255,0.55), 0 0 0 1px rgba(255,200,90,0.15)',
        }}
      >
        {/* Faded background icons (sun on right, moon on left) — give the rail
            personality even before the knob arrives over them */}
        <span
          className="absolute top-1/2 -translate-y-1/2 transition-opacity duration-200"
          style={{
            left: 5,
            color: isDark ? 'rgba(160,180,210,0.4)' : 'rgba(80,55,15,0.35)',
            opacity: isDark ? 0 : 1,
          }}
        >
          <MoonIcon size={11} />
        </span>
        <span
          className="absolute top-1/2 -translate-y-1/2 transition-opacity duration-200"
          style={{
            right: 5,
            color: isDark ? 'rgba(160,180,210,0.4)' : 'rgba(80,55,15,0.5)',
            opacity: isDark ? 1 : 0,
          }}
        >
          <SunIcon size={11} />
        </span>

        {/* Knob */}
        <span
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-300 ease-out"
          style={{
            left: knobOffset,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: isDark
              ? 'linear-gradient(135deg, #e8eef8, #b6c2d6)'
              : 'linear-gradient(135deg, #fff8e0, #ffd86b)',
            color: isDark ? '#0a1325' : '#5a3d10',
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(0,0,0,0.2)'
              : '0 1px 4px rgba(180,120,30,0.4), 0 0 8px rgba(255,200,80,0.5)',
          }}
        >
          {isDark ? <MoonIcon size={10} /> : <SunIcon size={10} />}
        </span>
      </span>
    </button>
  );
}

/* ─── Icon-only — mobile BottomNav / drawer entry ─────────────────────── */
export function ThemeToggleIcon() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'מצב יום' : 'מצב לילה'}
      className="relative flex flex-col items-center justify-center gap-1 px-4 py-1 transition-transform duration-150 active:scale-90"
    >
      <span
        className="flex items-center justify-center transition-all duration-300"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: isDark
            ? 'linear-gradient(135deg, rgba(20,30,52,0.95), rgba(10,16,30,0.95))'
            : 'linear-gradient(135deg, #ffe9b8, #f5cd80)',
          color: isDark ? '#cbd5e1' : '#5a3d10',
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 0 12px rgba(255,200,80,0.35)',
        }}
      >
        {isDark ? <MoonIcon size={14} /> : <SunIcon size={14} />}
      </span>
      <span
        className="text-[10px] font-semibold transition-colors"
        style={{
          color: isDark ? 'var(--muted)' : 'var(--text2)',
          letterSpacing: '0.01em',
        }}
      >
        {isDark ? 'לילה' : 'יום'}
      </span>
    </button>
  );
}

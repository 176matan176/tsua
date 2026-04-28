'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * The actual theme is set by an inline boot script in `<head>` (see layout.tsx)
 * BEFORE React hydrates — that script writes `data-theme` to <html> based on
 * localStorage (or OS pref). This provider just syncs React state to whatever
 * the DOM already says, then handles toggle clicks.
 */
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
  // Update the <meta name="theme-color"> so mobile browser chrome matches
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#f2ede4' : '#060b16');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read once during state init — by the time React hydrates, the inline
  // boot script has already set data-theme. This avoids a re-render flash.
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // If the user hasn't picked manually, follow live OS-level theme changes.
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => {
      // Only auto-switch when user has not explicitly chosen
      if (localStorage.getItem('tsua-theme')) return;
      const next: Theme = e.matches ? 'light' : 'dark';
      setThemeState(next);
      applyTheme(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem('tsua-theme', t);
    } catch {
      // localStorage can throw in private mode / iframes — non-fatal
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

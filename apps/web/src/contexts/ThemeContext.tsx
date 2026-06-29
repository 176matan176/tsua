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

// Single non-media-qualified theme-color tag that overrides the SSR'd
// media-qualified pair when the user picks a theme manually. Per the HTML
// spec, browsers walk theme-color metas in document order and pick the first
// whose media query matches; an unqualified tag always matches, so prepending
// one wins regardless of OS preference.
const MANUAL_META_ID = 'tsua-manual-theme-color';

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;

  const color = t === 'light' ? '#f2ede4' : '#060b16';
  let manual = document.getElementById(MANUAL_META_ID) as HTMLMetaElement | null;
  if (!manual) {
    manual = document.createElement('meta');
    manual.id = MANUAL_META_ID;
    manual.name = 'theme-color';
    // Prepend so it wins the document-order tiebreak against SSR'd media tags.
    document.head.prepend(manual);
  }
  manual.content = color;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize to a CONSTANT ('dark') so the server render and the first
  // client render agree. We must NOT read the DOM here: the boot script has
  // already written the real theme to <html data-theme>, so reading it during
  // useState init would make the first client render differ from the server's
  // (which always sees 'dark'). That mismatch makes React discard the whole
  // SSR'd document and re-render from JSX — which has no data-theme attribute —
  // wiping the boot script's value and reverting the app to dark on load.
  // Instead we adopt the real theme in a mount effect below (post-hydration),
  // so the visible palette (driven by the already-correct data-theme + CSS
  // vars) never flips; only the toggle knob settles into place after mount.
  const [theme, setThemeState] = useState<Theme>('dark');

  // After mount, sync React state to whatever the boot script wrote to <html>.
  useEffect(() => {
    setThemeState(readInitialTheme());
  }, []);

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

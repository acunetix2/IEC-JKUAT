// Public routes stay light; the legacy admin route retains its saved theme.

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function getSavedTheme(): Theme {
  try {
    return localStorage.getItem('iec-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isAdminRoute = isAdminPath(pathname);
  const [theme, setTheme] = useState<Theme>(() =>
    isAdminPath(window.location.pathname) ? getSavedTheme() : 'light'
  );

  useLayoutEffect(() => {
    const next = isAdminRoute ? getSavedTheme() : 'light';
    applyTheme(next);
    setTheme(next);
  }, [isAdminRoute]);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try {
      localStorage.setItem('iec-theme', next);
    } catch {
      /* private mode — persistence is best-effort */
    }
    setTheme(next);
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

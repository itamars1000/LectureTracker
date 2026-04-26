import { useState, useEffect } from 'react';

/**
 * Manages the light/dark theme.
 * Persists to localStorage under 'lecture-tracker-theme'.
 * Toggles the 'dark' class on <html> so Tailwind's darkMode:'class' works.
 * Defaults to dark mode when no saved preference exists.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('lecture-tracker-theme');
      return saved !== null ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('lecture-tracker-theme', isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  return { isDark, setIsDark };
}

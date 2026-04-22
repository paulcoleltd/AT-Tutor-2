import { useState, useEffect } from 'react';

export function useDarkMode() {
  const [dark, setDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('ai-tutor-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ai-tutor-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

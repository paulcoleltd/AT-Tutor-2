import React from 'react';

interface Props { dark: boolean; onToggle: () => void; }

export const ThemeToggle: React.FC<Props> = ({ dark, onToggle }) => (
  <button
    onClick={onToggle}
    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all
               bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
    aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    {dark ? '☀️' : '🌙'}
  </button>
);

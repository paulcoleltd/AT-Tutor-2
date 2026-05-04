/**
 * ErrorLog — collapsible sidebar panel showing captured errors, warnings,
 * and info events from across the app.
 */

import React, { useState } from 'react';
import { LogEntry, LogLevel } from '../hooks/useErrorLog';

interface Props {
  entries:    LogEntry[];
  errorCount: number;
  onClear:    () => void;
}

const LEVEL_STYLES: Record<LogLevel, { badge: string; row: string; dot: string }> = {
  error: {
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    row:   'border-l-2 border-red-400 bg-red-50 dark:bg-red-900/10',
    dot:   'bg-red-500',
  },
  warn: {
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    row:   'border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-900/10',
    dot:   'bg-amber-500',
  },
  info: {
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    row:   'border-l-2 border-blue-300 bg-blue-50 dark:bg-blue-900/10',
    dot:   'bg-blue-400',
  },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const ErrorLog: React.FC<Props> = ({ entries, errorCount, onClear }) => {
  const [open,      setOpen]      = useState(false);
  const [filter,    setFilter]    = useState<LogLevel | 'all'>('all');
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">

      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              Error Log
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
              {entries.length === 0 ? 'No events captured' : `${entries.length} event${entries.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {entries.length > 0 && errorCount === 0 && (
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" title="No errors" />
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 pb-4 pt-3 space-y-3">

          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'error', 'warn', 'info'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {f === 'all' ? `All (${entries.length})` : f}
              </button>
            ))}
            {entries.length > 0 && (
              <button
                onClick={onClear}
                className="ml-auto px-2.5 py-1 rounded-lg text-[11px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          {/* Log entries */}
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">
              {entries.length === 0
                ? '✅ No events — app running cleanly.'
                : `No ${filter} events.`}
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {filtered.map(entry => {
                const st = LEVEL_STYLES[entry.level];
                const isOpen = expanded === entry.id;
                return (
                  <li
                    key={entry.id}
                    className={`rounded-lg px-3 py-2 cursor-pointer ${st.row}`}
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
                      <div className="flex-1 min-w-0">
                        {/* Top row: source + time */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${st.badge}`}>
                            {entry.level.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            {entry.source}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">
                            {relTime(entry.ts)}
                          </span>
                        </div>

                        {/* Message */}
                        <p className={`text-xs text-slate-700 dark:text-slate-200 mt-1 ${isOpen ? '' : 'truncate'}`}>
                          {entry.message}
                        </p>

                        {/* Expanded: detail / stack */}
                        {isOpen && entry.detail && (
                          <pre className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-900/50 rounded p-2 max-h-40 overflow-y-auto">
                            {entry.detail}
                          </pre>
                        )}
                        {isOpen && entry.url && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{entry.url}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

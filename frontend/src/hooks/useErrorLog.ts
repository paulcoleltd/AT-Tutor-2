/**
 * useErrorLog — client-side structured error logger.
 *
 * Captures:
 *  - API/network failures from chat & upload
 *  - React ErrorBoundary crashes
 *  - Unhandled promise rejections (global listener)
 *  - Manual log() calls from any component
 *
 * All entries persist to localStorage (capped at 200).
 * The user can view, filter, and clear logs from the ErrorLog panel.
 */

import { useState, useCallback, useEffect } from 'react';

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id:        string;
  ts:        string;          // ISO timestamp
  level:     LogLevel;
  source:    string;          // e.g. 'Chat', 'FileUpload', 'ErrorBoundary', 'global'
  message:   string;
  detail?:   string;          // stack trace or extra context
  url?:      string;          // page URL at time of error
}

const STORAGE_KEY = 'ai-tutor-error-log';
const MAX_ENTRIES = 200;

function loadEntries(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch { return []; }
}

function saveEntries(entries: LogEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
  catch { /* quota */ }
}

function makeEntry(
  level: LogLevel,
  source: string,
  message: string,
  detail?: string,
): LogEntry {
  return {
    id:      `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts:      new Date().toISOString(),
    level,
    source,
    message: String(message).slice(0, 500),
    detail:  detail?.slice(0, 1000),
    url:     window.location.href,
  };
}

// Singleton append — used by global listeners that run outside React
function appendToStorage(entry: LogEntry) {
  try {
    const current = loadEntries();
    const next = [entry, ...current].slice(0, MAX_ENTRIES);
    saveEntries(next);
  } catch { /* ignore */ }
}

// ── Global uncaught error / rejection listeners (registered once) ──────────
let _globalListenersRegistered = false;
function registerGlobalListeners() {
  if (_globalListenersRegistered || typeof window === 'undefined') return;
  _globalListenersRegistered = true;

  window.addEventListener('error', (event) => {
    const entry = makeEntry(
      'error',
      'global',
      event.message || 'Uncaught error',
      event.error?.stack ?? `${event.filename}:${event.lineno}:${event.colno}`,
    );
    appendToStorage(entry);
    window.dispatchEvent(new CustomEvent('ai-tutor-log', { detail: entry }));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const entry = makeEntry(
      'error',
      'promise',
      reason?.message ?? String(reason),
      reason?.stack,
    );
    appendToStorage(entry);
    window.dispatchEvent(new CustomEvent('ai-tutor-log', { detail: entry }));
  });
}

// ── React hook ────────────────────────────────────────────────────────────────
export function useErrorLog() {
  const [entries, setEntries] = useState<LogEntry[]>(loadEntries);

  // Register global listeners once and listen for new entries from other contexts
  useEffect(() => {
    registerGlobalListeners();

    const handler = (e: Event) => {
      const entry = (e as CustomEvent<LogEntry>).detail;
      setEntries(prev => {
        const next = [entry, ...prev].slice(0, MAX_ENTRIES);
        saveEntries(next);
        return next;
      });
    };
    window.addEventListener('ai-tutor-log', handler);
    return () => window.removeEventListener('ai-tutor-log', handler);
  }, []);

  const log = useCallback((
    level: LogLevel,
    source: string,
    message: string,
    detail?: string,
  ) => {
    const entry = makeEntry(level, source, message, detail);
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      saveEntries(next);
      return next;
    });
    // Also dispatch so global listeners / other hook instances pick it up
    window.dispatchEvent(new CustomEvent('ai-tutor-log', { detail: entry }));
  }, []);

  const clearLog = useCallback(() => {
    saveEntries([]);
    setEntries([]);
  }, []);

  const errorCount = entries.filter(e => e.level === 'error').length;
  const hasErrors  = errorCount > 0;

  return { entries, log, clearLog, errorCount, hasErrors };
}

// ── Standalone helper for use outside React (ErrorBoundary class component) ──
export function logToStorage(level: LogLevel, source: string, message: string, detail?: string) {
  const entry = makeEntry(level, source, message, detail);
  appendToStorage(entry);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-tutor-log', { detail: entry }));
  }
}

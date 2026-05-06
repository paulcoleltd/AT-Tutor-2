import React, { useState, useEffect, useCallback } from 'react';
import { getSessions, SessionMeta } from '../lib/api';

interface Props {
  currentSessionId: string;
  onResume:    (session: SessionMeta) => void;
  onNewChat:   () => void;
  onClose:     () => void;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export const SessionHistory: React.FC<Props> = ({ currentSessionId, onResume, onNewChat, onClose }) => {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getSessions();
      setSessions(list);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const past = sessions.filter(s => s.id !== currentSessionId);
  const current = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="absolute inset-0 z-20 bg-white dark:bg-slate-800 flex flex-col rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="flex items-center gap-2">
          <span className="text-lg">🕑</span>
          <h2 className="text-white font-bold text-sm">Session Memory</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg transition-all"
          >
            + New Chat
          </button>
          <button
            onClick={onClose}
            aria-label="Close history panel"
            className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Current session */}
        {current && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-1">Current session</p>
            <div className="rounded-xl border-2 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {current.title ?? 'Untitled session'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {relativeDate(current.lastUsed)}
              </p>
              {current.summary && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{current.summary}</p>
              )}
            </div>
          </div>
        )}

        {/* Past sessions */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-400">
            <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading history…
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            ⚠️ {error}
            <button onClick={load} className="ml-auto underline">Retry</button>
          </div>
        )}

        {!loading && !error && past.length === 0 && (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500">
            <p className="text-2xl mb-2">🧠</p>
            <p className="text-sm font-medium">No past sessions yet</p>
            <p className="text-xs mt-1">Your conversation history will appear here after each chat.</p>
          </div>
        )}

        {!loading && past.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-1">Past sessions</p>
            <div className="space-y-1.5">
              {past.map(s => (
                <button
                  key={s.id}
                  onClick={() => onResume(s)}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 px-3 py-2 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      {s.title ?? 'Untitled session'}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{relativeDate(s.lastUsed)}</span>
                  </div>
                  {s.summary && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                      {s.summary}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500 text-center">
        Sessions persist across browser restarts · Summaries auto-generate every 8 exchanges
      </div>
    </div>
  );
};

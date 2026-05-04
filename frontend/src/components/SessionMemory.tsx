/**
 * SessionMemory — shows saved conversation snapshots and lets the user
 * resume any previous session or start fresh.
 */

import React, { useState } from 'react';
import { SessionSnapshot } from '../hooks/useSessionMemory';

interface Props {
  sessions:        SessionSnapshot[];
  currentSessionId: string;
  onResume:        (sessionId: string) => void;
  onDelete:        (sessionId: string) => void;
  onClearAll:      () => void;
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 2)  return 'just now';
  if (hours < 1)  return `${mins}m ago`;
  if (days  < 1)  return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const MODE_ICONS: Record<string, string> = {
  explain:   '💡',
  quiz:      '📝',
  chat:      '💬',
  summarize: '📋',
  flashcard: '🃏',
};

export const SessionMemory: React.FC<Props> = ({
  sessions, currentSessionId, onResume, onDelete, onClearAll,
}) => {
  const [open, setOpen] = useState(false);

  const others = sessions.filter(s => s.sessionId !== currentSessionId);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              Memory
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
              {others.length === 0
                ? 'No saved sessions yet'
                : `${others.length} saved session${others.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {others.length > 0 && (
            <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
              {others.length}
            </span>
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
        <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            The AI remembers what you covered in each session. Resume any session to continue exactly where you left off.
          </p>

          {others.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-4">
              Start a conversation and it will be saved here automatically.
            </p>
          ) : (
            <ul className="space-y-2">
              {others.map(snap => (
                <li
                  key={snap.sessionId}
                  className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 overflow-hidden"
                >
                  {/* Session card header */}
                  <div className="px-3 pt-3 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate leading-tight">
                          {MODE_ICONS[snap.mode] ?? '💬'} {snap.topic}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {relativeDate(snap.savedAt)} · {snap.messageCount} messages · {snap.persona}
                        </p>
                      </div>
                      <button
                        onClick={() => onDelete(snap.sessionId)}
                        title="Delete session"
                        className="text-slate-300 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-colors flex-shrink-0 text-xs mt-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Last exchange preview */}
                    {snap.aiSummary && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        AI: "{snap.aiSummary}"
                      </p>
                    )}
                  </div>

                  {/* Resume button */}
                  <button
                    onClick={() => onResume(snap.sessionId)}
                    className="w-full text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 px-3 transition-colors text-left border-t border-slate-200 dark:border-slate-600"
                  >
                    ↩ Continue this session
                  </button>
                </li>
              ))}
            </ul>
          )}

          {others.length > 0 && (
            <button
              onClick={onClearAll}
              className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
            >
              Clear all saved sessions
            </button>
          )}
        </div>
      )}
    </div>
  );
};

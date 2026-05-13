/**
 * MemoryBank — sidebar panel showing what the AI permanently remembers
 * about the user across all sessions.
 */

import React, { useState } from 'react';
import { MemoryFact, MemoryCategory } from '../hooks/useMemoryBank';

interface Props {
  facts:     MemoryFact[];
  hasMemory: boolean;
  onDelete:  (id: string) => void;
  onClear:   () => void;
}

const CATEGORY_LABEL: Record<MemoryCategory, { icon: string; label: string; colour: string }> = {
  identity:    { icon: '👤', label: 'Identity',    colour: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  preference:  { icon: '❤️', label: 'Preference',  colour: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
  subject:     { icon: '📚', label: 'Subject',     colour: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  goal:        { icon: '🎯', label: 'Goal',        colour: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  correction:  { icon: '✏️', label: 'Correction',  colour: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  achievement: { icon: '🏆', label: 'Achievement', colour: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  general:     { icon: '💬', label: 'General',     colour: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
};

export const MemoryBank: React.FC<Props> = ({ facts, hasMemory, onDelete, onClear }) => {
  const [expanded, setExpanded]   = useState(false);
  const [filter,   setFilter]     = useState<MemoryCategory | 'all'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const visible = filter === 'all' ? facts : facts.filter(f => f.category === filter);
  const categories = [...new Set(facts.map(f => f.category))];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">🧠</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Long-term Memory
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {hasMemory ? `${facts.length} fact${facts.length !== 1 ? 's' : ''} remembered across sessions` : 'Nothing remembered yet'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMemory && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
              {facts.length}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-3">

          {/* Empty state */}
          {!hasMemory && (
            <div className="text-center py-4">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Chat with the AI Tutor and it will automatically<br />
                remember facts about you for future sessions.
              </p>
              <p className="text-xs text-slate-300 dark:text-slate-600 mt-2">
                e.g. "My name is Paul", "I prefer Python", "I'm studying AWS"
              </p>
            </div>
          )}

          {hasMemory && (
            <>
              {/* Category filter pills */}
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilter('all')}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${filter==='all' ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}
                  >
                    All ({facts.length})
                  </button>
                  {categories.map(cat => {
                    const { icon, label, colour } = CATEGORY_LABEL[cat];
                    const count = facts.filter(f => f.category === cat).length;
                    return (
                      <button key={cat} onClick={() => setFilter(cat === filter ? 'all' : cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${filter===cat ? colour : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                      >
                        {icon} {label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Facts list */}
              <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {visible.map(fact => {
                  const { icon, colour } = CATEGORY_LABEL[fact.category];
                  return (
                    <li key={fact.id} className="flex items-start gap-2 group">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${colour}`}>
                        {icon}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
                        {fact.text}
                      </span>
                      <button
                        onClick={() => onDelete(fact.id)}
                        title="Forget this"
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Clear all */}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
                {!confirmClear ? (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    🗑️ Clear all memories
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-red-500">Forget everything?</span>
                    <button onClick={() => { onClear(); setConfirmClear(false); }}
                      className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded hover:bg-red-200 transition-colors">
                      Yes, forget
                    </button>
                    <button onClick={() => setConfirmClear(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

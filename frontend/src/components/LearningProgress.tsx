import React, { useEffect, useState, useCallback } from 'react';
import { getProgress, ProgressData } from '../lib/api';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
  B: 'text-blue-600   dark:text-blue-400   bg-blue-50   dark:bg-blue-900/30   border-blue-200   dark:border-blue-700',
  C: 'text-amber-600  dark:text-amber-400  bg-amber-50  dark:bg-amber-900/30  border-amber-200  dark:border-amber-700',
  D: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700',
  F: 'text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-900/30    border-red-200    dark:border-red-700',
};

const MODE_ICONS: Record<string, string> = {
  explain:   '💡',
  quiz:      '📝',
  chat:      '💬',
  summarize: '📋',
  flashcard: '🃏',
};

function AccuracyBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface Props { refreshKey?: number; }

export const LearningProgress: React.FC<Props> = ({ refreshKey }) => {
  const [data,    setData]    = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await getProgress());
    } catch {
      // backend may not be up yet — fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (loading || !data) return null;

  const { quiz, grade, streak, topics, modeBreakdown, totalSessions, todaySessions, totalMessages } = data;
  const totalModeUses = Object.values(modeBreakdown).reduce((s, v) => s + v, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header — collapsible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <span>📊</span> Learning Progress
        </h3>
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">

          {/* Grade + streak row */}
          <div className="flex gap-2">
            <div className={`flex-1 flex flex-col items-center justify-center rounded-xl border py-2 px-1 ${grade ? GRADE_COLOR[grade] : 'text-slate-400 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
              <p className="text-2xl font-black">{grade ?? '–'}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">Grade</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 py-2 px-1">
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{streak}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                Day streak 🔥
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-2 px-1">
              <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{totalSessions}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                Sessions
              </p>
            </div>
          </div>

          {/* Today's activity */}
          <div className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg px-2 py-1">
              Today: <strong>{todaySessions}</strong> session{todaySessions !== 1 ? 's' : ''}
            </span>
            <span className="bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1">
              <strong>{totalMessages}</strong> exchanges total
            </span>
          </div>

          {/* Quiz accuracy */}
          {quiz.total > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quiz Performance</p>
              <AccuracyBar
                value={quiz.accuracy ?? 0}
                label={`All time (${quiz.correct}/${quiz.total})`}
                color={
                  (quiz.accuracy ?? 0) >= 80 ? 'bg-emerald-500' :
                  (quiz.accuracy ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                }
              />
              {quiz.recentTotal > 0 && (
                <AccuracyBar
                  value={quiz.recentAccuracy ?? 0}
                  label={`Last 7 days (${quiz.recentCorrect}/${quiz.recentTotal})`}
                  color={
                    (quiz.recentAccuracy ?? 0) >= 80 ? 'bg-emerald-400' :
                    (quiz.recentAccuracy ?? 0) >= 60 ? 'bg-amber-400' : 'bg-red-400'
                  }
                />
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {(quiz.accuracy ?? 0) >= 80
                  ? '🌟 Excellent work! Keep it up.'
                  : (quiz.accuracy ?? 0) >= 60
                  ? '📈 Good progress — review missed topics.'
                  : '💪 Keep practising — you\'re improving!'}
              </p>
            </div>
          )}

          {quiz.total === 0 && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              <p>📝 Switch to <strong>Quiz</strong> mode to start tracking your accuracy.</p>
            </div>
          )}

          {/* Mode usage */}
          {totalModeUses > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Study Methods</p>
              <div className="space-y-1">
                {Object.entries(modeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([mode, count]) => {
                    const pct = Math.round((count / totalModeUses) * 100);
                    return (
                      <div key={mode} className="flex items-center gap-2 text-[11px]">
                        <span className="w-4 text-center">{MODE_ICONS[mode] ?? '📌'}</span>
                        <span className="w-16 text-slate-600 dark:text-slate-300 capitalize">{mode}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-400 dark:bg-indigo-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-slate-400 w-7 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Topics covered */}
          {topics.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Topics Studied</p>
              <div className="flex flex-wrap gap-1">
                {topics.slice(0, 10).map(t => (
                  <span key={t} className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 rounded-full px-2 py-0.5 truncate max-w-[140px]" title={t}>
                    {t}
                  </span>
                ))}
                {topics.length > 10 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">+{topics.length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

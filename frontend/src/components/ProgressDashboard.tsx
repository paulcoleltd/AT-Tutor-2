/**
 * ProgressDashboard — collapsible sidebar panel showing learning metrics,
 * weekly activity chart, subject progress, and streak information.
 */

import React, { useState } from 'react';
import { LearningProgress, DailyActivity } from '../hooks/useProgressTracker';

interface Props {
  progress:    LearningProgress;
  topSubject:  string;
  studyDays:   number;
  onReset:     () => void;
}

// ── Mini SVG bar chart for weekly activity ────────────────────────────────────
function WeeklyChart({ activity }: { activity: DailyActivity[] }) {
  const last7: (DailyActivity | null)[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().split('T')[0];
    return activity.find(a => a.date === d) ?? null;
  });
  const maxMsgs = Math.max(1, ...last7.map(d => d?.messages ?? 0));
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mt-3">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-medium">7-DAY ACTIVITY</p>
      <div className="flex items-end gap-1 h-12">
        {last7.map((day, i) => {
          const msgs  = day?.messages ?? 0;
          const pct   = maxMsgs > 0 ? (msgs / maxMsgs) : 0;
          const h     = Math.max(4, Math.round(pct * 40));
          const isToday = i === 6;
          const label = dayLabels[new Date(Date.now() - (6 - i) * 86_400_000).getDay()];
          return (
            <div key={i} className="flex flex-col items-center flex-1 gap-0.5" title={`${label}: ${msgs} messages`}>
              <div
                className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-blue-500' : msgs > 0 ? 'bg-blue-300 dark:bg-blue-700' : 'bg-slate-200 dark:bg-slate-700'}`}
                style={{ height: `${h}px` }}
              />
              <span className="text-[8px] text-slate-400">{label[0]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ icon, label, value, color = 'blue' }: { icon: string; label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  };
  return (
    <div className={`rounded-xl p-2.5 ${colors[color] ?? colors.blue}`}>
      <p className="text-base leading-none">{icon}</p>
      <p className="text-lg font-bold leading-tight mt-1">{value}</p>
      <p className="text-[10px] opacity-80 leading-tight">{label}</p>
    </div>
  );
}

export const ProgressDashboard: React.FC<Props> = ({ progress, topSubject, studyDays, onReset }) => {
  const [open, setOpen] = useState(false);

  const joinedDays = Math.floor((Date.now() - new Date(progress.joinedAt).getTime()) / 86_400_000) + 1;
  const hasActivity = progress.totalMessages > 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
              Progress Dashboard
            </p>
            {!open && (
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {progress.streakDays > 0
                  ? `🔥 ${progress.streakDays}-day streak · ${progress.totalSessions} sessions`
                  : `${progress.totalSessions} sessions · ${progress.totalMessages} messages`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {progress.streakDays >= 3 && (
            <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold">
              🔥 {progress.streakDays}d
            </span>
          )}
          {progress.certificatesEarned.length > 0 && (
            <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full font-bold">
              🏆 {progress.certificatesEarned.length}
            </span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-4">

          {!hasActivity ? (
            <div className="text-center py-4 space-y-1">
              <p className="text-2xl">📚</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">No activity yet.</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Start a conversation to track your progress.</p>
            </div>
          ) : (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <Stat icon="💬" label="Messages"  value={progress.totalMessages}    color="blue"   />
                <Stat icon="🎯" label="Sessions"  value={progress.totalSessions}    color="purple" />
                <Stat icon="🔥" label="Day streak" value={progress.streakDays || '–'} color="amber" />
                <Stat icon="📝" label="Quizzes"   value={progress.totalQuizzes}     color="green"  />
                <Stat icon="🃏" label="Flashcards" value={progress.totalFlashcards}  color="teal"   />
                <Stat icon="📁" label="Docs"      value={progress.docsUploaded}     color="purple" />
              </div>

              {/* Weekly chart */}
              <WeeklyChart activity={progress.weeklyActivity} />

              {/* Top subject */}
              {topSubject && topSubject !== 'None yet' && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-0.5">MOST STUDIED</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{topSubject}</p>
                </div>
              )}

              {/* Subject breakdown */}
              {progress.subjectProgress.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-2">SUBJECTS</p>
                  <ul className="space-y-1.5">
                    {progress.subjectProgress.slice(0, 4).map(s => (
                      <li key={s.subject} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium">{s.subject}</p>
                          <div className="w-full h-1 bg-slate-200 dark:bg-slate-600 rounded-full mt-0.5 overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${Math.min(100, (s.sessions / Math.max(1, progress.totalSessions)) * 100 + 20)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">{s.sessions}s</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Certificates */}
              {progress.certificatesEarned.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl px-3 py-2.5 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-medium mb-1">CERTIFICATES EARNED</p>
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                    🏆 {progress.certificatesEarned.length} certificate{progress.certificatesEarned.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Member since */}
              <p className="text-[10px] text-slate-400 text-center">
                Learning for {joinedDays} day{joinedDays !== 1 ? 's' : ''} · {studyDays} active day{studyDays !== 1 ? 's' : ''}
              </p>

              {/* Reset */}
              <button
                onClick={onReset}
                className="w-full text-[11px] text-slate-400 hover:text-red-500 transition-colors py-1"
              >
                Reset progress data
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

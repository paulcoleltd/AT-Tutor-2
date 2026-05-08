import React, { useState, useMemo } from 'react';
import { LearningProgress, DailyActivity } from '../hooks/useProgressTracker';

interface Props {
  progress:   LearningProgress;
  topSubject: string;
  studyDays:  number;
  onReset:    () => void;
}

// ── Donut chart — mode usage breakdown ───────────────────────────────────────
const MODE_COLORS: Record<string, string> = {
  explain:   '#6366f1',
  quiz:      '#f59e0b',
  chat:      '#10b981',
  summarize: '#3b82f6',
  flashcard: '#ec4899',
  exam:      '#8b5cf6',
};
const MODE_LABELS: Record<string, string> = {
  explain: 'Explain', quiz: 'Quiz', chat: 'Chat',
  summarize: 'Summarize', flashcard: 'Flashcards', exam: 'Exam',
};

function DonutChart({ progress }: { progress: LearningProgress }) {
  const slices = useMemo(() => {
    const tracked = progress.totalQuizzes + progress.totalFlashcards +
                    progress.totalSummarisations + progress.totalExplains + (progress.totalExams ?? 0);
    const modes = [
      { key: 'explain',   val: progress.totalExplains },
      { key: 'quiz',      val: progress.totalQuizzes },
      { key: 'flashcard', val: progress.totalFlashcards },
      { key: 'summarize', val: progress.totalSummarisations },
      { key: 'exam',      val: progress.totalExams ?? 0 },
      { key: 'chat',      val: Math.max(0, progress.totalMessages - tracked) },
    ];
    const total = modes.reduce((s, m) => s + m.val, 0);
    if (total === 0) return [];

    let cumAngle = -Math.PI / 2;
    return modes
      .filter(m => m.val > 0)
      .map(m => {
        const pct   = m.val / total;
        const angle = pct * 2 * Math.PI;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;
        const r  = 36;
        const cx = 44, cy = 44;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const large = angle > Math.PI ? 1 : 0;
        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        return { key: m.key, val: m.val, pct, d, color: MODE_COLORS[m.key] };
      });
  }, [progress]);

  const total = progress.totalMessages;

  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-28 text-slate-400 dark:text-slate-500">
        <span className="text-3xl mb-1">📊</span>
        <p className="text-[10px]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* SVG donut */}
      <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.9}>
            <title>{MODE_LABELS[s.key]}: {s.val}</title>
          </path>
        ))}
        {/* hole */}
        <circle cx="44" cy="44" r="22" fill="white" className="dark:fill-slate-800" />
        <text x="44" y="41" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200" fontSize="13" fontWeight="bold">{total}</text>
        <text x="44" y="53" textAnchor="middle" className="fill-slate-400" fontSize="7">msgs</text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-slate-600 dark:text-slate-300 truncate flex-1">{MODE_LABELS[s.key]}</span>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sparkline area chart — 7-day activity ────────────────────────────────────
function SparklineChart({ activity }: { activity: DailyActivity[] }) {
  const W = 220, H = 52;
  const PADDING = { top: 6, right: 4, bottom: 16, left: 4 };

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().split('T')[0];
      const found = activity.find(a => a.date === d);
      return { date: d, messages: found?.messages ?? 0, sessions: found?.sessions ?? 0 };
    });
  }, [activity]);

  const maxVal = Math.max(1, ...last7.map(d => d.messages));
  const innerW  = W - PADDING.left - PADDING.right;
  const innerH  = H - PADDING.top - PADDING.bottom;
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const points = last7.map((d, i) => ({
    x: PADDING.left + (i / 6) * innerW,
    y: PADDING.top + innerH - (d.messages / maxVal) * innerH,
    msgs: d.messages,
    date: d.date,
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M ${points[0].x},${PADDING.top + innerH} ` +
    points.map(p => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[6].x},${PADDING.top + innerH} Z`;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1.5">7-Day Activity</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = PADDING.top + innerH * (1 - pct);
          return (
            <line key={pct} x1={PADDING.left} y1={y} x2={W - PADDING.right} y2={y}
              stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" strokeDasharray="3,3" />
          );
        })}
        {/* Area fill */}
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={p.msgs > 0 ? 3 : 2}
              fill={last7[i].date === today ? '#6366f1' : p.msgs > 0 ? '#818cf8' : '#cbd5e1'}
              className="dark:fill-slate-600"
              style={p.msgs > 0 ? { fill: last7[i].date === today ? '#6366f1' : '#818cf8' } : {}}
            />
            {p.msgs > 0 && (
              <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="6"
                className="fill-indigo-500 dark:fill-indigo-400" fontWeight="600">
                {p.msgs}
              </text>
            )}
          </g>
        ))}
        {/* Day labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="7"
            className={last7[i].date === today ? 'fill-indigo-500 dark:fill-indigo-400 font-bold' : 'fill-slate-400 dark:fill-slate-500'}>
            {dayLabels[new Date(last7[i].date + 'T12:00:00').getDay()]}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Streak flame ─────────────────────────────────────────────────────────────
function StreakFlame({ days }: { days: number }) {
  const size = Math.min(days, 7);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={`h-3 w-3 rounded-sm transition-all ${
          i < size ? 'bg-orange-400 dark:bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
        }`} title={i < size ? `Day ${i + 1}` : ''} />
      ))}
      {days > 7 && <span className="text-[9px] text-orange-500 font-bold ml-0.5">+{days - 7}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const ProgressDashboard: React.FC<Props> = ({ progress, topSubject, studyDays, onReset }) => {
  const [open, setOpen] = useState(false);

  const joinedDays = Math.floor((Date.now() - new Date(progress.joinedAt).getTime()) / 86_400_000) + 1;
  const hasActivity = progress.totalMessages > 0;

  const statCards = [
    { icon: '💬', label: 'Messages',   value: progress.totalMessages,    color: 'indigo' },
    { icon: '🎯', label: 'Sessions',   value: progress.totalSessions,    color: 'blue'   },
    { icon: '📝', label: 'Quizzes',    value: progress.totalQuizzes,       color: 'amber'  },
    { icon: '🃏', label: 'Flashcards', value: progress.totalFlashcards,    color: 'pink'   },
    { icon: '🎓', label: 'Exams',      value: progress.totalExams ?? 0,    color: 'purple' },
    { icon: '📁', label: 'Docs',       value: progress.docsUploaded,       color: 'teal'   },
    { icon: '📅', label: 'Study days', value: studyDays,                   color: 'green'  },
  ];

  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
    blue:   'bg-blue-50   dark:bg-blue-900/20   text-blue-600   dark:text-blue-400',
    amber:  'bg-amber-50  dark:bg-amber-900/20  text-amber-600  dark:text-amber-400',
    pink:   'bg-pink-50   dark:bg-pink-900/20   text-pink-600   dark:text-pink-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    teal:   'bg-teal-50   dark:bg-teal-900/20   text-teal-600   dark:text-teal-400',
    green:  'bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📊</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Progress Dashboard</p>
            {!open && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {progress.streakDays > 0
                  ? `🔥 ${progress.streakDays}-day streak · ${progress.totalMessages} messages`
                  : `${progress.totalSessions} sessions · ${progress.totalMessages} messages`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
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
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-5">

          {!hasActivity ? (
            <div className="text-center py-6 space-y-1.5">
              <p className="text-3xl">📚</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Start a conversation to track your progress.</p>
            </div>
          ) : (
            <>
              {/* ── Stats grid ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                {statCards.map(s => (
                  <div key={s.label} className={`rounded-xl p-2 ${colorMap[s.color]}`}>
                    <p className="text-base leading-none">{s.icon}</p>
                    <p className="text-lg font-bold leading-tight mt-1">{s.value}</p>
                    <p className="text-[9px] opacity-75 leading-tight mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Streak bar ─────────────────────────────────────────────── */}
              {progress.streakDays > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl px-3 py-2.5 border border-orange-100 dark:border-orange-900/30">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Current Streak</p>
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">🔥 {progress.streakDays} day{progress.streakDays !== 1 ? 's' : ''}</span>
                  </div>
                  <StreakFlame days={progress.streakDays} />
                </div>
              )}

              {/* ── Donut chart ─────────────────────────────────────────────── */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">Mode Breakdown</p>
                <DonutChart progress={progress} />
              </div>

              {/* ── Sparkline chart ─────────────────────────────────────────── */}
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3">
                <SparklineChart activity={progress.weeklyActivity} />
              </div>

              {/* ── Top subject ─────────────────────────────────────────────── */}
              {topSubject && topSubject !== 'None yet' && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3 py-2.5 border border-indigo-100 dark:border-indigo-900/30">
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">Most Studied</p>
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{topSubject}</p>
                </div>
              )}

              {/* ── Subject breakdown bars ──────────────────────────────────── */}
              {progress.subjectProgress.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Subjects</p>
                  <div className="space-y-2">
                    {progress.subjectProgress
                      .sort((a, b) => b.sessions - a.sessions)
                      .slice(0, 5)
                      .map(s => {
                        const pct = Math.min(100, (s.sessions / Math.max(1, progress.totalSessions)) * 100 + 15);
                        return (
                          <div key={s.subject}>
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium flex-1 mr-2">{s.subject}</p>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">{s.sessions}s</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ── Certificates ────────────────────────────────────────────── */}
              {progress.certificatesEarned.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl px-3 py-2.5 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold uppercase tracking-wider mb-1">Certificates Earned</p>
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                    🏆 {progress.certificatesEarned.length} certificate{progress.certificatesEarned.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* ── Footer ──────────────────────────────────────────────────── */}
              <p className="text-[10px] text-slate-400 text-center">
                Joined {joinedDays} day{joinedDays !== 1 ? 's' : ''} ago · {studyDays} active day{studyDays !== 1 ? 's' : ''}
              </p>
              <button
                onClick={onReset}
                className="w-full text-[11px] text-slate-400 hover:text-red-500 transition-colors py-0.5"
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

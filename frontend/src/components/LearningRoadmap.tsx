/**
 * LearningRoadmap — enhanced sidebar panel.
 *
 * Enhancements explained:
 *  1. STEP PROGRESS TRACKING  — users can mark each step as Not Started /
 *     In Progress / Done. State is persisted to localStorage so it survives
 *     page reloads.
 *
 *  2. PATH PROGRESS BAR       — a coloured bar at the top of the roadmap
 *     header shows how many steps are completed vs total, giving instant
 *     visual feedback on overall progress.
 *
 *  3. TIME INVESTMENT SUMMARY — each step's certification duration strings
 *     are parsed and summed to show total estimated study hours for the
 *     whole path (e.g. "~540 hrs total").
 *
 *  4. LANGUAGE FILTER         — specific to the Languages path. A row of
 *     language buttons (English, French, Spanish, German, All) filters
 *     certifications to only show those relevant to that language so the
 *     user doesn't have to read through every cert.
 *
 *  5. RECOMMENDED BADGE       — the first certification in each step gets
 *     a ★ Recommended badge, helping users who just want one clear
 *     starting point without reading every option.
 *
 *  6. STUDY WITH AI BUTTON    — each certification card has a "Study →"
 *     button that fires a custom DOM event (ai-tutor:study). Chat.tsx
 *     listens for this event and pre-fills the message input with a
 *     focused study prompt, so the user can start immediately.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ROADMAPS, SubjectRoadmap, RoadmapStep, Certification } from '../lib/certifications';

// ── Types ──────────────────────────────────────────────────────────────────────
type StepStatus = 'not-started' | 'in-progress' | 'done';
type ProgressMap = Record<string, Record<string, StepStatus>>; // subject → level → status
const STORAGE_KEY = 'ai-tutor-roadmap-progress';

// ── Constants ──────────────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<string, { card: string; dot: string; badge: string; text: string }> = {
  beginner:     { card: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
  intermediate: { card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',           dot: 'bg-blue-400',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',           text: 'text-blue-700 dark:text-blue-400'    },
  advanced:     { card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',   dot: 'bg-purple-400',  badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',   text: 'text-purple-700 dark:text-purple-400' },
  expert:       { card: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',           dot: 'bg-rose-400',    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',           text: 'text-rose-700 dark:text-rose-400'    },
};

const STATUS_CONFIG: Record<StepStatus, { icon: string; label: string; color: string }> = {
  'not-started': { icon: '○', label: 'Not started', color: 'text-slate-400' },
  'in-progress': { icon: '◑', label: 'In progress', color: 'text-amber-500 dark:text-amber-400' },
  'done':        { icon: '●', label: 'Completed',   color: 'text-emerald-500 dark:text-emerald-400' },
};

const SUBJECT_SHORT: Record<string, string> = {
  'Cloud Computing & IT': 'Cloud & IT',
  'Data Science & AI':    'Data / AI',
  'Business & Finance':   'Finance',
  'Project Management':   'Project Mgmt',
  'Cybersecurity':        'Cybersecurity',
  'Languages & Communication': 'Languages',
  'Healthcare & Medicine': 'Healthcare',
};

const LANG_FILTERS: { label: string; keywords: string[] }[] = [
  { label: 'All',     keywords: [] },
  { label: '🇬🇧 English',  keywords: ['ielts', 'toefl', 'cambridge', 'english', 'cae', 'cpe'] },
  { label: '🇫🇷 French',   keywords: ['delf', 'dalf', 'france', 'french'] },
  { label: '🇪🇸 Spanish',  keywords: ['dele', 'spanish', 'cervantes'] },
  { label: '🇩🇪 German',   keywords: ['goethe', 'german'] },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function parseHours(duration?: string): number {
  if (!duration) return 0;
  const hrs = duration.match(/(\d+)\s*hr/i);
  if (hrs) return parseInt(hrs[1]);
  const months = duration.match(/(\d+)[–-]?(\d+)?\s*months?/i);
  if (months) return parseInt(months[1]) * 40; // ~40 hrs/month study
  return 0;
}

function totalHours(steps: RoadmapStep[]): number {
  return steps.reduce((sum, s) =>
    sum + s.certs.reduce((cs, c) => cs + parseHours(c.duration), 0), 0);
}

function loadProgress(): ProgressMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); }
  catch { return {}; }
}

function saveProgress(p: ProgressMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

// ── StepCard ───────────────────────────────────────────────────────────────────
interface StepCardProps {
  step: RoadmapStep;
  isLast: boolean;
  status: StepStatus;
  onStatusChange: (s: StepStatus) => void;
  langFilter: string;
  isLanguagePath: boolean;
}

function StepCard({ step, isLast, status, onStatusChange, langFilter, isLanguagePath }: StepCardProps) {
  const [open, setOpen] = useState(false);
  const s = LEVEL_STYLES[step.level] ?? LEVEL_STYLES.beginner;
  const st = STATUS_CONFIG[status];

  // Enhancement 4: Language filter — only applies on the Languages path
  const visibleCerts = useMemo<Certification[]>(() => {
    if (!isLanguagePath || langFilter === 'All') return step.certs;
    const filter = LANG_FILTERS.find(f => f.label === langFilter);
    if (!filter || filter.keywords.length === 0) return step.certs;
    return step.certs.filter(c =>
      filter.keywords.some(kw =>
        c.name.toLowerCase().includes(kw) ||
        (c.acronym?.toLowerCase() ?? '').includes(kw) ||
        c.body.toLowerCase().includes(kw)
      )
    );
  }, [step.certs, langFilter, isLanguagePath]);

  // Enhancement 6: Study with AI — fires a custom DOM event Chat.tsx listens to
  const studyWithAI = useCallback((cert: Certification, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = `Help me study for ${cert.acronym ?? cert.name} (${cert.body}). I want to understand the key topics, typical question formats, and what I need to know to pass at ${cert.level} level.`;
    window.dispatchEvent(new CustomEvent('ai-tutor:study', { detail: { prompt } }));
  }, []);

  const stepHours = step.certs.reduce((s, c) => s + parseHours(c.duration), 0);

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1.5">
        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-slate-800 transition-all ${
          status === 'done' ? 'bg-emerald-400' : status === 'in-progress' ? 'bg-amber-400' : s.dot
        }`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 mt-1" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-5 rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
        status === 'done'
          ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 opacity-80'
          : s.card
      }`}>
        {/* Card header — always visible */}
        <div
          className="flex items-start gap-3 px-4 py-3 cursor-pointer"
          onClick={() => setOpen(v => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${s.badge}`}>
                {step.level}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</span>
              {stepHours > 0 && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">~{stepHours}h</span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.goal}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Enhancement 1: Progress status cycle button */}
            <button
              title={`Status: ${st.label} — click to change`}
              className={`text-lg leading-none transition-transform hover:scale-110 ${st.color}`}
              onClick={e => {
                e.stopPropagation();
                const cycle: StepStatus[] = ['not-started', 'in-progress', 'done'];
                const next = cycle[(cycle.indexOf(status) + 1) % cycle.length];
                onStatusChange(next);
              }}
            >
              {st.icon}
            </button>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
            </svg>
          </div>
        </div>

        {/* Enhancement 1: Status bar at bottom of header */}
        {status !== 'not-started' && (
          <div className={`mx-4 mb-2 text-[10px] font-semibold flex items-center gap-1 ${st.color}`}>
            <span>{st.icon}</span><span>{st.label}</span>
          </div>
        )}

        {open && (
          <div className="px-4 pb-4 space-y-4 border-t border-current/10 pt-3">

            {/* Key Skills */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Key Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {step.skills.map(skill => (
                  <span key={skill} className="text-xs bg-white/60 dark:bg-black/25 px-2.5 py-1 rounded-full font-medium text-slate-700 dark:text-slate-200 border border-current/10">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            {visibleCerts.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Certifications {isLanguagePath && langFilter !== 'All' && `· ${langFilter}`}
                </p>
                <div className="space-y-2">
                  {visibleCerts.map((cert, idx) => (
                    <div key={cert.id} className="bg-white/70 dark:bg-black/25 rounded-xl border border-white/50 dark:border-white/5 overflow-hidden">
                      <div className="flex items-start gap-3 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {/* Enhancement 5: Recommended badge on first cert */}
                            {idx === 0 && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">★ Recommended</span>
                            )}
                            <a href={cert.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:underline leading-tight"
                              onClick={e => e.stopPropagation()}
                            >
                              {cert.acronym ? <><span>{cert.acronym}</span><span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">— {cert.name}</span></> : cert.name}
                            </a>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{cert.body}</p>
                          {cert.desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{cert.desc}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right space-y-0.5 min-w-[56px]">
                          {cert.cost && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cert.cost}</p>}
                          {cert.duration && <p className="text-xs text-slate-400">{cert.duration}</p>}
                          <a href={cert.url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-indigo-500 dark:text-indigo-400 hover:underline block"
                            onClick={e => e.stopPropagation()}
                          >View →</a>
                        </div>
                      </div>
                      {/* Enhancement 6: Study with AI button */}
                      <button
                        onClick={e => studyWithAI(cert, e)}
                        className="w-full text-xs font-semibold py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border-t border-indigo-100 dark:border-indigo-900/30 text-left px-3"
                      >
                        🎓 Study {cert.acronym ?? cert.name} with AI →
                      </button>
                    </div>
                  ))}
                </div>
                {isLanguagePath && langFilter !== 'All' && visibleCerts.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No {langFilter} certifications at this level.</p>
                )}
              </div>
            ) : (
              isLanguagePath && langFilter !== 'All' && (
                <p className="text-xs text-slate-400 italic">No {langFilter} certifications at this level.</p>
              )
            )}

            {/* Resources */}
            {step.resources.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Learning Resources</p>
                <div className="space-y-1.5">
                  {step.resources.map(r => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-base">{r.free ? '🆓' : '💳'}</span>
                      <span className="hover:underline flex-1">{r.name}</span>
                      {r.free && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">FREE</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const LearningRoadmap: React.FC = () => {
  const [open,            setOpen]            = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(ROADMAPS[0].subject);
  const [progress,        setProgress]        = useState<ProgressMap>(loadProgress);
  const [langFilter,      setLangFilter]      = useState('All');

  const roadmap = useMemo<SubjectRoadmap>(
    () => ROADMAPS.find(r => r.subject === selectedSubject) ?? ROADMAPS[0],
    [selectedSubject],
  );

  const isLanguagePath = selectedSubject.toLowerCase().includes('language');

  // Persist progress on every change
  useEffect(() => { saveProgress(progress); }, [progress]);

  // Reset language filter when switching subjects
  useEffect(() => { setLangFilter('All'); }, [selectedSubject]);

  const setStepStatus = useCallback((level: string, status: StepStatus) => {
    setProgress(prev => ({
      ...prev,
      [selectedSubject]: { ...(prev[selectedSubject] ?? {}), [level]: status },
    }));
  }, [selectedSubject]);

  const getStepStatus = (level: string): StepStatus =>
    (progress[selectedSubject]?.[level] as StepStatus) ?? 'not-started';

  // Enhancement 2: Path progress bar
  const doneCount = roadmap.steps.filter(s => getStepStatus(s.level) === 'done').length;
  const totalSteps = roadmap.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

  // Enhancement 3: Total study hours
  const totalHrs = totalHours(roadmap.steps);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Panel toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🗺️</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Learning Roadmap</p>
            {!open && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {ROADMAPS.length} subject paths · Beginner → Expert
              </p>
            )}
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700">

          {/* Subject pills + Clear button */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 items-center">
            {ROADMAPS.map(r => {
              const sub = progress[r.subject] ?? {};
              const done = r.steps.filter(st => sub[st.level] === 'done').length;
              return (
                <button
                  key={r.subject}
                  onClick={() => setSelectedSubject(r.subject)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    selectedSubject === r.subject
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{SUBJECT_SHORT[r.subject] ?? r.subject.split(' ')[0]}</span>
                  {done > 0 && (
                    <span className={`text-[9px] font-bold px-1 rounded-full ${selectedSubject === r.subject ? 'bg-white/30 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                      {done}/{r.steps.length}
                    </span>
                  )}
                </button>
              );
            })}
            {/* Clear selection button */}
            <button
              onClick={() => setSelectedSubject(ROADMAPS[0].subject)}
              title="Reset to first subject"
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
              Clear
            </button>
          </div>

          {/* Subject header */}
          <div className="px-4 pb-3">
            <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{roadmap.icon}</span>
                  <p className="text-base font-bold text-slate-800 dark:text-slate-100">{roadmap.subject}</p>
                </div>
                {/* Enhancement 3: Time investment */}
                {totalHrs > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    ~{totalHrs}h total
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">{roadmap.description}</p>

              {/* Enhancement 2: Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    {roadmap.steps.map(st => {
                      const lvlStatus = getStepStatus(st.level);
                      const sc = LEVEL_STYLES[st.level];
                      return (
                        <div key={st.level} className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${lvlStatus === 'done' ? 'bg-emerald-400' : lvlStatus === 'in-progress' ? 'bg-amber-400' : sc?.dot}`} />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{st.level}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      {doneCount}/{totalSteps} done
                    </span>
                    {doneCount > 0 && (
                      <button
                        onClick={() => setProgress(prev => ({ ...prev, [selectedSubject]: {} }))}
                        title="Reset all progress for this subject"
                        className="text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-400 transition-colors underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Enhancement 4: Language filter (Languages path only) */}
            {isLanguagePath && (
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Filter by language</p>
                <div className="flex flex-wrap gap-1.5">
                  {LANG_FILTERS.map(f => (
                    <button
                      key={f.label}
                      onClick={() => setLangFilter(f.label)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                        langFilter === f.label
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="px-4 pb-3">
            {roadmap.steps.map((step, i) => (
              <StepCard
                key={step.level}
                step={step}
                isLast={i === roadmap.steps.length - 1}
                status={getStepStatus(step.level)}
                onStatusChange={st => setStepStatus(step.level, st)}
                langFilter={langFilter}
                isLanguagePath={isLanguagePath}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { ROADMAPS, SubjectRoadmap, RoadmapStep } from '../lib/certifications';

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400  border-green-200  dark:border-green-800',
  intermediate: 'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400   border-blue-200   dark:border-blue-800',
  advanced:     'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  expert:       'bg-rose-100   dark:bg-rose-900/30   text-rose-700   dark:text-rose-400   border-rose-200   dark:border-rose-800',
};

const LEVEL_DOT: Record<string, string> = {
  beginner:     'bg-green-400',
  intermediate: 'bg-blue-400',
  advanced:     'bg-purple-400',
  expert:       'bg-rose-400',
};

function StepCard({ step, isLast }: { step: RoadmapStep; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const color = LEVEL_COLOR[step.level] ?? LEVEL_COLOR.beginner;
  const dot   = LEVEL_DOT[step.level]  ?? LEVEL_DOT.beginner;

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${dot}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 mt-1 mb-0" />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 rounded-xl border p-3 ${color} cursor-pointer`} onClick={() => setOpen(v => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{step.level}</span>
              <span className="text-[9px] opacity-50">·</span>
              <span className="text-[11px] font-semibold truncate">{step.title}</span>
            </div>
            <p className="text-[10px] opacity-75 mt-0.5 leading-snug">{step.goal}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>

        {open && (
          <div className="mt-3 space-y-3 border-t border-current/10 pt-3">
            {/* Skills */}
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Key Skills</p>
              <div className="flex flex-wrap gap-1">
                {step.skills.map(s => (
                  <span key={s} className="text-[9px] bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>

            {/* Certs */}
            {step.certs.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Certifications</p>
                <div className="space-y-1.5">
                  {step.certs.map(cert => (
                    <a key={cert.id} href={cert.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2 bg-white/50 dark:bg-black/20 rounded-lg px-2 py-1.5 hover:bg-white/70 dark:hover:bg-black/30 transition-colors group"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold leading-tight group-hover:underline truncate">
                          {cert.acronym ?? cert.name}
                        </p>
                        <p className="text-[9px] opacity-70 leading-tight truncate">{cert.body}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {cert.cost && <p className="text-[9px] font-medium opacity-80">{cert.cost}</p>}
                        {cert.duration && <p className="text-[9px] opacity-60">{cert.duration}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {step.resources.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1.5">Resources</p>
                <div className="space-y-1">
                  {step.resources.map(r => (
                    <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      <span>{r.free ? '🆓' : '💳'}</span>
                      <span className="truncate">{r.name}</span>
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

export const LearningRoadmap: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(ROADMAPS[0].subject);

  const roadmap = useMemo<SubjectRoadmap>(
    () => ROADMAPS.find(r => r.subject === selectedSubject) ?? ROADMAPS[0],
    [selectedSubject],
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🗺️</span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">Learning Roadmap</p>
            {!open && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                {ROADMAPS.length} subject paths · beginner → expert
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
          {/* Subject selector */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {ROADMAPS.map(r => (
                <button
                  key={r.subject}
                  onClick={() => setSelectedSubject(r.subject)}
                  className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full transition-colors ${
                    selectedSubject === r.subject
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.subject.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Roadmap header */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xl">{roadmap.icon}</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{roadmap.subject}</p>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{roadmap.description}</p>
          </div>

          {/* Timeline steps */}
          <div className="px-4 pb-2">
            {roadmap.steps.map((step, i) => (
              <StepCard key={step.level} step={step} isLast={i === roadmap.steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

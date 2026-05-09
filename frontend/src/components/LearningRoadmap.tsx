import React, { useState, useMemo } from 'react';
import { ROADMAPS, SubjectRoadmap, RoadmapStep } from '../lib/certifications';

const LEVEL_STYLES: Record<string, { card: string; dot: string; badge: string }> = {
  beginner:     { card: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
  intermediate: { card: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',           dot: 'bg-blue-400',    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  advanced:     { card: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',   dot: 'bg-purple-400',  badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' },
  expert:       { card: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',           dot: 'bg-rose-400',    badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' },
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

function StepCard({ step, isLast }: { step: RoadmapStep; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const s = LEVEL_STYLES[step.level] ?? LEVEL_STYLES.beginner;

  return (
    <div className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-slate-800 ${s.dot}`} />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-600 mt-1" />}
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-5 rounded-xl border ${s.card} cursor-pointer transition-shadow hover:shadow-md`}
        onClick={() => setOpen(v => !v)}
      >
        {/* Card header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${s.badge}`}>
                {step.level}
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.goal}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className={`w-4 h-4 flex-shrink-0 mt-1 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
          </svg>
        </div>

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
            {step.certs.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Certifications</p>
                <div className="space-y-2">
                  {step.certs.map(cert => (
                    <a
                      key={cert.id}
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 bg-white/70 dark:bg-black/25 rounded-xl px-3 py-2.5 hover:bg-white dark:hover:bg-black/35 transition-colors group border border-white/50 dark:border-white/5"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:underline leading-tight">
                          {cert.acronym ? (
                            <><span>{cert.acronym}</span><span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">— {cert.name}</span></>
                          ) : cert.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cert.body}</p>
                        {cert.desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">{cert.desc}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right space-y-0.5">
                        {cert.cost     && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{cert.cost}</p>}
                        {cert.duration && <p className="text-xs text-slate-400">{cert.duration}</p>}
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 group-hover:underline">View →</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {step.resources.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Learning Resources</p>
                <div className="space-y-1.5">
                  {step.resources.map(r => (
                    <a
                      key={r.name}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-base">{r.free ? '🆓' : '💳'}</span>
                      <span className="hover:underline">{r.name}</span>
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

export const LearningRoadmap: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>(ROADMAPS[0].subject);

  const roadmap = useMemo<SubjectRoadmap>(
    () => ROADMAPS.find(r => r.subject === selectedSubject) ?? ROADMAPS[0],
    [selectedSubject],
  );

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

          {/* Subject pills */}
          <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
            {ROADMAPS.map(r => (
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
              </button>
            ))}
          </div>

          {/* Subject header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/40 mx-3 rounded-xl mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{roadmap.icon}</span>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100">{roadmap.subject}</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{roadmap.description}</p>
            <div className="flex gap-3 mt-2">
              {roadmap.steps.map(s => (
                <div key={s.level} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${LEVEL_STYLES[s.level]?.dot}`} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{s.level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="px-4 pb-3">
            {roadmap.steps.map((step, i) => (
              <StepCard key={step.level} step={step} isLast={i === roadmap.steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

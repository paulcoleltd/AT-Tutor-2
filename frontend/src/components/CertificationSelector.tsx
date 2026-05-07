import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCertifications, uploadUrl, CertInfo } from '../lib/api';

const LEVEL_BADGE: Record<string, string> = {
  Foundational: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  Associate:    'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-400',
  Professional: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  Expert:       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  Specialty:    'bg-rose-100   dark:bg-rose-900/30   text-rose-700   dark:text-rose-400',
};

const VENDOR_ICON: Record<string, string> = {
  'Microsoft':              '🪟',
  'Amazon Web Services':    '🟠',
  'Google Cloud':           '🔵',
  'CompTIA':                '🛡️',
  'CNCF / Linux Foundation':'☸️',
  'HashiCorp':              '🏗️',
  'Cisco':                  '🔗',
  'Scrum.org':              '🔄',
  'Axelos / PeopleCert':    '📋',
  'Linux Foundation':       '🐧',
};

type Tab = 'catalog' | 'url';

interface CustomCourse {
  url:   string;
  label: string;
}

interface Props {
  onStartExam:    (cert: CertInfo, action: 'mock-exam' | 'coach' | 'study-plan') => void;
  onClose:        () => void;
  onKbRefresh?:   () => void;
}

export const CertificationSelector: React.FC<Props> = ({ onStartExam, onClose, onKbRefresh }) => {
  const [tab,        setTab]       = useState<Tab>('catalog');
  const [certs,      setCerts]     = useState<CertInfo[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [search,     setSearch]    = useState('');
  const [category,   setCategory]  = useState('All');
  const [selected,   setSelected]  = useState<CertInfo | null>(null);

  // URL course loader state
  const [courseUrl,   setCourseUrl]   = useState('');
  const [urlLoading,  setUrlLoading]  = useState(false);
  const [urlError,    setUrlError]    = useState<string | null>(null);
  const [loadedCourse, setLoadedCourse] = useState<CustomCourse | null>(null);

  useEffect(() => {
    getCertifications()
      .then(setCerts)
      .catch(() => {/* backend offline */})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(certs.map(c => c.category))];
    return cats;
  }, [certs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return certs.filter(c =>
      (category === 'All' || c.category === category) &&
      (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.vendor.toLowerCase().includes(q)),
    );
  }, [certs, search, category]);

  const handleLoadUrl = useCallback(async () => {
    const trimmed = courseUrl.trim();
    if (!trimmed) return;
    setUrlError(null);
    setUrlLoading(true);
    try {
      await uploadUrl(trimmed);
      const label = new URL(trimmed).hostname.replace(/^www\./, '');
      setLoadedCourse({ url: trimmed, label });
      onKbRefresh?.();
    } catch (e: any) {
      setUrlError(e.message ?? 'Failed to load URL');
    } finally {
      setUrlLoading(false);
    }
  }, [courseUrl, onKbRefresh]);

  // Build a minimal CertInfo stub so custom courses can reuse the exam/coach flow
  function customCertStub(course: CustomCourse): CertInfo {
    return {
      code:          'CUSTOM',
      name:          course.label,
      vendor:        course.url,
      level:         'Associate',
      category:      'Custom',
      questionCount: 10,
      timeMinutes:   30,
      passingScore:  '70%',
      domains:       [{ name: 'Course content', weight: 100 }],
      studyTips:     [course.url],
    };
  }

  if (selected) {
    return (
      <div className="absolute inset-0 z-20 bg-white dark:bg-slate-800 flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl">
        {/* Detail header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-blue-600">
          <div className="flex items-center gap-2">
            <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white" aria-label="Back">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd"/>
              </svg>
            </button>
            <span className="text-white font-bold text-sm">{selected.code}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_BADGE[selected.level] ?? ''}`}>{selected.level}</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{selected.vendor}</p>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{selected.name}</h2>
          </div>

          {/* Exam stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Questions', value: String(selected.questionCount) },
              { label: 'Duration',  value: `${selected.timeMinutes} min` },
              { label: 'Pass mark', value: selected.passingScore },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 dark:bg-slate-700 rounded-xl py-2 px-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Domains */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Exam Domains</p>
            <div className="space-y-1.5">
              {selected.domains.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-0.5">
                    <span>{d.name}</span>
                    <span className="font-semibold">{d.weight}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${d.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Study tips */}
          {selected.studyTips.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-3">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1.5">📚 Top Study Resources</p>
              <ul className="space-y-1">
                {selected.studyTips.map(t => (
                  <li key={t} className="text-[11px] text-amber-600 dark:text-amber-300 flex gap-1.5">
                    <span className="flex-shrink-0">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 gap-2">
          <button
            onClick={() => onStartExam(selected, 'mock-exam')}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
          >
            🎓 Start Mock Exam ({selected.questionCount} questions · {selected.timeMinutes} min)
          </button>
          <button
            onClick={() => onStartExam(selected, 'coach')}
            className="w-full py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-sm font-medium transition-colors border border-blue-200 dark:border-blue-700"
          >
            💬 Coach Me (interactive practice)
          </button>
          <button
            onClick={() => onStartExam(selected, 'study-plan')}
            className="w-full py-2 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600"
          >
            📋 Generate Study Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 bg-white dark:bg-slate-800 flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h2 className="text-white font-bold text-sm">Certification Prep</h2>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
          </svg>
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        {([['catalog', '📋 Catalog'], ['url', '🔗 Load from URL']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === t
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── URL LOADER TAB ─────────────────────────────────────────────────── */}
      {tab === 'url' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Paste any course URL — YouTube lecture, Microsoft Learn module, Udemy, Coursera, blog post, or documentation page — and the AI will study it with you.
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Course URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={courseUrl}
                onChange={e => { setCourseUrl(e.target.value); setUrlError(null); setLoadedCourse(null); }}
                onKeyDown={e => e.key === 'Enter' && !urlLoading && handleLoadUrl()}
                placeholder="https://learn.microsoft.com/en-us/training/…"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                onClick={handleLoadUrl}
                disabled={!courseUrl.trim() || urlLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex-shrink-0"
              >
                {urlLoading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : 'Load'}
              </button>
            </div>
            {urlError && (
              <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <span>⚠️</span> {urlError}
              </p>
            )}
          </div>

          {/* Quick-pick popular course sites */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Popular sources</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: '🪟', name: 'Microsoft Learn',  url: 'https://learn.microsoft.com/en-us/training/browse/' },
                { icon: '🟠', name: 'AWS Skill Builder', url: 'https://skillbuilder.aws/' },
                { icon: '🔵', name: 'Google Cloud',     url: 'https://cloud.google.com/learn/training' },
                { icon: '🛡️', name: 'CompTIA CertMaster', url: 'https://www.comptia.org/training/certmaster-learn' },
                { icon: '▶️', name: 'YouTube',          url: 'https://www.youtube.com' },
                { icon: '📚', name: 'Coursera',         url: 'https://www.coursera.org' },
              ].map(s => (
                <button
                  key={s.name}
                  onClick={() => { setCourseUrl(s.url); setUrlError(null); setLoadedCourse(null); }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-2 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors text-left"
                >
                  <span>{s.icon}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Success state */}
          {loadedCourse && (
            <div className="rounded-xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-500 text-lg">✅</span>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">Course loaded!</p>
                  <p className="text-[11px] text-green-600 dark:text-green-400 truncate">{loadedCourse.url}</p>
                </div>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                The AI has read this course. Choose how you want to study it:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => onStartExam(customCertStub(loadedCourse), 'mock-exam')}
                  className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors"
                >
                  🎓 Quiz me on this course
                </button>
                <button
                  onClick={() => onStartExam(customCertStub(loadedCourse), 'coach')}
                  className="w-full py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium transition-colors border border-blue-200 dark:border-blue-700"
                >
                  💬 Coach me through it
                </button>
                <button
                  onClick={() => onStartExam(customCertStub(loadedCourse), 'study-plan')}
                  className="w-full py-2 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-600"
                >
                  📋 Generate study plan from this course
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CATALOG TAB ───────────────────────────────────────────────────── */}
      {tab === 'catalog' && <>
        {/* Search + filter */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by code or name (e.g. AZ-400, Security+)…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-1.5 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                  category === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-slate-400">
              <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Loading certifications…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">No certifications match your search.</p>
          )}
          {!loading && filtered.map(cert => (
            <button
              key={cert.code}
              onClick={() => setSelected(cert)}
              className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 px-3 py-2.5 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{VENDOR_ICON[cert.vendor] ?? '📄'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      {cert.code}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{cert.name}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${LEVEL_BADGE[cert.level] ?? ''}`}>{cert.level}</span>
                  <span className="text-[10px] text-slate-400">{cert.questionCount}Q · {cert.timeMinutes}m</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 text-center">
          {certs.length} certifications available · Select one to start mock exam or coaching
        </div>
      </>}
    </div>
  );
};

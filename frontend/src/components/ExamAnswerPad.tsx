/**
 * ExamAnswerPad — single editable answer sheet.
 *
 * Counts Q1…QN in the exam text, pre-fills one "Q#: " line per question,
 * and lets the user type freely on each line. No complex parsing needed —
 * guaranteed to work regardless of how the AI formats its questions.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface Props {
  examText:  string;
  onSubmit:  (formatted: string) => void;
  disabled?: boolean;
  onDismiss?: () => void;
}

function countQuestions(text: string): number {
  // Find highest Q number mentioned (handles Q1. Q1: Q1— **Q1** etc.)
  const matches = [...text.matchAll(/\bQ\s*(\d{1,3})\b/gi)];
  if (matches.length === 0) return 0;
  const nums = matches.map(m => parseInt(m[1]));
  const max  = Math.max(...nums);
  // Sanity check: must be at least 2 questions and no more than 200
  return max >= 2 && max <= 200 ? max : 0;
}

function buildTemplate(n: number): string {
  return Array.from({ length: n }, (_, i) => `Q${i + 1}: `).join('\n');
}

export const ExamAnswerPad: React.FC<Props> = ({ examText, onSubmit, disabled, onDismiss }) => {
  const total      = useMemo(() => countQuestions(examText), [examText]);
  const [text, setText]           = useState(() => buildTemplate(total > 0 ? total : 1));
  const [submitted, setSubmitted] = useState(false);
  const [warn,      setWarn]      = useState('');
  const ref        = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Re-build template when total changes (e.g. message finishes streaming)
    if (total > 0) setText(buildTemplate(total));
  }, [total]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (total === 0) return null;

  // Count how many Qn: lines have an answer after the colon
  const answered = text.split('\n').filter(line => {
    const m = line.match(/^Q\d+:\s*(.+)/);
    return m && m[1].trim().length > 0;
  }).length;
  const pct = Math.round((answered / total) * 100);

  const handleSubmit = (force = false) => {
    if (!force && answered === 0) {
      setWarn('Please fill in at least one answer before submitting.');
      return;
    }
    setWarn('');
    setSubmitted(true);
    onSubmit(text.trim() + '\n\nSUBMIT');
  };

  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border-2 border-indigo-300 dark:border-indigo-600">

      {/* Header */}
      <div className="bg-indigo-600 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📝</span>
          <div>
            <p className="text-white font-bold text-sm">Answer Pad</p>
            <p className="text-indigo-200 text-xs">{total} questions · type your answer after each Q#:</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-white text-xs font-semibold">{answered}/{total} answered</p>
            <div className="mt-1 h-1.5 w-24 bg-indigo-800 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {onDismiss && !submitted && (
            <button
              onClick={onDismiss}
              title="Dismiss answer pad"
              className="text-indigo-200 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors flex-shrink-0"
              aria-label="Close answer pad"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {submitted ? (
        <div className="bg-white dark:bg-slate-800 px-6 py-8 text-center space-y-2">
          <p className="text-3xl">⏳</p>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">Grading in progress…</p>
          <p className="text-sm text-slate-400">Your score and feedback will appear in the chat above.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800">

          {/* Instruction */}
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click a line and type your answer after the <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">Q#:</code>.
              Each line is one question. Press <kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-[10px]">Enter</kbd> to move to the next.
            </p>
          </div>

          {/* THE answer textarea */}
          <div className="px-5 pb-4">
            <textarea
              ref={ref}
              value={text}
              onChange={e => { setText(e.target.value); setWarn(''); }}
              disabled={disabled}
              rows={Math.min(total + 2, 20)}
              spellCheck={false}
              className="w-full rounded-xl border-2 border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 font-mono text-sm px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 resize-y disabled:opacity-50 leading-7"
              style={{ minHeight: `${Math.min(total, 15) * 28 + 24}px` }}
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">
              {answered}/{total} lines filled
            </p>
          </div>

          {/* Warning */}
          {warn && (
            <div className="mx-5 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              ⚠️ {warn}
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {answered === total
                  ? '✅ All answered — ready to submit'
                  : `${total - answered} question${total - answered !== 1 ? 's' : ''} still blank`}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {answered < total && (
                <button onClick={() => handleSubmit(true)} disabled={disabled}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50">
                  Submit anyway
                </button>
              )}
              <button onClick={() => handleSubmit(false)} disabled={disabled}
                className={`px-6 py-2 text-sm font-bold rounded-xl text-white transition-colors disabled:opacity-50 ${
                  answered === total
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}>
                🎓 Submit for Grading
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

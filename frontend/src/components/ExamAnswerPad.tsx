/**
 * ExamAnswerPad — interactive answer sheet that appears below an exam paper.
 * Redesigned for reliability: one clearly-visible text field per question,
 * robust question parsing, and a single-textarea fallback.
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';

interface Question {
  number: number;
  label:  string;   // short display label e.g. "Q1"
  type:   'mcq' | 'truefalse' | 'short';
  options: string[];
}

interface Props {
  examText:  string;
  onSubmit:  (formatted: string) => void;
  disabled?: boolean;
}

// ── Robust question parser ─────────────────────────────────────────────────────
function parseQuestions(text: string): Question[] {
  const questions: Question[] = [];
  // Match Q1, Q2, Q1., Q1:, **Q1**, Q1 —  etc.
  const re = /(?:^|\n)\s*\*{0,2}(Q\s*(\d{1,3}))\*{0,2}\s*[.:\-—–\s]/gm;
  const found = new Set<number>();
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const num = parseInt(m[2]);
    if (!found.has(num) && num >= 1 && num <= 200) {
      found.add(num);

      // Extract snippet of text after the Q number (up to 300 chars)
      const startIdx = m.index + m[0].length;
      const snippet = text.slice(startIdx, startIdx + 300).split(/\n\s*\*{0,2}Q\d+/)[0].trim();

      // Detect type
      const isTF  = /true\s+or\s+false/i.test(snippet);
      const hasMCQ = /^\s*[A-D]\s*[).]/m.test(snippet);
      const type: Question['type'] = isTF ? 'truefalse' : hasMCQ ? 'mcq' : 'short';

      // Extract MCQ options
      const opts: string[] = [];
      if (hasMCQ) {
        const optRe = /^\s*([A-D])\s*[).\s]\s*(.+)$/gm;
        let om: RegExpExecArray | null;
        while ((om = optRe.exec(snippet)) !== null) opts.push(`${om[1]}) ${om[2].trim()}`);
      }

      questions.push({ number: num, label: `Q${num}`, type, options: opts });
    }
  }

  return questions.sort((a, b) => a.number - b.number);
}

// ── Single question answer input ───────────────────────────────────────────────
function QInput({ q, value, onChange, answerRef }: {
  q: Question;
  value: string;
  onChange: (v: string) => void;
  answerRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  const baseInput = 'block w-full rounded-lg border border-slate-300 dark:border-slate-500 bg-slate-50 dark:bg-slate-600 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm';

  if (q.type === 'truefalse') {
    const tf = value.match(/^(True|False)/i)?.[1] ?? '';
    const justification = value.replace(/^(True|False)\s*[-—]?\s*/i, '');
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {['True', 'False'].map(opt => (
            <button key={opt} type="button"
              onClick={() => onChange(opt + (justification ? ` — ${justification}` : ''))}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                tf === opt
                  ? opt === 'True'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-red-500 border-red-500 text-white'
                  : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
              }`}
            >{opt === 'True' ? '✓ True' : '✗ False'}</button>
          ))}
        </div>
        <input type="text" placeholder="Justify your answer…"
          value={justification}
          onChange={e => onChange((tf || 'True') + ` — ${e.target.value}`)}
          className={baseInput + ' px-3 py-2'} />
      </div>
    );
  }

  if (q.type === 'mcq' && q.options.length > 0) {
    return (
      <div className="space-y-1.5">
        {q.options.map(opt => (
          <label key={opt} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
            value === opt
              ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-400 text-indigo-800 dark:text-indigo-200'
              : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500 text-slate-800 dark:text-slate-100 hover:border-indigo-300'
          }`}>
            <input type="radio" className="accent-indigo-600 flex-shrink-0"
              checked={value === opt} onChange={() => onChange(opt)} />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  // Short answer / theory
  return (
    <textarea ref={answerRef} rows={3}
      placeholder={`Type your answer for Q${q.number} here…`}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={baseInput + ' px-3 py-2 resize-y min-h-[72px]'}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const ExamAnswerPad: React.FC<Props> = ({ examText, onSubmit, disabled }) => {
  const questions   = useMemo(() => parseQuestions(examText), [examText]);
  const [answers,   setAnswers]   = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [warn,      setWarn]      = useState(false);
  const firstRef    = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus first text answer on mount
    firstRef.current?.focus();
  }, []);

  if (questions.length === 0) return null;

  const answered    = questions.filter(q => (answers[q.number] ?? '').trim()).length;
  const allAnswered = answered === questions.length;
  const pct         = Math.round((answered / questions.length) * 100);

  const handleSubmit = (force = false) => {
    if (!force && !allAnswered) { setWarn(true); return; }
    setWarn(false);
    setSubmitted(true);
    const text = questions.map(q => {
      const ans = (answers[q.number] ?? '').trim() || '(no answer provided)';
      return `Q${q.number}: ${ans}`;
    }).join('\n') + '\n\nSUBMIT';
    onSubmit(text);
  };

  return (
    <div className="mt-4 rounded-2xl overflow-hidden shadow-lg border-2 border-indigo-300 dark:border-indigo-700">

      {/* Header */}
      <div className="bg-indigo-600 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📝</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Answer Pad</p>
            <p className="text-indigo-200 text-xs">{questions.length} questions to answer</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-white text-xs font-semibold">{answered}/{questions.length} answered</p>
          <div className="h-1.5 w-28 bg-indigo-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="bg-white dark:bg-slate-800 px-5 py-8 text-center">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">Grading your answers…</p>
          <p className="text-sm text-slate-400 mt-1">Results will appear in the chat above.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800">
          {/* Answer fields */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {questions.map((q, idx) => {
              const val = answers[q.number] ?? '';
              const done = val.trim().length > 0;
              return (
                <div key={q.number} className="px-5 py-4">
                  {/* Q label row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      done
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {q.label}
                    </span>
                    {done && <span className="text-emerald-500 text-sm font-bold">✓ Answered</span>}
                  </div>

                  {/* Input */}
                  <QInput
                    q={q}
                    value={val}
                    onChange={v => { setAnswers(p => ({ ...p, [q.number]: v })); setWarn(false); }}
                    answerRef={idx === 0 ? firstRef : undefined}
                  />
                </div>
              );
            })}
          </div>

          {/* Warning */}
          {warn && !allAnswered && (
            <div className="mx-5 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              ⚠️ {questions.length - answered} question{questions.length - answered !== 1 ? 's' : ''} still blank.
              You can submit anyway or go back to fill them in.
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {allAnswered
                ? '✅ All answered — ready to submit'
                : `${questions.length - answered} question${questions.length - answered !== 1 ? 's' : ''} remaining`}
            </p>
            <div className="flex gap-2">
              {!allAnswered && (
                <button onClick={() => handleSubmit(true)} disabled={disabled}
                  className="px-4 py-2 text-sm rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 transition-colors">
                  Submit anyway
                </button>
              )}
              <button onClick={() => handleSubmit(false)} disabled={disabled}
                className={`px-6 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
                  allAnswered
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

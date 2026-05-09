/**
 * ExamAnswerPad — interactive answer sheet that appears below an exam paper.
 *
 * Features:
 * - Parses Q1…QN from the exam message text
 * - Auto-detects question type: MCQ → radio buttons, True/False → radio,
 *   Fill-in-blank → single input, theory/application → textarea
 * - Tracks all answers in state
 * - SUBMIT button formats answers + sends to agent for grading
 * - Shows a "not answered" warning before allowing submit
 */

import React, { useMemo, useState } from 'react';

interface Question {
  number:  number;
  text:    string;
  type:    'mcq' | 'truefalse' | 'fillin' | 'theory';
  options: string[]; // for MCQ
  marks:   number;
}

interface Props {
  examText:  string;           // raw assistant message text
  onSubmit:  (formatted: string) => void;
  disabled?: boolean;
}

// ── Question parser ────────────────────────────────────────────────────────────
function parseQuestions(text: string): Question[] {
  // Split on Q1, Q2, etc. boundaries
  const blocks = text.split(/(?=\n\*{0,2}Q\d+[\s—–-])/i).filter(b => /Q\d+/i.test(b));

  return blocks.map(block => {
    const numMatch = block.match(/Q(\d+)/i);
    const number = numMatch ? parseInt(numMatch[1]) : 0;

    // Extract mark value
    const markMatch = block.match(/\((\d+)\s*marks?\)/i);
    const marks = markMatch ? parseInt(markMatch[1]) : 1;

    // Clean question text (strip markdown bold markers, trim)
    const cleanText = block
      .replace(/\*\*/g, '')
      .replace(/Q\d+\s*[—–-]\s*/i, '')
      .trim()
      .slice(0, 400);

    // Detect MCQ: look for A) B) C) D) options
    const optionMatches = block.match(/^[A-D]\)\s*.+$/gm);
    if (optionMatches && optionMatches.length >= 2) {
      return {
        number, text: cleanText, type: 'mcq' as const, marks,
        options: optionMatches.map(o => o.trim()),
      };
    }

    // Detect True/False
    if (/true\s+or\s+false/i.test(block)) {
      return { number, text: cleanText, type: 'truefalse' as const, marks, options: ['True', 'False'] };
    }

    // Detect Fill-in-the-blank
    if (/______+|fill\s+in/i.test(block)) {
      return { number, text: cleanText, type: 'fillin' as const, marks, options: [] };
    }

    // Default: theory (textarea)
    return { number, text: cleanText, type: 'theory' as const, marks, options: [] };
  }).filter(q => q.number > 0);
}

// ── AnswerInput ────────────────────────────────────────────────────────────────
function AnswerInput({
  question, value, onChange,
}: { question: Question; value: string; onChange: (v: string) => void }) {

  if (question.type === 'mcq') {
    return (
      <div className="space-y-1.5 mt-2">
        {question.options.map(opt => (
          <label key={opt} className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border transition-colors ${
            value === opt
              ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
              : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-700'
          }`}>
            <input type="radio" name={`q${question.number}`} value={opt} checked={value === opt}
              onChange={e => onChange(e.target.value)}
              className="mt-0.5 accent-indigo-600 flex-shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-200">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'truefalse') {
    return (
      <div className="flex gap-3 mt-2">
        {['True', 'False'].map(opt => (
          <label key={opt} className={`flex items-center gap-2 px-5 py-2 rounded-xl cursor-pointer border font-semibold text-sm transition-colors ${
            value === opt
              ? opt === 'True'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-700 dark:text-red-400'
              : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400'
          }`}>
            <input type="radio" name={`q${question.number}`} value={opt} checked={value === opt}
              onChange={e => onChange(e.target.value)} className="sr-only" />
            <span>{opt === 'True' ? '✓' : '✗'}</span>
            <span>{opt}</span>
          </label>
        ))}
        {/* Justification box always shown for T/F */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            placeholder="Justify your answer…"
            value={value.replace(/^(True|False)\s*/i, '')}
            onChange={e => {
              const tf = value.match(/^(True|False)/i)?.[0] ?? '';
              onChange(tf ? `${tf} — ${e.target.value}` : e.target.value);
            }}
            className="w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
    );
  }

  if (question.type === 'fillin') {
    return (
      <input
        type="text"
        placeholder="Your answer…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2 w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    );
  }

  // theory / application
  return (
    <textarea
      rows={3}
      placeholder="Write your answer here…"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="mt-2 w-full text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const ExamAnswerPad: React.FC<Props> = ({ examText, onSubmit, disabled }) => {
  const questions = useMemo(() => parseQuestions(examText), [examText]);
  const [answers,    setAnswers]    = useState<Record<number, string>>({});
  const [submitted,  setSubmitted]  = useState(false);
  const [showWarn,   setShowWarn]   = useState(false);

  if (questions.length === 0) return null;

  const totalMarks    = questions.reduce((s, q) => s + q.marks, 0);
  const answeredCount = questions.filter(q => (answers[q.number] ?? '').trim().length > 0).length;
  const allAnswered   = answeredCount === questions.length;

  const handleSubmit = () => {
    if (!allAnswered) { setShowWarn(true); return; }
    setShowWarn(false);
    setSubmitted(true);

    const formatted = questions.map(q => {
      const ans = (answers[q.number] ?? '').trim() || '(no answer)';
      return `Q${q.number}: ${ans}`;
    }).join('\n') + '\n\nSUBMIT';

    onSubmit(formatted);
  };

  return (
    <div className="mt-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 overflow-hidden shadow-md">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Answer Pad</p>
            <p className="text-blue-200 text-[11px]">{questions.length} questions · {totalMarks} marks total</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white text-xs font-semibold">{answeredCount}/{questions.length} answered</p>
          {!allAnswered && (
            <div className="h-1 w-24 bg-white/20 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-white/80 rounded-full transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
            </div>
          )}
        </div>
      </div>

      {submitted ? (
        <div className="px-5 py-6 text-center space-y-2">
          <p className="text-2xl">⏳</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Grading in progress…</p>
          <p className="text-xs text-slate-400">The AI is marking your answers. Results will appear in the chat above.</p>
        </div>
      ) : (
        <>
          {/* Answer fields */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {questions.map(q => (
              <div key={q.number} className={`px-5 py-4 ${
                (answers[q.number] ?? '').trim()
                  ? 'bg-emerald-50/30 dark:bg-emerald-900/5'
                  : ''
              }`}>
                {/* Question header */}
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                    (answers[q.number] ?? '').trim()
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                      : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  }`}>Q{q.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-3">{q.text}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
                  </div>
                  {(answers[q.number] ?? '').trim() && (
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                  )}
                </div>

                <AnswerInput
                  question={q}
                  value={answers[q.number] ?? ''}
                  onChange={v => setAnswers(prev => ({ ...prev, [q.number]: v }))}
                />
              </div>
            ))}
          </div>

          {/* Warning */}
          {showWarn && !allAnswered && (
            <div className="mx-5 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
              ⚠️ {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} still unanswered. You can submit anyway or go back and complete them.
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {allAnswered ? '✅ All answered — ready to submit' : `${questions.length - answeredCount} remaining`}
            </p>
            <div className="flex gap-2">
              {!allAnswered && (
                <button
                  onClick={handleSubmit}
                  disabled={disabled}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                >
                  Submit anyway
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={disabled}
                className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm disabled:opacity-50 ${
                  allAnswered
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                🎓 Submit for Grading
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

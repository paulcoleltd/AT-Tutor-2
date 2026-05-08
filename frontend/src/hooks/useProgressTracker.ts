/**
 * useProgressTracker — persists learning metrics to localStorage.
 *
 * Tracks: total sessions, messages exchanged, quiz attempts, flashcard
 * sets generated, topics studied, documents uploaded, daily streaks,
 * and per-subject activity.
 *
 * The Chat component calls log*() helpers after each meaningful interaction.
 */

import { useState, useCallback } from 'react';

export interface DailyActivity {
  date:     string; // YYYY-MM-DD
  messages: number;
  quizzes:  number;
  sessions: number;
}

export interface SubjectProgress {
  subject:     string;
  sessions:    number;
  lastStudied: string;
  quizzesTaken: number;
  flashcardSets: number;
}

export interface LearningProgress {
  totalSessions:     number;
  totalMessages:     number;
  totalQuizzes:      number;
  totalFlashcards:   number;
  totalSummarisations: number;
  totalExplains:     number;
  totalExams:        number;
  docsUploaded:      number;
  streakDays:        number;
  lastStudied:       string;
  joinedAt:          string;
  certificatesEarned: string[];    // certificate IDs
  subjectProgress:   SubjectProgress[];
  weeklyActivity:    DailyActivity[]; // last 7 days
}

const STORAGE_KEY = 'ai-tutor-progress';

const EMPTY_PROGRESS: LearningProgress = {
  totalSessions:       0,
  totalMessages:       0,
  totalQuizzes:        0,
  totalFlashcards:     0,
  totalSummarisations: 0,
  totalExplains:       0,
  totalExams:          0,
  docsUploaded:        0,
  streakDays:          0,
  lastStudied:         '',
  joinedAt:            new Date().toISOString(),
  certificatesEarned:  [],
  subjectProgress:     [],
  weeklyActivity:      [],
};

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function load(): LearningProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_PROGRESS, ...JSON.parse(raw) } : { ...EMPTY_PROGRESS, joinedAt: new Date().toISOString() };
  } catch { return { ...EMPTY_PROGRESS, joinedAt: new Date().toISOString() }; }
}

function persist(p: LearningProgress): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

function updateStreak(p: LearningProgress): LearningProgress {
  const t = today();
  if (p.lastStudied === t) return p;
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
  const streakDays = p.lastStudied === yesterday ? p.streakDays + 1 : 1;
  return { ...p, streakDays, lastStudied: t };
}

function updateWeekly(p: LearningProgress, field: keyof DailyActivity): LearningProgress {
  const t = today();
  const existing = [...(p.weeklyActivity ?? [])];
  const idx = existing.findIndex(d => d.date === t);
  if (idx >= 0) {
    (existing[idx] as any)[field] = ((existing[idx] as any)[field] ?? 0) + 1;
  } else {
    const entry: DailyActivity = { date: t, messages: 0, quizzes: 0, sessions: 0 };
    (entry as any)[field] = 1;
    existing.push(entry);
  }
  // Keep last 7 days only
  const last7 = existing.sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  return { ...p, weeklyActivity: last7 };
}

function updateSubject(p: LearningProgress, subject: string, field: keyof SubjectProgress, delta = 1): LearningProgress {
  if (!subject) return p;
  const subs = [...(p.subjectProgress ?? [])];
  const idx  = subs.findIndex(s => s.subject.toLowerCase() === subject.toLowerCase());
  if (idx >= 0) {
    (subs[idx] as any)[field] = ((subs[idx] as any)[field] ?? 0) + delta;
    subs[idx].lastStudied = today();
  } else {
    const entry: SubjectProgress = { subject, sessions: 0, lastStudied: today(), quizzesTaken: 0, flashcardSets: 0 };
    (entry as any)[field] = delta;
    subs.push(entry);
  }
  return { ...p, subjectProgress: subs };
}

export function useProgressTracker() {
  const [progress, setProgress] = useState<LearningProgress>(load);

  const mutate = useCallback((updater: (prev: LearningProgress) => LearningProgress) => {
    setProgress(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const logMessage = useCallback((mode: string, subject = '') => {
    mutate(p => {
      let next = updateStreak(p);
      next = { ...next, totalMessages: next.totalMessages + 1 };
      next = updateWeekly(next, 'messages');
      if (mode === 'quiz')      next = { ...next, totalQuizzes:       next.totalQuizzes       + 1 };
      if (mode === 'flashcard') next = { ...next, totalFlashcards:    next.totalFlashcards    + 1 };
      if (mode === 'summarize') next = { ...next, totalSummarisations: next.totalSummarisations + 1 };
      if (mode === 'explain')   next = { ...next, totalExplains:      next.totalExplains      + 1 };
      if (mode === 'exam')      next = { ...next, totalExams:         next.totalExams         + 1 };
      if (subject) {
        if (mode === 'quiz')      next = updateSubject(next, subject, 'quizzesTaken');
        if (mode === 'flashcard') next = updateSubject(next, subject, 'flashcardSets');
        next = updateSubject(next, subject, 'sessions', 0); // touch lastStudied
      }
      return next;
    });
  }, [mutate]);

  const logSession = useCallback((subject = '') => {
    mutate(p => {
      let next = updateStreak({ ...p, totalSessions: p.totalSessions + 1 });
      next = updateWeekly(next, 'sessions');
      if (subject) next = updateSubject(next, subject, 'sessions');
      return next;
    });
  }, [mutate]);

  const logDocUploaded = useCallback(() => {
    mutate(p => ({ ...p, docsUploaded: p.docsUploaded + 1 }));
  }, [mutate]);

  const addCertificate = useCallback((certId: string) => {
    mutate(p => ({
      ...p,
      certificatesEarned: [...new Set([...p.certificatesEarned, certId])],
    }));
  }, [mutate]);

  const resetProgress = useCallback(() => {
    const fresh = { ...EMPTY_PROGRESS, joinedAt: new Date().toISOString() };
    persist(fresh);
    setProgress(fresh);
  }, []);

  // Computed stats
  const topSubject = progress.subjectProgress
    .sort((a, b) => b.sessions - a.sessions)[0]?.subject ?? 'None yet';

  const studyDays = progress.weeklyActivity.length;
  const isEligibleForCert = progress.totalSessions >= 5 && progress.totalMessages >= 10;

  return {
    progress,
    logMessage,
    logSession,
    logDocUploaded,
    addCertificate,
    resetProgress,
    topSubject,
    studyDays,
    isEligibleForCert,
  };
}

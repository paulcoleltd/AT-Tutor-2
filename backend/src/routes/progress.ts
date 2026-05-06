import { Router } from 'express';
import { getDb } from '../db';

export function createProgressRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const db  = getDb();
    const now = Date.now();
    const dayMs = 86_400_000;

    // Quiz accuracy (all time)
    const quizRows = db.prepare(`
      SELECT is_correct, created_at FROM quiz_results ORDER BY created_at DESC
    `).all() as { is_correct: number; created_at: number }[];

    const total   = quizRows.length;
    const correct = quizRows.filter(r => r.is_correct === 1).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

    // Last 7 days quiz accuracy (trend)
    const week = now - 7 * dayMs;
    const recentQuiz  = quizRows.filter(r => r.created_at >= week);
    const recentTotal = recentQuiz.length;
    const recentCorrect = recentQuiz.filter(r => r.is_correct === 1).length;
    const recentAccuracy = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : null;

    // Mode usage breakdown
    const modeRows = db.prepare(`
      SELECT mode, COUNT(*) AS count FROM session_modes GROUP BY mode
    `).all() as { mode: string; count: number }[];
    const modeBreakdown: Record<string, number> = {};
    for (const r of modeRows) modeBreakdown[r.mode] = r.count;

    // Session streak (consecutive calendar days with at least one session)
    const sessionDays = db.prepare(`
      SELECT DISTINCT CAST(last_used / 86400000 AS INTEGER) AS day FROM sessions ORDER BY day DESC
    `).all() as { day: number }[];

    let streak = 0;
    const todayDay = Math.floor(now / dayMs);
    let expected = todayDay;
    for (const { day } of sessionDays) {
      if (day === expected || day === expected - 1) {
        streak++;
        expected = day - 1;
      } else if (day < expected - 1) break;
    }

    // Topics (unique session titles, recent first)
    const topics = (db.prepare(`
      SELECT DISTINCT title FROM sessions
      WHERE title IS NOT NULL AND title != ''
      ORDER BY last_used DESC
      LIMIT 20
    `).all() as { title: string }[]).map(r => r.title);

    // Session counts
    const totalSessions = (db.prepare('SELECT COUNT(*) AS c FROM sessions').get() as { c: number }).c;
    const todaySessions = (db.prepare(
      'SELECT COUNT(*) AS c FROM sessions WHERE last_used >= ?'
    ).get(now - dayMs) as { c: number }).c;

    // Total exchanges (user messages)
    const totalMessages = (db.prepare(
      "SELECT COUNT(*) AS c FROM messages WHERE role = 'user'"
    ).get() as { c: number }).c;

    // Grade (driven by quiz accuracy OR last exam if available)
    const grade = accuracy === null ? null
      : accuracy >= 90 ? 'A'
      : accuracy >= 80 ? 'B'
      : accuracy >= 70 ? 'C'
      : accuracy >= 60 ? 'D'
      : 'F';

    // Exam history (last 10)
    const examRows = db.prepare(`
      SELECT score, total, grade, improvements, created_at FROM exam_results
      ORDER BY created_at DESC LIMIT 10
    `).all() as { score: number; total: number; grade: string; improvements: string; created_at: number }[];
    const exams = examRows.map(r => ({
      score:        r.score,
      total:        r.total,
      grade:        r.grade,
      improvements: JSON.parse(r.improvements) as string[],
      createdAt:    r.created_at,
    }));

    // Collate all improvement suggestions (most frequent)
    const improvementCounts = new Map<string, number>();
    for (const ex of exams) {
      for (const imp of ex.improvements) {
        improvementCounts.set(imp, (improvementCounts.get(imp) ?? 0) + 1);
      }
    }
    const topImprovements = [...improvementCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);

    res.json({
      quiz: { total, correct, accuracy, recentTotal, recentCorrect, recentAccuracy },
      grade,
      streak,
      topics,
      modeBreakdown,
      totalSessions,
      todaySessions,
      totalMessages,
      exams,
      topImprovements,
    });
  });

  return router;
}

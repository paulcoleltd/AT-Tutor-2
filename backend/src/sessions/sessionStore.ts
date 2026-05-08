import { getDb } from '../db';
import type { Message } from '../models/llmRouter';

const MAX_HISTORY_TURNS = 20;

export interface SessionMeta {
  id:        string;
  title:     string | null;
  createdAt: number;
  lastUsed:  number;
  summary:   string | null;
}

export class SessionStore {
  private touch(sessionId: string): void {
    const now = Date.now();
    getDb().prepare(`
      INSERT INTO sessions (id, created_at, last_used)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_used = excluded.last_used
    `).run(sessionId, now, now);
  }

  getHistory(sessionId: string): Message[] {
    this.touch(sessionId);
    const rows = getDb().prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as { role: string; content: string }[];

    const max = MAX_HISTORY_TURNS * 2;
    const trimmed = rows.length > max ? rows.slice(rows.length - max) : rows;
    return trimmed.map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }));
  }

  appendMessages(sessionId: string, user: string, assistant: string): void {
    const db  = getDb();
    const now = Date.now();

    db.prepare(`
      INSERT INTO sessions (id, created_at, last_used)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_used = ?
    `).run(sessionId, now, now, now);

    const row = db.prepare('SELECT title FROM sessions WHERE id = ?').get(sessionId) as { title: string | null } | undefined;
    if (!row?.title) {
      const trimmed = user.trim();
      const title   = trimmed.length > 60 ? trimmed.slice(0, 60) + '…' : trimmed;
      db.prepare('UPDATE sessions SET title = ? WHERE id = ?').run(title, sessionId);
    }

    db.prepare('INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)').run(sessionId, 'user',      user,      now);
    db.prepare('INSERT INTO messages (session_id, role, content, created_at) VALUES (?, ?, ?, ?)').run(sessionId, 'assistant', assistant, now + 1);
  }

  clearSession(sessionId: string): void {
    const db = getDb();
    db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }

  listSessions(limit = 50): SessionMeta[] {
    return getDb().prepare(`
      SELECT id, title, created_at AS createdAt, last_used AS lastUsed, summary
      FROM sessions
      ORDER BY last_used DESC
      LIMIT ?
    `).all(limit) as SessionMeta[];
  }

  getSessionMessages(sessionId: string): Message[] {
    const rows = getDb().prepare(`
      SELECT role, content FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId) as { role: string; content: string }[];
    return rows.map(r => ({ role: r.role as 'user' | 'assistant', content: r.content }));
  }

  updateSummary(sessionId: string, summary: string): void {
    getDb().prepare('UPDATE sessions SET summary = ? WHERE id = ?').run(summary, sessionId);
  }

  getRecentSummaries(excludeSessionId: string, limit = 4): SessionMeta[] {
    return getDb().prepare(`
      SELECT id, title, created_at AS createdAt, last_used AS lastUsed, summary
      FROM sessions
      WHERE id != ? AND summary IS NOT NULL AND summary != ''
      ORDER BY last_used DESC
      LIMIT ?
    `).all(excludeSessionId, limit) as SessionMeta[];
  }

  get activeCount(): number {
    const row = getDb().prepare('SELECT COUNT(*) AS c FROM sessions').get() as { c: number } | undefined;
    return row?.c ?? 0;
  }
}

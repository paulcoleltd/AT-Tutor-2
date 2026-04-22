import type { Message } from '../models/llmRouter';

const MAX_HISTORY_TURNS = 10;
const SESSION_TTL_MS    = 30 * 60 * 1000; // 30 minutes idle expiry

interface Session {
  history:     Message[];
  lastUsed:    number;
}

export class SessionStore {
  private sessions = new Map<string, Session>();

  private gc(): void {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.lastUsed > SESSION_TTL_MS) this.sessions.delete(id);
    }
  }

  getHistory(sessionId: string): Message[] {
    return this.sessions.get(sessionId)?.history ?? [];
  }

  appendMessages(sessionId: string, user: string, assistant: string): void {
    this.gc();
    const session = this.sessions.get(sessionId) ?? { history: [], lastUsed: Date.now() };
    session.history.push({ role: 'user', content: user });
    session.history.push({ role: 'assistant', content: assistant });
    // Trim to last N turns
    const max = MAX_HISTORY_TURNS * 2;
    if (session.history.length > max) {
      session.history = session.history.slice(session.history.length - max);
    }
    session.lastUsed = Date.now();
    this.sessions.set(sessionId, session);
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  get activeCount(): number {
    this.gc();
    return this.sessions.size;
  }
}

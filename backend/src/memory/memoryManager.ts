import { callLLM } from '../models/llmRouter';
import { SessionStore } from '../sessions/sessionStore';

const SUMMARY_MIN_MESSAGES = 4;

export class MemoryManager {
  constructor(private readonly sessions: SessionStore) {}

  async generateSummary(sessionId: string): Promise<void> {
    const messages = this.sessions.getSessionMessages(sessionId);
    if (messages.length < SUMMARY_MIN_MESSAGES) return;

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n\n')
      .slice(0, 8000);

    try {
      const summary = await callLLM(
        'You are a concise note-taker. Produce short bullet-point summaries of tutoring sessions.',
        `Summarize this tutoring session in 2–4 bullet points. Cover: main topics, key concepts learned, any tests or exercises completed.\n\n${transcript}`,
        [],
      );
      this.sessions.updateSummary(sessionId, summary.trim());
    } catch {
      // Non-fatal — summary generation is best-effort
    }
  }

  buildMemoryBlock(sessionId: string): string {
    const summaries = this.sessions.getRecentSummaries(sessionId, 4);
    if (summaries.length === 0) return '';

    const items = summaries.map(s => {
      const date  = new Date(s.lastUsed).toLocaleDateString();
      const title = s.title ? `"${s.title}"` : 'Untitled session';
      return `- ${date} — ${title}:\n${s.summary}`;
    }).join('\n\n');

    return `\n\nPAST SESSION MEMORY — what this student has covered before:\n${items}`;
  }
}

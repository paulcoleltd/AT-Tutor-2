import { Brain, RetrievalResult } from '../brain/brain';
import { callLLM, streamLLM, LLMError, Message } from '../models/llmRouter';
import { SessionStore } from '../sessions/sessionStore';

export type TeachMode = 'explain' | 'quiz' | 'chat' | 'summarize' | 'flashcard';

export interface TeachResponse {
  answer:  string;
  sources: string[];
}

const MODE_INSTRUCTIONS: Record<TeachMode, string> = {
  explain:
    'Explain the concept clearly and concisely. Use simple language, concrete examples, and analogies. Format your response using Markdown (headings, bold, bullet lists where helpful). Check for understanding at the end.',
  quiz:
    'Generate ONE focused quiz question based on the context. Present it clearly. After the user answers, give constructive Markdown-formatted feedback.',
  chat:
    'Engage in a natural, friendly conversation. Be helpful, curious, and encouraging. Use Markdown where it improves clarity.',
  summarize:
    'Produce a structured Markdown summary of the provided context. Use ## headings for major topics, bullet points for key facts, and a **Key Takeaways** section at the end.',
  flashcard:
    'Generate 5 flashcard pairs from the context in this exact Markdown format:\n\n**Q:** [question]\n**A:** [answer]\n\nRepeat for each card. Make questions concise and answers clear.',
};

const SYSTEM_PROMPT =
  'You are a friendly, expert AI Tutor. You explain concepts clearly with simple language, ' +
  'real-world examples, and analogies. You format responses in Markdown for readability. ' +
  "If you don't know something, say so honestly. Keep responses engaging and educational.";

export class TeacherAgent {
  constructor(
    private readonly brain:    Brain,
    private readonly sessions: SessionStore,
  ) {}

  async ask(userText: string, mode: TeachMode = 'explain', sessionId: string): Promise<TeachResponse> {
    if (!userText?.trim()) throw new Error('TeacherAgent.ask: userText must not be empty.');

    const { chunks, sources } = await this.brain.retrieve(userText);
    const contextStr = chunks.length > 0
      ? chunks.join('\n\n---\n\n')
      : '(No documents uploaded yet. Answer from general knowledge.)';

    const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.explain;
    const userPrompt  = buildPrompt(contextStr, instruction, userText);
    const history     = this.sessions.getHistory(sessionId);

    let answer: string;
    try {
      answer = await callLLM(SYSTEM_PROMPT, userPrompt, history);
    } catch (err) {
      if (err instanceof LLMError) throw err;
      throw new Error(`Unexpected error in teacher agent: ${(err as Error).message}`);
    }

    this.sessions.appendMessages(sessionId, userText, answer);
    return { answer, sources };
  }

  async *stream(userText: string, mode: TeachMode = 'explain', sessionId: string): AsyncGenerator<{ token?: string; sources?: string[]; done?: boolean }> {
    if (!userText?.trim()) throw new Error('TeacherAgent.stream: userText must not be empty.');

    const { chunks, sources }: RetrievalResult = await this.brain.retrieve(userText);
    const contextStr = chunks.length > 0
      ? chunks.join('\n\n---\n\n')
      : '(No documents uploaded yet. Answer from general knowledge.)';

    const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.explain;
    const userPrompt  = buildPrompt(contextStr, instruction, userText);
    const history     = this.sessions.getHistory(sessionId);

    // Emit sources first so the client can show them immediately
    yield { sources };

    let fullAnswer = '';
    for await (const token of streamLLM(SYSTEM_PROMPT, userPrompt, history)) {
      fullAnswer += token;
      yield { token };
    }

    this.sessions.appendMessages(sessionId, userText, fullAnswer);
    yield { done: true };
  }

  resetSession(sessionId: string): void {
    this.sessions.clearSession(sessionId);
  }
}

function buildPrompt(context: string, instruction: string, userText: string): string {
  return `CONTEXT FROM KNOWLEDGE BASE:\n${context}\n\nINSTRUCTION:\n${instruction}\n\nUSER SAID:\n${userText}`.trim();
}

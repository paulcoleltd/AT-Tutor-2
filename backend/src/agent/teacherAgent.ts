import { Brain, RetrievalResult } from '../brain/brain';
import { callLLM, streamLLM, streamLLMWithImage, LLMError, Message, ImageData } from '../models/llmRouter';
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
  'You are a highly adaptable AI assistant with access to a live knowledge base of documents and web pages.\n\n' +
  'ANSWER PRIORITY RULES — follow these in order:\n' +
  '1. SOURCE-FIRST: When KNOWLEDGE BASE CONTEXT is provided and contains relevant information, answer from it first. ' +
  'Clearly state which source you are drawing from (e.g. "Based on [filename]…").\n' +
  '2. TRANSPARENCY: If the knowledge base context is present but does NOT fully answer the question, say so explicitly: ' +
  '"The source [filename] does not contain this specific information." Then continue with general knowledge.\n' +
  '3. VERIFICATION: If a fact cannot be supported by the provided knowledge base, do not invent it. ' +
  'Instead, say that the knowledge base does not contain enough information and then answer from general knowledge only if appropriate.\n' +
  '4. ROLE ADAPTATION: If the user assigns a role or persona, adopt that style and voice while staying helpful, polite, and accurate. ' +
  'For example, if asked to act as a receptionist, be friendly, courteous, and concise. If asked to act as a subject-matter expert, be precise and clear. ' +
  'Begin your first response by confirming the assigned role and how you will help.\n' +
  '5. PROVENANCE: Whenever you answer from the knowledge base, cite the source by filename or URL. ' +
  'If you are answering from general knowledge, say that the current document set does not contain a direct answer.\n' +
  '6. RECENCY AWARENESS: If the answer from the knowledge base may be outdated (e.g. the page was fetched at a point in time), ' +
  'note this: "This information is from the loaded source and may not reflect the latest updates. ' +
  'Based on my general knowledge, the current situation is: …"\n' +
  '7. FOLLOW-UP: After answering, offer one quick next step such as a summary, quiz, comparison, or action plan if it fits the conversation.\n\n' +
  'You explain concepts with simple language, examples, and analogies when appropriate. ' +
  'Format responses in Markdown. Keep responses engaging and interactive.';

export class TeacherAgent {
  constructor(
    private readonly brain:    Brain,
    private readonly sessions: SessionStore,
  ) {}

  async ask(userText: string, mode: TeachMode = 'explain', sessionId: string, persona?: string): Promise<TeachResponse> {
    if (!userText?.trim()) throw new Error('TeacherAgent.ask: userText must not be empty.');

    const { chunks, sources } = await this.brain.retrieve(userText);
    const contextStr = chunks.length > 0
      ? chunks.join('\n\n---\n\n')
      : '(No documents uploaded yet. Answer from general knowledge.)';

    const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.explain;
    const userPrompt  = buildPrompt(contextStr, instruction, userText, persona);
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

  async *stream(userText: string, mode: TeachMode = 'explain', sessionId: string, imageData?: ImageData, focusSourceId?: string, persona?: string): AsyncGenerator<{ token?: string; sources?: string[]; done?: boolean }> {
    if (!userText?.trim()) throw new Error('TeacherAgent.stream: userText must not be empty.');

    const { chunks, sources, focusSourceHit }: RetrievalResult = await this.brain.retrieve(userText, undefined, focusSourceId);
    let contextStr: string;
    if (chunks.length === 0) {
      contextStr = '(No documents in knowledge base. Answer from general knowledge.)';
    } else if (focusSourceId && !focusSourceHit) {
      contextStr = `(The requested source was not found in the knowledge base. Showing best available context:)\n\n${chunks.join('\n\n---\n\n')}`;
    } else {
      contextStr = chunks.join('\n\n---\n\n');
    }

    const instruction = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.explain;
    const userPrompt  = buildPrompt(contextStr, instruction, userText, persona);
    const history     = this.sessions.getHistory(sessionId);

    // Emit sources first so the client can show them immediately
    yield { sources };

    let fullAnswer = '';
    const generator = imageData
      ? streamLLMWithImage(SYSTEM_PROMPT, userPrompt, history, imageData)
      : streamLLM(SYSTEM_PROMPT, userPrompt, history);
    for await (const token of generator) {
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

function buildPrompt(context: string, instruction: string, userText: string, persona?: string): string {
  const roleBlock = persona?.trim()
    ? `ASSIGNED ROLE:\n${persona.trim()}\n\n`
    : '';
  return `CONTEXT FROM KNOWLEDGE BASE:\n${context}\n\n${roleBlock}INSTRUCTION:\n${instruction}\n\nUSER SAID:\n${userText}`.trim();
}

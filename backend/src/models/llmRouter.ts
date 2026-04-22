import { CONFIG } from '../config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;
let _genAI: GoogleGenerativeAI | null = null;

function getOpenAI()    { if (!CONFIG.openaiApiKey) throw new Error('OPENAI_API_KEY not set.'); return _openai    ??= new OpenAI({ apiKey: CONFIG.openaiApiKey }); }
function getAnthropic() { if (!CONFIG.claudeApiKey) throw new Error('CLAUDE_API_KEY not set.'); return _anthropic ??= new Anthropic({ apiKey: CONFIG.claudeApiKey }); }
function getGenAI()     { if (!CONFIG.geminiApiKey) throw new Error('GEMINI_API_KEY not set.'); return _genAI     ??= new GoogleGenerativeAI(CONFIG.geminiApiKey); }

export type Role = 'user' | 'assistant' | 'system';
export interface Message { role: Role; content: string; }

export class LLMError extends Error {
  constructor(message: string, public readonly provider: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

// ── Non-streaming ─────────────────────────────────────────────────────────────
export async function callLLM(system: string, user: string, history: Message[]): Promise<string> {
  try {
    if (CONFIG.provider === 'openai')  return await callOpenAI(system, user, history);
    if (CONFIG.provider === 'claude')  return await callClaude(system, user, history);
    if (CONFIG.provider === 'gemini')  return await callGemini(system, user, history);
    throw new LLMError(`Unsupported provider: ${CONFIG.provider}`, CONFIG.provider);
  } catch (err) {
    if (err instanceof LLMError) throw err;
    throw new LLMError(`Unexpected error from ${CONFIG.provider}: ${(err as Error).message}`, CONFIG.provider, err);
  }
}

// ── Streaming — yields token chunks ──────────────────────────────────────────
export async function* streamLLM(
  system: string, user: string, history: Message[]
): AsyncGenerator<string, void, unknown> {
  if (CONFIG.provider === 'openai')  yield* streamOpenAI(system, user, history);
  else if (CONFIG.provider === 'claude') yield* streamClaude(system, user, history);
  else if (CONFIG.provider === 'gemini') yield* streamGemini(system, user, history);
  else throw new LLMError(`Unsupported provider: ${CONFIG.provider}`, CONFIG.provider);
}

// ── OpenAI ───────────────────────────────────────────────────────────────────
async function callOpenAI(system: string, user: string, history: Message[]): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: user },
  ];
  const res = await getOpenAI().chat.completions.create({ model: 'gpt-4o', messages, temperature: 0.7, max_tokens: 2048 });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new LLMError('Empty response from OpenAI', 'openai');
  return content;
}

async function* streamOpenAI(system: string, user: string, history: Message[]): AsyncGenerator<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: system },
    ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: user },
  ];
  const stream = await getOpenAI().chat.completions.create({ model: 'gpt-4o', messages, temperature: 0.7, max_tokens: 2048, stream: true });
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) yield token;
  }
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function callClaude(system: string, user: string, history: Message[]): Promise<string> {
  const messages = [
    ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: user },
  ];
  const res = await getAnthropic().messages.create({ model: 'claude-sonnet-4-6', system, messages, max_tokens: 2048, temperature: 0.7 });
  const block = res.content[0];
  if (!block || block.type !== 'text') throw new LLMError('Empty response from Claude', 'claude');
  return block.text;
}

async function* streamClaude(system: string, user: string, history: Message[]): AsyncGenerator<string> {
  const messages = [
    ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: user },
  ];
  const stream = await getAnthropic().messages.stream({ model: 'claude-sonnet-4-6', system, messages, max_tokens: 2048, temperature: 0.7 });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(system: string, user: string, history: Message[]): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-pro', systemInstruction: system });
  const chat  = model.startChat({
    history: history.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });
  const result = await chat.sendMessage(user);
  const text   = result.response.text();
  if (!text) throw new LLMError('Empty response from Gemini', 'gemini');
  return text;
}

async function* streamGemini(system: string, user: string, history: Message[]): AsyncGenerator<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-pro', systemInstruction: system });
  const chat  = model.startChat({
    history: history.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  });
  const result = await chat.sendMessageStream(user);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

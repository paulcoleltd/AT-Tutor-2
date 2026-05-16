import { CONFIG } from '../config';
import { getActiveProvider, LLMProvider } from '../runtimeConfig';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Optional session-scoped provider — when provided it overrides the global active
// provider for this single call only. Enables per-session provider preferences
// without race conditions from temporarily mutating global state.
export type ProviderOverride = LLMProvider | undefined;

let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;
let _genAI: GoogleGenerativeAI | null = null;

const PROVIDER_ORDER: LLMProvider[] = ['openai', 'claude', 'gemini'];

function getOpenAI()    { if (!CONFIG.openaiApiKey) throw new Error('OPENAI_API_KEY not set.'); return _openai    ??= new OpenAI({ apiKey: CONFIG.openaiApiKey }); }
function getAnthropic() { if (!CONFIG.claudeApiKey) throw new Error('CLAUDE_API_KEY not set.'); return _anthropic ??= new Anthropic({ apiKey: CONFIG.claudeApiKey }); }
function getGenAI()     { if (!CONFIG.geminiApiKey) throw new Error('GEMINI_API_KEY not set.'); return _genAI     ??= new GoogleGenerativeAI(CONFIG.geminiApiKey); }

export function getAvailableProviders(): LLMProvider[] {
  return PROVIDER_ORDER.filter(provider => {
    if (provider === 'openai')  return !!CONFIG.openaiApiKey;
    if (provider === 'claude')  return !!CONFIG.claudeApiKey;
    if (provider === 'gemini')  return !!CONFIG.geminiApiKey;
    return false;
  });
}

function getProviderFallbackOrder(override?: ProviderOverride): LLMProvider[] {
  const active = override ?? getActiveProvider();
  const available = getAvailableProviders();
  return [active, ...available.filter(p => p !== active)];
}

async function callProvider(provider: LLMProvider, system: string, user: string, history: Message[]): Promise<string> {
  if (provider === 'openai')  return await callOpenAI(system, user, history);
  if (provider === 'claude')  return await callClaude(system, user, history);
  if (provider === 'gemini')  return await callGemini(system, user, history);
  throw new LLMError(`Unsupported provider: ${provider}`, provider);
}

async function* streamProvider(provider: LLMProvider, system: string, user: string, history: Message[]): AsyncGenerator<string, void, unknown> {
  if (provider === 'openai')  yield* streamOpenAI(system, user, history);
  else if (provider === 'claude') yield* streamClaude(system, user, history);
  else if (provider === 'gemini') yield* streamGemini(system, user, history);
  else throw new LLMError(`Unsupported provider: ${provider}`, provider);
}

export type Role = 'user' | 'assistant' | 'system';
export interface Message { role: Role; content: string; }

export class LLMError extends Error {
  constructor(message: string, public readonly provider: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

// ── Non-streaming ─────────────────────────────────────────────────────────────
export async function callLLM(system: string, user: string, history: Message[], providerOverride?: ProviderOverride): Promise<string> {
  const providers = getProviderFallbackOrder(providerOverride);
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await callProvider(provider, system, user, history);
    } catch (err) {
      const providerErr = err instanceof LLMError ? err : new LLMError(`Unexpected error from ${provider}: ${(err as Error).message}`, provider, err);
      errors.push(`${provider}: ${providerErr.message}`);
      continue;
    }
  }

  throw new LLMError(`All configured providers failed: ${errors.join(' | ')}`, providerOverride ?? getActiveProvider());
}

// ── Concurrency limiter ───────────────────────────────────────────────────────
// Caps simultaneous in-flight LLM calls. Under heavy load, excess requests
// wait here rather than all hitting the API at once (which causes 60–120s
// queue build-up and cascading timeouts at 50+ concurrent users).
// Vercel Hobby: 8 (serverless, each fn handles 1 req — limits cold starts)
// Vercel Pro / Railway / Render: 12–20 (persistent server, more headroom)
// Clamp to [1, 50] — prevents DoS via 0/NaN and runaway cost via 999 (CWE-770)
const MAX_CONCURRENT_LLM = Math.max(1, Math.min(50, parseInt(process.env.MAX_CONCURRENT_LLM || '12', 10)));
// Max queued requests — beyond this, reject immediately with 503 (CWE-400)
const MAX_QUEUE_SIZE     = 100;
// Max wait time in queue before rejecting request
const QUEUE_TIMEOUT_MS   = 30_000;

let _activeLLM = 0;
const _waitQueue: Array<() => void> = [];

async function acquireLLMSlot(): Promise<void> {
  if (_activeLLM < MAX_CONCURRENT_LLM) { _activeLLM++; return; }
  if (_waitQueue.length >= MAX_QUEUE_SIZE) {
    throw new LLMError('Server is overloaded. Please try again shortly.', 'queue');
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const idx = _waitQueue.indexOf(resolve);
      if (idx !== -1) _waitQueue.splice(idx, 1);
      reject(new LLMError('Request timed out waiting for an LLM slot.', 'queue'));
    }, QUEUE_TIMEOUT_MS);
    _waitQueue.push(() => { clearTimeout(timeout); resolve(); });
  });
  _activeLLM++;
}
function releaseLLMSlot(): void {
  _activeLLM = Math.max(0, _activeLLM - 1);
  const next = _waitQueue.shift();
  if (next) next();
}

// ── Streaming — yields token chunks ──────────────────────────────────────────
export async function* streamLLM(
  system: string, user: string, history: Message[], providerOverride?: ProviderOverride
): AsyncGenerator<string, void, unknown> {
  await acquireLLMSlot();
  const providers = getProviderFallbackOrder(providerOverride);
  let lastError: Error | null = null;

  try {
   for (const provider of providers) {
    try {
      yield* streamProvider(provider, system, user, history);
      return;
    } catch (err) {
      const providerErr = err instanceof LLMError ? err : new LLMError(`Unexpected error from ${provider}: ${(err as Error).message}`, provider, err);
      lastError = providerErr;
      // Retry on next provider for: quota/rate limits, auth issues, empty responses,
      // or any upstream 5xx. Throw immediately only for client errors we can't recover from.
      const msg = providerErr.message.toLowerCase();
      const shouldFallback =
        msg.includes('empty response') ||
        msg.includes('api key') ||
        msg.includes('unsupported') ||
        msg.includes('server error') ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('rate limit') ||
        msg.includes('too many requests') ||
        msg.includes('overloaded') ||
        msg.includes('unavailable') ||
        msg.includes('timeout');
      if (shouldFallback) {
        console.warn(`[llm] ${provider} failed (${providerErr.message.slice(0, 80)}), trying next provider`);
        continue;
      }
      throw providerErr;
    }
   }
  } finally {
    releaseLLMSlot();
  }

  throw lastError instanceof LLMError
    ? lastError
    : new LLMError('All configured providers failed to stream a response.', providerOverride ?? getActiveProvider(), lastError);
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
  const res = await getAnthropic().messages.create({ model: CONFIG.claudeModel, system, messages, max_tokens: 2048, temperature: 0.7 });
  const block = res.content[0];
  if (!block || block.type !== 'text') throw new LLMError('Empty response from Claude', 'claude');
  return block.text;
}

async function* streamClaude(system: string, user: string, history: Message[]): AsyncGenerator<string> {
  const messages = [
    ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: user },
  ];
  const stream = await getAnthropic().messages.stream({ model: CONFIG.claudeModel, system, messages, max_tokens: 2048, temperature: 0.7 });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(system: string, user: string, history: Message[]): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: system });
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
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: system });
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

// ── Vision (image analysis) ───────────────────────────────────────────────────
export interface ImageData { base64: string; mimeType: string; }

export async function describeImageWithLLM(imageData: ImageData, prompt: string): Promise<string> {
  const provider = getActiveProvider();
  try {
    if (provider === 'claude' || provider === 'gemini') {
      // Use Claude for vision (reliable multimodal)
      if (CONFIG.claudeApiKey) {
        const ant = getAnthropic();
        const res = await ant.messages.create({
          model: CONFIG.claudeModel,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: imageData.mimeType as any, data: imageData.base64 } },
              { type: 'text', text: prompt },
            ],
          }],
        });
        const block = res.content[0];
        return block?.type === 'text' ? block.text : '';
      }
    }
    if (CONFIG.openaiApiKey) {
      const oai = getOpenAI();
      const res = await oai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
            { type: 'text', text: prompt },
          ],
        }],
      });
      return res.choices[0]?.message?.content ?? '';
    }
    throw new Error('No vision-capable LLM key configured.');
  } catch (err) {
    throw new LLMError(`Vision analysis failed: ${(err as Error).message}`, provider, err);
  }
}

export async function* streamLLMWithImage(
  system: string, user: string, history: Message[], imageData: ImageData, providerOverride?: ProviderOverride
): AsyncGenerator<string, void, unknown> {
  const provider = providerOverride ?? getActiveProvider();
  if (provider === 'claude') {
    const messages: Anthropic.MessageParam[] = [
      ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        role: 'user' as const,
        content: [
          { type: 'image' as const, source: { type: 'base64' as const, media_type: imageData.mimeType as any, data: imageData.base64 } },
          { type: 'text' as const, text: user },
        ],
      },
    ];
    const stream = await getAnthropic().messages.stream({ model: CONFIG.claudeModel, system, messages, max_tokens: 2048, temperature: 0.7 });
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') yield chunk.delta.text;
    }
  } else if (provider === 'openai') {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...history.filter(m => m.role !== 'system').map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${imageData.mimeType};base64,${imageData.base64}` } },
          { type: 'text', text: user },
        ],
      },
    ];
    const stream = await getOpenAI().chat.completions.create({ model: 'gpt-4o', messages, temperature: 0.7, max_tokens: 2048, stream: true });
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  } else {
    // Gemini: fall back to text-only with image described in prompt
    yield* streamGemini(system, `[User sent an image]\n\n${user}`, history);
  }
}

import { CONFIG } from '../config';
import { getActiveProvider } from '../runtimeConfig';
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
    if (getActiveProvider() === 'openai')  return await callOpenAI(system, user, history);
    if (getActiveProvider() === 'claude')  return await callClaude(system, user, history);
    if (getActiveProvider() === 'gemini')  return await callGemini(system, user, history);
    throw new LLMError(`Unsupported provider: ${getActiveProvider()}`, getActiveProvider());
  } catch (err) {
    if (err instanceof LLMError) throw err;
    throw new LLMError(`Unexpected error from ${getActiveProvider()}: ${(err as Error).message}`, getActiveProvider(), err);
  }
}

// ── Streaming — yields token chunks ──────────────────────────────────────────
export async function* streamLLM(
  system: string, user: string, history: Message[]
): AsyncGenerator<string, void, unknown> {
  if (getActiveProvider() === 'openai')  yield* streamOpenAI(system, user, history);
  else if (getActiveProvider() === 'claude') yield* streamClaude(system, user, history);
  else if (getActiveProvider() === 'gemini') yield* streamGemini(system, user, history);
  else throw new LLMError(`Unsupported provider: ${getActiveProvider()}`, getActiveProvider());
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
          model: 'claude-sonnet-4-6',
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
  system: string, user: string, history: Message[], imageData: ImageData
): AsyncGenerator<string, void, unknown> {
  const provider = getActiveProvider();
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
    const stream = await getAnthropic().messages.stream({ model: 'claude-sonnet-4-6', system, messages, max_tokens: 2048, temperature: 0.7 });
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

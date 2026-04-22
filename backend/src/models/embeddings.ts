import { CONFIG } from '../config';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!CONFIG.openaiApiKey) throw new Error('OPENAI_API_KEY is required for embeddings.');
  if (!_openai) _openai = new OpenAI({ apiKey: CONFIG.openaiApiKey });
  return _openai;
}

export async function embedText(text: string): Promise<number[]> {
  if (!text?.trim()) throw new Error('embedText: input must not be empty.');
  const truncated = text.slice(0, 32000);
  const response  = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
  });
  const embedding = response.data[0]?.embedding;
  if (!embedding?.length) throw new Error('embedText: received empty embedding from OpenAI.');
  return embedding;
}

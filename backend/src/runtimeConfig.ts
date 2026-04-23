import { CONFIG } from './config';

export type LLMProvider = 'claude' | 'gemini' | 'openai';

// Mutable runtime state — starts from .env, can be changed via API
let _provider: LLMProvider = CONFIG.provider as LLMProvider;

export function getActiveProvider(): LLMProvider { return _provider; }
export function setActiveProvider(p: LLMProvider): void { _provider = p; }

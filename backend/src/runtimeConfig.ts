import { CONFIG } from './config';

export type LLMProvider = 'claude' | 'gemini' | 'openai';

// ── Global default provider (falls back from .env) ────────────────────────────
let _provider: LLMProvider = CONFIG.provider as LLMProvider;

export function getActiveProvider(): LLMProvider { return _provider; }
export function setActiveProvider(p: LLMProvider): void { _provider = p; }

// ── Per-session provider overrides ────────────────────────────────────────────
// Isolates provider preference per session so one user switching to GPT-4o does
// not affect all other active sessions (B6 / F-A5 remediation).
// Entries expire after SESSION_PROVIDER_TTL_MS to avoid unbounded map growth.
const SESSION_PROVIDER_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface SessionProviderEntry {
  provider:  LLMProvider;
  expiresAt: number;
}

const _sessionProviders = new Map<string, SessionProviderEntry>();

export function getSessionProvider(sessionId: string): LLMProvider {
  const entry = _sessionProviders.get(sessionId);
  if (!entry) return _provider;
  if (Date.now() > entry.expiresAt) {
    _sessionProviders.delete(sessionId);
    return _provider;
  }
  return entry.provider;
}

export function setSessionProvider(sessionId: string, provider: LLMProvider): void {
  _sessionProviders.set(sessionId, { provider, expiresAt: Date.now() + SESSION_PROVIDER_TTL_MS });
}

export function clearSessionProvider(sessionId: string): void {
  _sessionProviders.delete(sessionId);
}

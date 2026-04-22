import dotenv from 'dotenv';
dotenv.config();

type LLMProvider = 'openai' | 'claude' | 'gemini';
const VALID_PROVIDERS: LLMProvider[] = ['openai', 'claude', 'gemini'];

function requireProvider(val: string | undefined): LLMProvider {
  const p = (val || 'claude').toLowerCase();
  if (!VALID_PROVIDERS.includes(p as LLMProvider)) {
    console.warn(`[config] Unknown LLM_PROVIDER "${p}", defaulting to "claude".`);
    return 'claude';
  }
  return p as LLMProvider;
}

export const CONFIG = {
  port:               parseInt(process.env.PORT || '4000', 10),
  provider:           requireProvider(process.env.LLM_PROVIDER),
  openaiApiKey:       process.env.OPENAI_API_KEY  || '',
  claudeApiKey:       process.env.CLAUDE_API_KEY  || '',
  geminiApiKey:       process.env.GEMINI_API_KEY  || '',
  maxFileSizeMb:      parseInt(process.env.MAX_FILE_SIZE_MB      || '20',    10),
  rateLimitWindowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '60000', 10),
  rateLimitMax:       parseInt(process.env.RATE_LIMIT_MAX        || '60',    10),
  retrievalTopK:      parseInt(process.env.RETRIEVAL_TOP_K       || '5',     10),
} as const;

export function validateConfig(): void {
  const warnings: string[] = [];
  if (!CONFIG.openaiApiKey)
    warnings.push('OPENAI_API_KEY is missing — embeddings will not work.');
  if (CONFIG.provider === 'claude' && !CONFIG.claudeApiKey)
    warnings.push('CLAUDE_API_KEY is missing but LLM_PROVIDER=claude.');
  if (CONFIG.provider === 'gemini' && !CONFIG.geminiApiKey)
    warnings.push('GEMINI_API_KEY is missing but LLM_PROVIDER=gemini.');
  if (CONFIG.provider === 'openai' && !CONFIG.openaiApiKey)
    warnings.push('OPENAI_API_KEY is missing but LLM_PROVIDER=openai.');
  warnings.forEach(w => console.warn(`[config] WARNING: ${w}`));
}

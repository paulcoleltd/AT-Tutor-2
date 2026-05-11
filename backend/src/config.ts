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
  // Accept both ANTHROPIC_API_KEY (SDK standard) and CLAUDE_API_KEY (legacy)
  claudeApiKey:       process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '',
  geminiApiKey:       process.env.GEMINI_API_KEY  || '',
  // Model override via CLAUDE_MODEL env var.
  claudeModel:        process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  maxFileSizeMb:      parseInt(process.env.MAX_FILE_SIZE_MB      || '20',    10),
  rateLimitWindowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '60000', 10),
  rateLimitMax:       parseInt(process.env.RATE_LIMIT_MAX        || '60',    10),
  retrievalTopK:      parseInt(process.env.RETRIEVAL_TOP_K       || '5',     10),

  // Supabase — optional. When set, enables persistent cross-device memory.
  supabaseUrl:        process.env.SUPABASE_URL                 || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY    || '',
} as const;

export function validateConfig(): void {
  const noKeys = !CONFIG.claudeApiKey && !CONFIG.openaiApiKey && !CONFIG.geminiApiKey;
  if (noKeys) {
    console.error(
      '\n[config] *** NO API KEYS FOUND ***\n' +
      '  Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY\n' +
      '  (CLAUDE_API_KEY is also accepted as an alias for ANTHROPIC_API_KEY)\n' +
      '  Chat requests will fail until a key is added.\n'
    );
  } else {
    if (CONFIG.provider === 'claude' && !CONFIG.claudeApiKey)
      console.warn('[config] WARNING: ANTHROPIC_API_KEY (or CLAUDE_API_KEY) is missing but LLM_PROVIDER=claude.');
    if (CONFIG.provider === 'gemini' && !CONFIG.geminiApiKey)
      console.warn('[config] WARNING: GEMINI_API_KEY is missing but LLM_PROVIDER=gemini.');
    if (CONFIG.provider === 'openai' && !CONFIG.openaiApiKey)
      console.warn('[config] WARNING: OPENAI_API_KEY is missing but LLM_PROVIDER=openai.');
  }
  if (!CONFIG.openaiApiKey)
    console.warn('[config] WARNING: OPENAI_API_KEY is missing — vector embeddings will use random fallback.');
}

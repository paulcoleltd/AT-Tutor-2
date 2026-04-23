import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getActiveProvider, setActiveProvider, LLMProvider } from '../runtimeConfig';
import { CONFIG } from '../config';

const PROVIDERS: LLMProvider[] = ['claude', 'gemini', 'openai'];

const BodySchema = z.object({
  provider: z.enum(['claude', 'gemini', 'openai']),
});

export function createConfigRouter(): Router {
  const router = Router();

  router.get('/provider', (_req: Request, res: Response) => {
    res.json({
      active:    getActiveProvider(),
      available: PROVIDERS.filter(p => {
        if (p === 'claude')  return !!CONFIG.claudeApiKey;
        if (p === 'gemini')  return !!CONFIG.geminiApiKey;
        if (p === 'openai')  return !!CONFIG.openaiApiKey;
        return false;
      }),
    });
  });

  router.post('/provider', (req: Request, res: Response) => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid provider. Use "claude", "gemini", or "openai".' });
      return;
    }
    const { provider } = parsed.data;
    const keyMap: Record<LLMProvider, string> = {
      claude: CONFIG.claudeApiKey,
      gemini: CONFIG.geminiApiKey,
      openai: CONFIG.openaiApiKey,
    };
    if (!keyMap[provider]) {
      res.status(400).json({ error: `No API key configured for "${provider}". Add it to backend/.env.` });
      return;
    }
    setActiveProvider(provider);
    console.log(`[config] Provider switched to: ${provider}`);
    res.json({ success: true, active: provider });
  });

  return router;
}

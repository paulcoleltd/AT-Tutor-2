import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getActiveProvider, setActiveProvider, getSessionProvider, setSessionProvider, LLMProvider } from '../runtimeConfig';
import { CONFIG } from '../config';

const PROVIDERS: LLMProvider[] = ['claude', 'gemini', 'openai'];

const BodySchema = z.object({
  provider:  z.enum(['claude', 'gemini', 'openai']),
  // Optional sessionId — when provided the switch is scoped to that session only.
  // When absent the global default is changed (affects new sessions; existing
  // sessions with a stored preference keep their preference until TTL).
  sessionId: z.string().uuid().optional(),
});

export function createConfigRouter(): Router {
  const router = Router();

  router.get('/provider', (req: Request, res: Response) => {
    // If a sessionId is supplied return the effective provider for that session.
    const sessionId = req.query.sessionId as string | undefined;
    const active = sessionId ? getSessionProvider(sessionId) : getActiveProvider();
    res.json({
      active,
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
    const { provider, sessionId } = parsed.data;
    const keyMap: Record<LLMProvider, string> = {
      claude: CONFIG.claudeApiKey,
      gemini: CONFIG.geminiApiKey,
      openai: CONFIG.openaiApiKey,
    };
    if (!keyMap[provider]) {
      res.status(400).json({ error: `No API key configured for "${provider}". Add it to backend/.env.` });
      return;
    }
    if (sessionId) {
      // Per-session switch — does NOT affect other users (B6 remediation)
      setSessionProvider(sessionId, provider);
      console.log(`[config] Session ${sessionId.slice(0, 8)}… provider → ${provider}`);
    } else {
      // Legacy global switch — kept for backward compatibility with clients
      // that don't send a sessionId. New deployments should prefer per-session.
      setActiveProvider(provider);
      console.log(`[config] Global provider → ${provider}`);
    }
    res.json({ success: true, active: provider });
  });

  return router;
}

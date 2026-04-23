import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TeacherAgent, TeachMode } from '../agent/teacherAgent';
import { LLMError } from '../models/llmRouter';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

const ChatBodySchema = z.object({
  message:        z.string().min(1).max(4000),
  mode:           z.enum(['explain', 'quiz', 'chat', 'summarize', 'flashcard']).optional().default('explain'),
  sessionId:      z.string().uuid().optional(),
  stream:         z.boolean().optional().default(false),
  // Base64 limit: ~1 MB binary → ~1.37 MB base64; express.json limit is 1 MB so this is a belt-and-suspenders cap
  imageBase64:    z.string().max(1_400_000).optional(),
  imageMimeType:  z.enum(ALLOWED_IMAGE_MIME).optional(),
  focusSourceId:  z.string().uuid().optional(),
});

const ANONYMOUS_SESSION = 'anonymous';

export function createChatRouter(agent: TeacherAgent): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const parsed = ChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request.', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { message, mode, sessionId = ANONYMOUS_SESSION, stream, imageBase64, imageMimeType, focusSourceId } = parsed.data;
    const imageData = imageBase64 && imageMimeType ? { base64: imageBase64, mimeType: imageMimeType } : undefined;

    // ── Streaming path (SSE) ──────────────────────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      try {
        for await (const event of agent.stream(message, mode as TeachMode, sessionId, imageData, focusSourceId)) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err) {
        const errMsg = err instanceof LLMError
          ? `LLM error (${err.provider}): ${err.message}`
          : `Unexpected error: ${(err as Error).message}`;
        res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      } finally {
        res.end();
      }
      return;
    }

    // ── Non-streaming path ────────────────────────────────────────────────────
    try {
      const result = await agent.ask(message, mode as TeachMode, sessionId);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof LLMError) {
        console.error(`[chat] LLM error (${err.provider}):`, err.message);
        res.status(502).json({ error: `AI provider (${err.provider}) error. Check your API key.` });
        return;
      }
      console.error('[chat] Unexpected error:', err);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  });

  // Reset a specific session
  router.delete('/history/:sessionId', (req: Request, res: Response): void => {
    agent.resetSession(req.params.sessionId ?? ANONYMOUS_SESSION);
    res.status(200).json({ success: true });
  });

  // Legacy: reset anonymous session
  router.delete('/history', (_req: Request, res: Response): void => {
    agent.resetSession(ANONYMOUS_SESSION);
    res.status(200).json({ success: true });
  });

  return router;
}

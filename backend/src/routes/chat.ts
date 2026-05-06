import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TeacherAgent, TeachMode } from '../agent/teacherAgent';
import { LLMError } from '../models/llmRouter';

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

const ChatBodySchema = z.object({
  message:        z.string().min(1).max(4000),
  mode:           z.enum(['explain', 'quiz', 'chat', 'summarize', 'flashcard']).optional().default('explain'),
  persona:        z.string().trim().max(80).regex(/^[^\r\n]*$/, 'Persona cannot contain line breaks.').optional(),
  sessionId:      z.string().uuid().optional(),
  stream:         z.boolean().optional().default(false),
  // Base64 limit: ~1 MB binary → ~1.37 MB base64; express.json limit is 1 MB so this is a belt-and-suspenders cap
  imageBase64:    z.string().max(1_400_000).optional(),
  imageMimeType:  z.enum(ALLOWED_IMAGE_MIME).optional(),
  focusSourceId:  z.string().uuid().optional(),
  // User profile + session memory injected by the client — prepended to system context
  userContext:    z.string().max(2000).optional(),
}).superRefine((data, ctx) => {
  if ((data.imageBase64 && !data.imageMimeType) || (!data.imageBase64 && data.imageMimeType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'imageBase64 and imageMimeType must be provided together.',
    });
  }
});

const ANONYMOUS_SESSION = 'anonymous';

// ── Abuse-pattern detection ────────────────────────────────────────────────────
// Flags messages that match known prompt-injection or abuse patterns.
// Returns the detected pattern label or null if the message looks benign.
const ABUSE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'prompt_injection',    pattern: /ignore\s+(previous|all|your)\s+instructions?|disregard\s+(the\s+)?above|system\s+prompt|you\s+are\s+now\s+(?:an?\s+)?(?:DAN|evil|unrestricted)/i },
  { label: 'jailbreak',           pattern: /act\s+as\s+(?:if\s+you\s+(?:are|were)\s+|an?\s+)?(?:DAN|evil|unfiltered|uncensored|GPT-?4?)\b|developer\s+mode|jailbreak/i },
  { label: 'credential_harvest',  pattern: /(?:api\s+key|secret|password|token)\s*(?:is|=|:)\s*[A-Za-z0-9+/]{16,}/i },
  { label: 'exfiltration_attempt',pattern: /repeat\s+(the\s+)?(?:system\s+)?prompt|print\s+your\s+instructions|reveal\s+your\s+(?:system\s+)?prompt|what\s+(?:are|were)\s+your\s+instructions/i },
  { label: 'high_volume_detect',  pattern: /.{3500,}/ }, // suspiciously long single message
];

function detectAbuse(message: string): string | null {
  for (const { label, pattern } of ABUSE_PATTERNS) {
    if (pattern.test(message)) return label;
  }
  return null;
}

// Per-session request rate tracker (in-memory, resets on restart)
const _sessionRequests = new Map<string, { count: number; windowStart: number }>();
const SESSION_RATE_LIMIT = 30;    // max messages per window
const SESSION_WINDOW_MS  = 60_000; // 1-minute window

function checkSessionRate(sessionId: string): boolean {
  const now  = Date.now();
  const rec  = _sessionRequests.get(sessionId) ?? { count: 0, windowStart: now };
  if (now - rec.windowStart > SESSION_WINDOW_MS) {
    rec.count = 1; rec.windowStart = now;
  } else {
    rec.count += 1;
  }
  _sessionRequests.set(sessionId, rec);
  return rec.count <= SESSION_RATE_LIMIT;
}

export function createChatRouter(agent: TeacherAgent): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const parsed = ChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request.', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { message, mode, persona, sessionId = ANONYMOUS_SESSION, stream, imageBase64, imageMimeType, focusSourceId, userContext } = parsed.data;
    const imageData = imageBase64 && imageMimeType ? { base64: imageBase64, mimeType: imageMimeType } : undefined;
    const assignedPersona = persona?.trim() || 'AI Tutor';

    // ── Audit: session rate limiting & abuse detection ────────────────────────
    if (!checkSessionRate(sessionId)) {
      console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'audit:rate_exceeded', sessionId }));
      res.status(429).json({ error: 'Too many messages in this session. Please wait a moment.' });
      return;
    }

    const abuseLabel = detectAbuse(message);
    if (abuseLabel) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        event: 'audit:abuse_detected',
        label: abuseLabel,
        sessionId,
        messageLen: message.length,
        preview: message.slice(0, 80),
      }));
      // Do NOT block — the hardened system prompt handles it. Just log.
    }

    // ── Streaming path (SSE) ──────────────────────────────────────────────────
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      try {
        for await (const event of agent.stream(message, mode as TeachMode, sessionId, imageData, focusSourceId, assignedPersona, userContext)) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err) {
        if (err instanceof LLMError) console.error(`[chat] LLM stream error (${err.provider}):`, err.message);
        else console.error('[chat] Unexpected stream error:', err);
        const errMsg = err instanceof LLMError
          ? 'AI service unavailable. Please try again later.'
          : 'An unexpected error occurred.';
        res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      } finally {
        res.end();
      }
      return;
    }

    // ── Non-streaming path ────────────────────────────────────────────────────
    try {
      const result = await agent.ask(message, mode as TeachMode, sessionId, assignedPersona, userContext);
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof LLMError) {
        console.error(`[chat] LLM error (${err.provider}):`, err.message);
        res.status(502).json({ error: 'AI service unavailable. Please try again later.' });
        return;
      }
      console.error('[chat] Unexpected error:', err);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  });

  // Reset a specific session
  router.delete('/history/:sessionId', (req: Request, res: Response): void => {
    const { sessionId } = req.params;
    const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionId || (sessionId !== ANONYMOUS_SESSION && !VALID_UUID.test(sessionId))) {
      res.status(400).json({ error: 'Invalid sessionId.' });
      return;
    }
    agent.resetSession(sessionId);
    res.status(200).json({ success: true });
  });

  // Legacy: reset anonymous session
  router.delete('/history', (_req: Request, res: Response): void => {
    agent.resetSession(ANONYMOUS_SESSION);
    res.status(200).json({ success: true });
  });

  return router;
}

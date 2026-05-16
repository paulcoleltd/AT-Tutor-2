import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CONFIG } from '../config';

// Emoji → natural speech word map (semantic meaning, not Unicode name)
const EMOJI_SPEECH: Record<string, string> = {
  '👋': 'hello', '🤝': 'great', '👏': 'well done', '👍': 'great', '👎': 'not quite',
  '🙌': 'excellent', '😊': '', '😄': '', '🤔': 'hmm', '🥳': 'congrats',
  '🎓': '', '📚': '', '📖': '', '📝': '', '💡': 'tip', '🔑': 'key point',
  '🎯': 'goal', '🏆': 'achievement', '⭐': '', '🌟': '', '✨': '',
  '✅': 'correct', '❌': 'incorrect', '⚠️': 'warning', '❓': '',
  '✔️': 'correct', '❎': 'incorrect', '🟢': 'pass', '🔴': 'fail',
  '🚀': '', '💪': 'great effort', '🔥': '', '🎉': 'congrats',
  '🏁': 'done', '🔍': '', '📊': '', '📈': '', '📉': '',
  '📄': '', '📃': '', '⏱️': '', '⏰': '',
};
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1FFFF}\u{200D}\u{20E3}]+/gu;

function prepareForSpeechBackend(text: string): string {
  let s = text;
  for (const [emoji, word] of Object.entries(EMOJI_SPEECH)) {
    if (s.includes(emoji)) s = s.split(emoji).join(word ? ` ${word} ` : ' ');
  }
  return s
    .replace(EMOJI_RE, ' ')
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*>]\s/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

const TtsBodySchema = z.object({
  text:      z.string().min(1).max(1200), // reduced from 4096 — limits cost abuse (CWE-770)
  voice:     z.enum(TTS_VOICES).optional().default('nova'),
  sessionId: z.string().max(128).optional(),
});

// CWE-770: Per-session TTS rate limiter — prevents API cost abuse (OpenAI charges per char).
// 10 requests/min per session is generous for normal use but blocks bulk abuse.
const _ttsRequests = new Map<string, { count: number; windowStart: number }>();
const TTS_RATE_LIMIT  = 10;
const TTS_WINDOW_MS   = 60_000;

function checkTtsRate(key: string): boolean {
  const now = Date.now();
  const rec = _ttsRequests.get(key) ?? { count: 0, windowStart: now };
  if (now - rec.windowStart > TTS_WINDOW_MS) { rec.count = 1; rec.windowStart = now; }
  else { rec.count += 1; }
  _ttsRequests.set(key, rec);
  return rec.count <= TTS_RATE_LIMIT;
}

export function createTtsRouter(): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    if (!CONFIG.openaiApiKey) {
      res.status(503).json({ error: 'OpenAI API key not configured — TTS unavailable.' });
      return;
    }

    const parsed = TtsBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request.', details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { text, voice, sessionId } = parsed.data;

    // Rate-limit by session ID when provided, fall back to IP address
    const rateLimitKey = sessionId ?? (req.ip ?? 'unknown');
    if (!checkTtsRate(rateLimitKey)) {
      res.status(429).json({ error: 'Too many TTS requests. Please wait a moment.' });
      return;
    }
    // Convert emoji to natural speech words, then strip markdown
    const clean = prepareForSpeechBackend(text);

    // Abort upstream fetch if client disconnects — avoids wasting OpenAI billing
    const abort = new AbortController();
    req.on('close', () => abort.abort());

    try {
      const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
          'Content-Type':  'application/json',
        },
        body:   JSON.stringify({ model: 'tts-1-hd', input: clean, voice, response_format: 'mp3', speed: 1.0 }),
        signal: abort.signal,
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        console.error('[tts] OpenAI error:', err);
        res.status(502).json({ error: 'TTS provider error. Check your OpenAI API key.' });
        return;
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');

      const reader = upstream.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (res.writableEnded) break; // client disconnected mid-stream
        res.write(Buffer.from(value));
      }
      res.end();
    } catch (err: any) {
      if (err.name === 'AbortError') return; // client disconnected — not an error
      console.error('[tts] Unexpected error:', err);
      res.status(500).json({ error: 'Unexpected TTS error.' });
    }
  });

  return router;
}

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CONFIG } from '../config';

const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

const TtsBodySchema = z.object({
  text:  z.string().min(1).max(4096),
  voice: z.enum(TTS_VOICES).optional().default('nova'),
});

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

    const { text, voice } = parsed.data;
    // Strip markdown so it sounds natural when spoken
    const clean = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[-*>]\s/gm, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();

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

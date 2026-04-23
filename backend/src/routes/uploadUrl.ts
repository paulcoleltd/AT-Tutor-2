import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { ingestDocument } from '../brain/ingest';
import { VectorStore } from '../brain/vectorStore';

const BodySchema = z.object({
  url: z.string().url(),
});

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function createUploadUrlRouter(store: VectorStore): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response): Promise<void> => {
    const parsed = BodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request. Provide a valid URL.' });
      return;
    }

    const { url } = parsed.data;

    // Block private/internal networks
    try {
      const { hostname } = new URL(url);
      if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname)) {
        res.status(400).json({ error: 'Private/internal URLs are not allowed.' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Malformed URL.' });
      return;
    }

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url, {
        headers: { 'User-Agent': 'AI-Tutor-Agent/2.0 (document ingestion)' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err: any) {
      res.status(502).json({ error: `Failed to fetch URL: ${err.message}` });
      return;
    }

    if (!upstream.ok) {
      res.status(502).json({ error: `URL returned HTTP ${upstream.status}.` });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    const id          = uuidv4();
    const filename    = new URL(url).hostname + new URL(url).pathname.replace(/\//g, '_').slice(0, 60);
    let content       = '';
    let type          = '';

    try {
      if (contentType.includes('pdf')) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        const data = await pdfParse(buf);
        content = data.text;
        type    = 'pdf';
      } else {
        const text = await upstream.text();
        content = contentType.includes('html') ? stripHtml(text) : text;
        type    = 'webpage';
      }

      if (!content.trim()) {
        res.status(422).json({ error: 'The URL returned empty or unreadable content.' });
        return;
      }

      const { chunksAdded } = await ingestDocument({ id, filename, content, type, store });

      res.status(200).json({
        success:     true,
        message:     `Ingested "${filename}" (${chunksAdded} chunks added).`,
        sourceId:    id,
        chunksAdded,
        filename,
        type,
        url,
      });
    } catch (err: any) {
      console.error('[upload-url] Error:', err);
      res.status(500).json({ error: err.message ?? 'Unexpected error.' });
    }
  });

  return router;
}

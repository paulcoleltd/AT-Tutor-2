import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { PDFParse } from 'pdf-parse';
import { ingestDocument } from '../brain/ingest';
import { VectorStore } from '../brain/vectorStore';

const MAX_FETCH_BYTES = 20 * 1024 * 1024; // 20 MB cap on remote fetch

const BodySchema = z.object({
  url: z.string().url().max(2048).refine(u => /^https?:\/\//i.test(u), {
    message: 'Only http:// and https:// URLs are allowed.',
  }),
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

    // Block private/internal/cloud-metadata networks (SSRF prevention)
    try {
      const parsed = new URL(url);

      // Only http and https — belt-and-suspenders after Zod refine
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        res.status(400).json({ error: 'Only http:// and https:// URLs are allowed.' });
        return;
      }

      const { hostname } = parsed;

      // Block localhost variants, private RFC-1918 ranges, link-local, cloud metadata
      const BLOCKED = [
        /^localhost$/i,
        /^0\.0\.0\.0$/,
        /^127\./,                                    // 127.0.0.0/8 loopback
        /^10\./,                                     // 10.0.0.0/8 private
        /^192\.168\./,                               // 192.168.0.0/16 private
        /^172\.(1[6-9]|2\d|3[01])\./,               // 172.16-31.x.x private
        /^169\.254\./,                               // 169.254.0.0/16 link-local / cloud metadata
        /^metadata\.google\.internal$/i,             // GCP metadata
        /^\[/,                                       // any IPv6 literal (e.g. [::1], [::ffff:127.0.0.1])
        /^fd[0-9a-f]{2}:/i,                         // IPv6 ULA (fc00::/7)
        /^fe80:/i,                                   // IPv6 link-local
      ];

      if (BLOCKED.some(r => r.test(hostname))) {
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
        redirect: 'error',
      });
    } catch (err: any) {
      res.status(502).json({ error: `Failed to fetch URL: ${err.message}` });
      return;
    }

    if (!upstream.ok) {
      res.status(502).json({ error: `URL returned HTTP ${upstream.status}.` });
      return;
    }

    // Enforce size cap — check Content-Length header before buffering
    const contentLength = parseInt(upstream.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_FETCH_BYTES) {
      res.status(413).json({ error: 'Remote resource exceeds the 20 MB size limit.' });
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    const id          = uuidv4();
    // Sanitise filename — strip path separators and special chars
    const safePath = new URL(url).pathname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
    const filename  = new URL(url).hostname + safePath;
    let content     = '';
    let type        = '';

    try {
      if (contentType.includes('pdf')) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        // Guard against content-length being absent or wrong
        if (buf.byteLength > MAX_FETCH_BYTES) {
          res.status(413).json({ error: 'Remote resource exceeds the 20 MB size limit.' });
          return;
        }
        const data = await new PDFParse({ data: buf }).getText();
        content = data.text;
        type    = 'pdf';
      } else {
        const text = await upstream.text();
        // Guard text size too
        if (Buffer.byteLength(text) > MAX_FETCH_BYTES) {
          res.status(413).json({ error: 'Remote resource exceeds the 20 MB size limit.' });
          return;
        }
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
        // Note: URL intentionally not echoed back (prevents credential reflection — LOW-09)
      });
    } catch (err: any) {
      console.error('[upload-url] Error:', err);
      // Generic message to client — internal detail logged server-side only
      res.status(500).json({ error: 'Failed to process the URL content. Please try another URL.' });
    }
  });

  return router;
}

/**
 * /api/search — lightweight web search via DuckDuckGo Instant Answer API.
 *
 * Returns the top abstract + related topics so the AI can answer questions
 * about current events or topics not in the knowledge base.
 *
 * No API key required. Respects DuckDuckGo's no-tracking promise.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

const SearchSchema = z.object({
  q: z.string().min(1).max(400).trim(),
});

export function createSearchRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    const parsed = SearchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid query parameter "q".' });
      return;
    }

    const { q } = parsed.data;

    try {
      // DuckDuckGo Instant Answer API (free, no key, no cookies)
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&no_redirect=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'AI-Tutor-Agent/2.1 (educational tool)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!ddgRes.ok) {
        throw new Error(`DuckDuckGo returned ${ddgRes.status}`);
      }

      const data = await ddgRes.json() as {
        Abstract?:       string;
        AbstractText?:   string;
        AbstractURL?:    string;
        AbstractSource?: string;
        Answer?:         string;
        RelatedTopics?:  Array<{ Text?: string; FirstURL?: string }>;
        Infobox?:        { content?: Array<{ label?: string; value?: string }> };
      };

      // Build a structured result
      const results: Array<{ title: string; snippet: string; url?: string }> = [];

      // Instant answer (e.g. calculator, conversions)
      if (data.Answer) {
        results.push({ title: 'Instant Answer', snippet: data.Answer });
      }

      // Main abstract (Wikipedia-style)
      if (data.AbstractText) {
        results.push({
          title:   data.AbstractSource ? `From ${data.AbstractSource}` : 'Overview',
          snippet: data.AbstractText,
          url:     data.AbstractURL,
        });
      }

      // Related topics (up to 5)
      const related = (data.RelatedTopics ?? [])
        .filter(t => t.Text && t.FirstURL)
        .slice(0, 5);
      for (const t of related) {
        results.push({ title: t.FirstURL ?? '', snippet: t.Text ?? '', url: t.FirstURL });
      }

      // Infobox key facts (up to 4)
      const infoItems = (data.Infobox?.content ?? [])
        .filter(i => i.label && i.value)
        .slice(0, 4);
      for (const item of infoItems) {
        results.push({ title: item.label ?? '', snippet: item.value ?? '' });
      }

      if (results.length === 0) {
        // Fallback: tell the AI nothing was found — it should say so
        res.json({
          query: q,
          results: [],
          summary: `No instant results found for "${q}". The AI will answer from general knowledge.`,
        });
        return;
      }

      // Build a plain-text summary the AI can use as context
      const summary = results
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}${r.url ? `\nSource: ${r.url}` : ''}`)
        .join('\n\n');

      // CWE-532: truncate query to avoid PII in logs — full query stays server-side only
      const queryPreview = q.length > 30 ? q.slice(0, 30) + '…' : q;
      console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'search', queryPreview, resultCount: results.length }));

      res.json({ query: q, results, summary });
    } catch (err) {
      console.error('[search] Error:', err);
      res.status(502).json({ error: 'Web search unavailable. Please try again.' });
    }
  });

  return router;
}

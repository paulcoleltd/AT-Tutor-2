/**
 * Integration tests for the AI Tutor backend API.
 *
 * External LLM / embedding calls are fully mocked so tests run without real
 * API keys and without network access.  The express app is created fresh for
 * every test suite via the exported `createApp()` factory so each describe
 * block gets an isolated instance.
 */

import request from 'supertest';

// ─── Environment setup (must come before any app imports) ─────────────────────
beforeAll(() => {
  process.env.OPENAI_API_KEY  = 'test-openai-key';
  process.env.CLAUDE_API_KEY  = 'test-claude-key';
  process.env.GEMINI_API_KEY  = 'test-gemini-key';
  process.env.LLM_PROVIDER    = 'openai';
  process.env.NODE_ENV        = 'test';
  // Speed up tests — minimal rate-limit window
  process.env.RATE_LIMIT_WINDOW_MS = '1000';
  process.env.RATE_LIMIT_MAX       = '1000';
});

// ─── Mock: embeddings ─────────────────────────────────────────────────────────
jest.mock('../models/embeddings', () => ({
  embedText: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

// ─── Mock: LLM router (callLLM, streamLLM, describeImageWithLLM, etc.) ────────
jest.mock('../models/llmRouter', () => {
  const original = jest.requireActual('../models/llmRouter');
  return {
    ...original,
    callLLM: jest.fn().mockResolvedValue('Mocked LLM answer'),
    streamLLM: jest.fn().mockImplementation(async function* () {
      yield 'Mocked ';
      yield 'stream ';
      yield 'token';
    }),
    streamLLMWithImage: jest.fn().mockImplementation(async function* () {
      yield 'Mocked image stream token';
    }),
    describeImageWithLLM: jest.fn().mockResolvedValue('A mocked image description.'),
    getAvailableProviders: jest.fn().mockReturnValue(['openai', 'claude', 'gemini']),
  };
});

// ─── Mock: ingestDocument (avoid real embedding during upload tests) ───────────
jest.mock('../brain/ingest', () => ({
  ingestDocument: jest.fn().mockResolvedValue({ chunksAdded: 3 }),
}));

// ─── Mock: pdf-parse (upload tests with PDF buffers) ──────────────────────────
jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({ text: 'Mock PDF text content for testing.' }),
);

// ─── Lazy app import (after env + mocks are registered) ───────────────────────
import { createApp } from '../app';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildApp() {
  const { app } = createApp();
  return app;
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

// =============================================================================
// 1. GET /api/health
// =============================================================================
describe('GET /api/health', () => {
  const app = buildApp();

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('includes provider, knowledgeBase, sessions, and uptime fields', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toHaveProperty('provider');
    expect(res.body).toHaveProperty('availableProviders');
    expect(res.body).toHaveProperty('knowledgeBase');
    expect(res.body.knowledgeBase).toHaveProperty('totalChunks');
    expect(res.body.knowledgeBase).toHaveProperty('sources');
    expect(res.body).toHaveProperty('sessions');
    expect(res.body).toHaveProperty('uptime');
  });

  it('knowledgeBase.sources is an array', async () => {
    const res = await request(app).get('/api/health');
    expect(Array.isArray(res.body.knowledgeBase.sources)).toBe(true);
  });
});

// =============================================================================
// 2. GET /api/config/provider
// =============================================================================
describe('GET /api/config/provider', () => {
  const app = buildApp();

  it('returns 200 with active and available fields', async () => {
    const res = await request(app).get('/api/config/provider');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('active');
    expect(res.body).toHaveProperty('available');
  });

  it('available is an array of provider strings', async () => {
    const res = await request(app).get('/api/config/provider');
    expect(Array.isArray(res.body.available)).toBe(true);
    res.body.available.forEach((p: unknown) => {
      expect(['openai', 'claude', 'gemini']).toContain(p);
    });
  });

  it('active is one of the known provider strings', async () => {
    const res = await request(app).get('/api/config/provider');
    expect(['openai', 'claude', 'gemini']).toContain(res.body.active);
  });
});

// =============================================================================
// 3. POST /api/config/provider
// =============================================================================
describe('POST /api/config/provider', () => {
  const app = buildApp();

  it('switches to a valid configured provider', async () => {
    const res = await request(app)
      .post('/api/config/provider')
      .send({ provider: 'openai' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.active).toBe('openai');
  });

  it('returns 400 for an unknown provider string', async () => {
    const res = await request(app)
      .post('/api/config/provider')
      .send({ provider: 'grok' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when provider field is missing', async () => {
    const res = await request(app)
      .post('/api/config/provider')
      .send({});
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 4. POST /api/chat — validation
// =============================================================================
describe('POST /api/chat — input validation', () => {
  const app = buildApp();

  it('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ sessionId: VALID_UUID });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
  });

  it('returns 400 when message is empty string', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '', sessionId: VALID_UUID });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('message');
  });

  it('returns 400 when message exceeds 4000 characters', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'x'.repeat(4001), sessionId: VALID_UUID });
    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is not a valid UUID', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', sessionId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('sessionId');
  });

  it('returns 400 when mode is an unrecognised value', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', mode: 'debate' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when only imageMimeType is provided (no imageBase64)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Describe this', imageMimeType: 'image/png' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when only imageBase64 is provided (no imageMimeType)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Describe this', imageBase64: 'abc123' });
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 5. POST /api/chat — successful (non-streaming) requests
// =============================================================================
describe('POST /api/chat — successful non-streaming requests', () => {
  const app = buildApp();

  it('returns 200 with answer and sources for a valid message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'What is machine learning?', sessionId: VALID_UUID });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
    expect(res.body).toHaveProperty('sources');
    expect(typeof res.body.answer).toBe('string');
    expect(Array.isArray(res.body.sources)).toBe(true);
  });

  it('works without a sessionId (uses anonymous session)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Tell me about AI.' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
  });

  it('accepts all valid mode values', async () => {
    const modes = ['explain', 'quiz', 'chat', 'summarize', 'flashcard'];
    for (const mode of modes) {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Test message', mode });
      expect(res.status).toBe(200);
    }
  });

  it('accepts an optional persona string', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', persona: 'Brainy Expert' });
    expect(res.status).toBe(200);
  });

  it('returns 400 when persona contains a line break', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', persona: 'Line\nBreak' });
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 6. DELETE /api/chat/history/:sessionId
// =============================================================================
describe('DELETE /api/chat/history/:sessionId', () => {
  const app = buildApp();

  it('clears a valid UUID session and returns success', async () => {
    const res = await request(app)
      .delete(`/api/chat/history/${VALID_UUID}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('clears the anonymous session', async () => {
    const res = await request(app)
      .delete('/api/chat/history/anonymous');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for an invalid (non-UUID, non-anonymous) sessionId', async () => {
    const res = await request(app)
      .delete('/api/chat/history/not-a-valid-id');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an empty sessionId parameter', async () => {
    // Express won't match /api/chat/history/ with a trailing slash as the
    // parameterised route, so hitting the bare /history path exercises the
    // legacy route which always succeeds — test the parameterised path only.
    const res = await request(app)
      .delete('/api/chat/history/!!!');
    expect(res.status).toBe(400);
  });
});

// =============================================================================
// 7. DELETE /api/chat/history (legacy — resets anonymous session)
// =============================================================================
describe('DELETE /api/chat/history (legacy anonymous reset)', () => {
  const app = buildApp();

  it('returns 200 success', async () => {
    const res = await request(app).delete('/api/chat/history');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// =============================================================================
// 8. POST /api/upload — file validation
// =============================================================================
describe('POST /api/upload — file validation', () => {
  const app = buildApp();

  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a disallowed file type (.exe)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('MZ'), 'malware.exe');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a JS file (dangerous MIME / extension)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('alert(1)'), {
        filename: 'script.js',
        contentType: 'text/javascript',
      });
    expect(res.status).toBe(400);
  });

  it('accepts a .txt file and returns success metadata', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('Hello world text content'), 'sample.txt');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('sourceId');
    expect(res.body).toHaveProperty('chunksAdded');
    expect(res.body.filename).toBe('sample.txt');
    expect(res.body.type).toBe('text');
  });

  it('accepts a .md file and returns success metadata', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('# Heading\nSome markdown.'), 'notes.md');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.type).toBe('markdown');
  });

  it('accepts a .pdf file and returns success metadata', async () => {
    // pdf-parse is mocked to return text so any buffer will work
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('%PDF-1.4 fake'), 'document.pdf');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.type).toBe('pdf');
  });

  it('returns 422 for a .txt file with only whitespace (empty content)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('   \n\t  '), 'empty.txt');
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// 9. DELETE /api/upload/:sourceId
// =============================================================================
describe('DELETE /api/upload/:sourceId', () => {
  const app = buildApp();

  it('returns 400 for an invalid sourceId', async () => {
    const res = await request(app)
      .delete('/api/upload/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when the sourceId does not exist in the store', async () => {
    const res = await request(app)
      .delete(`/api/upload/${VALID_UUID}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// =============================================================================
// 10. POST /api/upload/url — SSRF prevention and URL validation
// =============================================================================
describe('POST /api/upload/url — URL validation and SSRF prevention', () => {
  const app = buildApp();

  it('returns 400 when no URL is provided', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a non-URL string', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'not a url at all' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a non-HTTP/HTTPS scheme (ftp://)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'ftp://example.com/file.txt' });
    expect(res.status).toBe(400);
  });

  it('blocks localhost URLs (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://localhost/admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 127.x.x.x loopback addresses (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://127.0.0.1/secret' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 10.x.x.x private range (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://10.0.0.1/internal-service' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 192.168.x.x private range (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://192.168.1.1/router' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 172.16-31.x.x private range (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://172.16.0.1/private' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 169.254.x.x cloud metadata link-local (SSRF)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://169.254.169.254/latest/meta-data/' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks 0.0.0.0', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://0.0.0.0/' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('blocks GCP metadata server', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'http://metadata.google.internal/computeMetadata/v1/' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/private|internal/i);
  });

  it('rejects a URL longer than 2048 characters', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2100);
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: longUrl });
    expect(res.status).toBe(400);
  });

  // Public URL — will fail at the actual fetch stage since there is no real
  // network in tests, so we expect a 502 "failed to fetch" rather than a 400
  // validation error, which confirms the SSRF guard was passed.
  it('passes SSRF guard for a public URL and attempts fetch (502 expected in test env)', async () => {
    const res = await request(app)
      .post('/api/upload/url')
      .send({ url: 'https://example.com/document.pdf' });
    // The guard did not block it (would be 400) — it attempted a real fetch
    // which fails in the test environment with a 502 network error.
    expect(res.status).toBe(502);
  });
});

// =============================================================================
// 11. POST /api/tts — validation
// =============================================================================
describe('POST /api/tts — validation', () => {
  const app = buildApp();

  it('returns 400 when text is empty', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.details).toHaveProperty('text');
  });

  it('returns 400 when text field is missing', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when text exceeds 4096 characters', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: 'x'.repeat(4097) });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('text');
  });

  it('returns 400 for an invalid voice value', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: 'Hello', voice: 'invalid-voice' });
    expect(res.status).toBe(400);
  });

  // Text is valid but TTS calls the real OpenAI endpoint which is unavailable
  // in tests — the mock key triggers a 502 upstream error (not a 400 from our
  // validation layer), which confirms our validation passed successfully.
  it('passes validation with valid text and attempts upstream call', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: 'Hello, this is a test of the text-to-speech system.' });
    // 400 would mean our validation rejected it — anything else is post-validation
    expect(res.status).not.toBe(400);
  });

  it('accepts all valid voice options without a 400', async () => {
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    for (const voice of voices) {
      const res = await request(app)
        .post('/api/tts')
        .send({ text: 'Test', voice });
      expect(res.status).not.toBe(400);
    }
  });

  it('accepts text at exactly the 4096-character limit', async () => {
    const res = await request(app)
      .post('/api/tts')
      .send({ text: 'a'.repeat(4096) });
    // Validation should pass (not 400); upstream TTS will fail — that is fine.
    expect(res.status).not.toBe(400);
  });
});

// =============================================================================
// 12. Unknown routes — 404 handler
// =============================================================================
describe('Unknown /api/* routes', () => {
  const app = buildApp();

  it('returns 404 for an unknown API path', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for a deeply nested unknown path', async () => {
    const res = await request(app).get('/api/foo/bar/baz');
    expect(res.status).toBe(404);
  });

  it('returns 404 for POST to an unknown API route', async () => {
    const res = await request(app)
      .post('/api/unknown-endpoint')
      .send({ data: 'test' });
    expect(res.status).toBe(404);
  });
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { attachUserId } from './supabase/authMiddleware';
import { verifySupabaseRLS } from './supabase/client';
import rateLimit from 'express-rate-limit';
import { CONFIG, validateConfig } from './config';
import { VectorStore } from './brain/vectorStore';
import { Brain } from './brain/brain';
import { SessionStore } from './sessions/sessionStore';
import { TeacherAgent } from './agent/teacherAgent';
import { createUploadRouter } from './routes/upload';
import { createUploadUrlRouter } from './routes/uploadUrl';
import { createConfigRouter } from './routes/config';
import { createChatRouter } from './routes/chat';
import { createTtsRouter } from './routes/tts';
import { createSessionsRouter } from './routes/sessions';
import { createProgressRouter } from './routes/progress';
import { createCertificationsRouter } from './routes/certifications';
import { createSearchRouter } from './routes/search';
import { MemoryManager } from './memory/memoryManager';
import { getDb } from './db';
import { getAvailableProviders } from './models/llmRouter';
import { getActiveProvider } from './runtimeConfig';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

// /api/health is exempt from rate-limiting (used by load-balancer health checks).
// /api/config/provider was previously exempt but is now rate-limited — any user
// switching it affects the global provider for all sessions (B6 remediation).
const RATE_LIMIT_SKIP = ['/api/health'];

function makeLimit(max: number, windowMs = CONFIG.rateLimitWindowMs) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
    skip: (req) => RATE_LIMIT_SKIP.some(path => req.path === path || req.originalUrl === path),
  });
}

// Security headers for Railway/Render deployments.
// Vercel deployments get these from vercel.json rewrites instead.
// helmet() is already applied but uses conservative defaults — this adds the
// same CSP and COEP headers that vercel.json provides to the browser layer.
function applyProductionHeaders(app: import('express').Application): void {
  if (process.env.VERCEL) return; // Vercel applies headers at the edge
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.openai.com https://*.railway.app https://*.onrender.com; " +
      "frame-src https://www.youtube.com https://player.vimeo.com; " +
      "img-src 'self' data: blob: https:; " +
      "media-src 'self' blob: https:; " +
      "worker-src 'self' blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';",
    );
    next();
  });
}

export function createApp() {
  validateConfig();

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  applyProductionHeaders(app);
  app.use(cookieParser());
  app.use(attachUserId);

  app.use(cors((req, callback) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    const sameOrigin = host && origin && (origin === `https://${host}` || origin === `http://${host}`);
    const allowed = !origin || ALLOWED_ORIGINS.includes(origin) || sameOrigin;

    callback(null, {
      origin: allowed,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      credentials: false,
    });
  }));

  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(makeLimit(CONFIG.rateLimitMax));

  getDb(); // initialise SQLite (creates data/tutor.db if needed)
  verifySupabaseRLS().catch(() => {}); // non-blocking RLS startup check

  const store    = new VectorStore();
  const brain    = new Brain(store);
  const sessions = new SessionStore();
  const memory   = new MemoryManager(sessions);
  const agent    = new TeacherAgent(brain, sessions, memory);

  app.use('/api/config', createConfigRouter());
  app.use('/api/upload/url', createUploadUrlRouter(store));
  app.use('/api/upload', createUploadRouter(store));
  app.use('/api/chat', createChatRouter(agent));
  app.use('/api/tts', createTtsRouter());
  app.use('/api/sessions', createSessionsRouter(sessions, memory));
  app.use('/api/progress', createProgressRouter());
  app.use('/api/certifications', createCertificationsRouter());
  app.use('/api/search', createSearchRouter());

  app.get('/api/health', (_req, res) => {
    const kb = brain.getStatus();
    const keysConfigured = {
      claude: !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY),
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    };
    const anyKey = Object.values(keysConfigured).some(Boolean);
    // CWE-200: Return minimal info publicly. Provider names + key presence
    // are kept for the UI's "No API key" amber warning, but session counts
    // and detailed KB info are removed to reduce reconnaissance surface.
    // CWE-200: Minimal public health info — no key names, uptime, or provider details
    // which aid attacker reconnaissance (OWASP A05:2021)
    res.json({
      status: anyKey ? 'ok' : 'degraded',
      knowledgeBase: { sourceCount: kb.sources.length },
    });
  });

  app.use('/api/*', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[app] Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  });

  return { app, store, brain, agent, sessions, memory };
}

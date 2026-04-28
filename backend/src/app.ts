import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
import { getAvailableProviders } from './models/llmRouter';
import { getActiveProvider } from './runtimeConfig';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174']
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

const RATE_LIMIT_SKIP = ['/api/health', '/api/config/provider'];

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

export function createApp() {
  validateConfig();

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());

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

  const store = new VectorStore();
  const brain = new Brain(store);
  const sessions = new SessionStore();
  const agent = new TeacherAgent(brain, sessions);

  app.use('/api/config', createConfigRouter());
  app.use('/api/upload/url', createUploadUrlRouter(store));
  app.use('/api/upload', createUploadRouter(store));
  app.use('/api/chat', createChatRouter(agent));
  app.use('/api/tts', createTtsRouter());

  app.get('/api/health', (_req, res) => {
    const kb = brain.getStatus();
    res.json({
      status: 'ok',
      provider: getActiveProvider(),
      availableProviders: getAvailableProviders(),
      knowledgeBase: {
        totalChunks: kb.totalChunks,
        sources: kb.sources.map(s => ({ sourceId: s.sourceId, filename: s.filename, chunks: s.chunks, type: s.type })),
      },
      sessions: sessions.activeCount,
      uptime: process.uptime(),
    });
  });

  app.use('/api/*', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[app] Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  });

  return { app, store, brain, agent };
}

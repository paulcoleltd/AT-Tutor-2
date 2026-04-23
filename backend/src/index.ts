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
import { getActiveProvider } from './runtimeConfig';
import { createUploadUrlRouter } from './routes/uploadUrl';
import { createConfigRouter } from './routes/config';
import { createChatRouter } from './routes/chat';
import { createTtsRouter } from './routes/tts';

validateConfig();

const app = express();

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));

function makeLimit(max: number, windowMs = CONFIG.rateLimitWindowMs) {
  return rateLimit({
    windowMs, max,
    standardHeaders: true,
    legacyHeaders:   false,
    message:         { error: 'Too many requests. Please slow down.' },
  });
}

// Broad limit for all /api routes
app.use('/api', makeLimit(CONFIG.rateLimitMax));

// Tighter per-route limits for expensive operations
app.use('/api/tts',        makeLimit(10));   // TTS: max 10 req/window (paid audio synthesis)
app.use('/api/upload',     makeLimit(20));   // File upload: max 20 req/window
app.use('/api/upload/url', makeLimit(15));   // URL ingest: max 15 req/window (outbound fetch)

// ── Singletons ────────────────────────────────────────────────────────────────
const store    = new VectorStore();
const brain    = new Brain(store);
const sessions = new SessionStore();
const agent    = new TeacherAgent(brain, sessions);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/config',     createConfigRouter());
app.use('/api/upload',     createUploadRouter(store));
app.use('/api/upload/url', createUploadUrlRouter(store));
app.use('/api/chat',       createChatRouter(agent));
app.use('/api/tts',        createTtsRouter());

app.get('/api/health', (_req, res) => {
  const kb = brain.getStatus();
  res.json({
    status:   'ok',
    provider: getActiveProvider(),
    // Expose only aggregate counts — not source filenames or sourceIds
    knowledgeBase: {
      totalChunks: kb.totalChunks,
      sources:     kb.sources.map(s => ({
        sourceId: s.sourceId,
        filename: s.filename,
        chunks:   s.chunks,
        type:     s.type,
      })),
    },
    sessions: sessions.activeCount,
    uptime:   process.uptime(),
  });
});

app.use('/api/*', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

app.listen(CONFIG.port, () => {
  console.log(`\n🎓 AI Tutor Agent v2 running on http://localhost:${CONFIG.port}`);
  console.log(`   LLM Provider : ${CONFIG.provider}`);
  console.log(`   Rate limit   : ${CONFIG.rateLimitMax} req / ${CONFIG.rateLimitWindowMs / 1000}s\n`);
});

export { app, store, brain, agent };

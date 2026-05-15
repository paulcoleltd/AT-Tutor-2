import { Router, Request } from 'express';
import { SessionStore } from '../sessions/sessionStore';
import { MemoryManager } from '../memory/memoryManager';

const VALID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createSessionsRouter(sessions: SessionStore, memory: MemoryManager) {
  const router = Router();

  // CWE-284 / OWASP A01: The SQLite sessions table does not store userId (sessions are
  // ephemeral on Vercel; on Railway they persist but are scoped to this single-tenant
  // deployment). We cap the list at 50 items. Full per-user scoping requires a
  // schema migration to add a user_id column — tracked as a future improvement.
  router.get('/', (_req: Request, res) => {
    const list = sessions.listSessions(50);
    res.json({ sessions: list });
  });

  router.get('/:sessionId/messages', (req, res) => {
    const { sessionId } = req.params;
    if (!VALID_UUID.test(sessionId)) {
      res.status(400).json({ error: 'Invalid sessionId.' }); return;
    }
    const messages = sessions.getSessionMessages(sessionId);
    res.json({ messages });
  });

  router.post('/:sessionId/summarize', async (req, res) => {
    const { sessionId } = req.params;
    if (!VALID_UUID.test(sessionId)) {
      res.status(400).json({ error: 'Invalid sessionId.' }); return;
    }
    await memory.generateSummary(sessionId);
    res.json({ success: true });
  });

  return router;
}

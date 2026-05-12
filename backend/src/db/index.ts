import path from 'path';
import fs   from 'fs';
// Minimal structural type for better-sqlite3 — avoids a hard @types dep
// while still giving us useful autocomplete on the parts we actually use.
interface SqliteStatement { run(...args: unknown[]): { changes: number; lastInsertRowid: number }; get(...args: unknown[]): unknown; all(...args: unknown[]): unknown[]; }
interface SqliteDb { prepare(sql: string): SqliteStatement; pragma(s: string): unknown; exec(s: string): void; close(): void; transaction(fn: (...a: unknown[]) => unknown): (...a: unknown[]) => unknown; }

// Dynamic require so a missing/incompatible native binary doesn't crash the
// entire serverless function. Falls back to a no-op stub.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let DatabaseCtor: (new (...args: any[]) => SqliteDb) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('better-sqlite3');
  DatabaseCtor = (mod.default ?? mod) as typeof DatabaseCtor;
} catch (e) {
  console.warn('[db] better-sqlite3 unavailable:', (e as Error).message);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    created_at INTEGER NOT NULL,
    last_used  INTEGER NOT NULL,
    title      TEXT,
    summary    TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT    NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session   ON messages(session_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_last_used ON sessions(last_used DESC);

  CREATE TABLE IF NOT EXISTS quiz_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT    NOT NULL,
    is_correct INTEGER NOT NULL,
    topic      TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session_modes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT    NOT NULL,
    mode       TEXT    NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_quiz_results_session  ON quiz_results(session_id);
  CREATE INDEX IF NOT EXISTS idx_quiz_results_time     ON quiz_results(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_session_modes_session ON session_modes(session_id);

  CREATE TABLE IF NOT EXISTS exam_results (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id   TEXT    NOT NULL,
    score        INTEGER NOT NULL,
    total        INTEGER NOT NULL,
    grade        TEXT    NOT NULL,
    improvements TEXT    NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_exam_results_time ON exam_results(created_at DESC);
`;

// Minimal no-op stub used when SQLite is completely unavailable.
// All writes silently succeed; all reads return empty results.
const NOOP_DB = {
  prepare: () => ({
    run:  () => ({ changes: 0, lastInsertRowid: 0 }),
    get:  () => undefined,
    all:  () => [],
  }),
  pragma:  () => [],
  exec:    () => undefined,
  close:   () => undefined,
  transaction: (fn: (...args: unknown[]) => unknown) => fn,
} as unknown as SqliteDb;

let _db: SqliteDb | null = null;

export function getDb(): SqliteDb {
  if (_db) return _db;

  if (!DatabaseCtor) {
    console.warn('[db] SQLite unavailable — using no-op stub (no persistence)');
    _db = NOOP_DB;
    return _db;
  }

  // Try file-based DB first (persistent platforms: Railway, Render, Docker, local)
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new DatabaseCtor(path.join(dataDir, 'tutor.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    // Runtime smoke test — catches native binary crashes that escape the load-time
    // try/catch (e.g. better-sqlite3 on Railway Linux before prebuilt binary fix).
    db.prepare('SELECT 1').get();
    _db = db;
    return _db;
  } catch {
    // Fallback: /tmp on Vercel/serverless, then pure in-memory
    for (const dbPath of ['/tmp/tutor.db', ':memory:']) {
      try {
        const db = new DatabaseCtor(dbPath);
        db.pragma('foreign_keys = ON');
        db.exec(SCHEMA);
        db.prepare('SELECT 1').get(); // runtime smoke test
        _db = db;
        if (dbPath !== ':memory:') {
          console.warn(`[db] Using ${dbPath} (ephemeral — data lost on cold start)`);
        } else {
          console.warn('[db] Using in-memory SQLite (no persistence)');
        }
        return _db;
      } catch { /* try next */ }
    }
    // All options exhausted
    console.warn('[db] All SQLite options failed — using no-op stub');
    _db = NOOP_DB;
    return _db;
  }
}

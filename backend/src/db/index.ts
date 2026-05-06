import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Try file-based DB first (persistent platforms: Railway, Render, Docker, local)
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new Database(path.join(dataDir, 'tutor.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    _db = db;
    return _db;
  } catch {
    // Fallback: in-memory DB for ephemeral/serverless environments (Vercel)
    console.warn('[db] File-based SQLite unavailable — using in-memory store (sessions will not persist across restarts)');
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);
    _db = db;
    return _db;
  }
}

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR  = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'tutor.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(`
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

    CREATE INDEX IF NOT EXISTS idx_messages_session  ON messages(session_id, created_at);
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
  `);
  return _db;
}

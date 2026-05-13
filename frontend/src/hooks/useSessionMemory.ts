/**
 * useSessionMemory — saves snapshots of completed conversations so the AI
 * can resume context when the user returns.
 *
 * Each snapshot stores: topic label, mode, persona, message count, a short
 * auto-summary extracted from the last AI reply, and the sessionId so the
 * full message log can be rehydrated from the chat localStorage key.
 */

import { useState, useCallback } from 'react';

export interface SessionSnapshot {
  sessionId:    string;
  savedAt:      string;        // ISO date
  topic:        string;        // Auto-detected or user-edited label
  mode:         string;
  persona:      string;
  messageCount: number;
  lastUserMsg:  string;        // Last thing the user asked (up to 120 chars)
  aiSummary:    string;        // Opening of the last AI reply (up to 200 chars)
}

const STORAGE_KEY  = 'ai-tutor-session-memory';
const MAX_SESSIONS = 10;

function loadAll(): SessionSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot[]) : [];
  } catch { return []; }
}

function saveAll(snaps: SessionSnapshot[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps)); }
  catch { /* quota */ }
}

/** Auto-derive a topic label from the conversation messages.
 *  Strategy: use the first substantive user message (>10 chars, not just "hi" etc.).
 *  Falls back to the most recent user message if no good opener exists.
 */
export function deriveTopic(messages: Array<{ role: string; content: string }>): string {
  const userMsgs = messages.filter(m => m.role === 'user' && m.content.trim().length > 10);
  if (userMsgs.length === 0) {
    const anyUser = messages.find(m => m.role === 'user')?.content?.trim();
    return anyUser ? (anyUser.length > 60 ? anyUser.slice(0, 57) + '…' : anyUser) : 'Untitled session';
  }
  // Prefer first substantive message (captures the topic of the session)
  const best = userMsgs[0].content
    .replace(/^(hi|hello|hey|please|can you|could you|i want|i need|help me|tell me)[,\s]*/i, '')
    .replace(/[?!.]+$/, '')
    .trim();
  if (best.length < 5) {
    // Best guess failed, use the raw first user message
    const raw = userMsgs[0].content.replace(/[?!.]+$/, '').trim();
    return raw.length > 60 ? raw.slice(0, 57) + '…' : raw;
  }
  // Capitalise first letter
  const label = best.charAt(0).toUpperCase() + best.slice(1);
  return label.length > 60 ? label.slice(0, 57) + '…' : label;
}

export function useSessionMemory() {
  const [sessions, setSessionsState] = useState<SessionSnapshot[]>(loadAll);

  /** Save or overwrite a session snapshot (keyed on sessionId). */
  const saveSnapshot = useCallback((snap: SessionSnapshot) => {
    setSessionsState(prev => {
      const filtered = prev.filter(s => s.sessionId !== snap.sessionId);
      const next     = [snap, ...filtered].slice(0, MAX_SESSIONS);
      saveAll(next);
      return next;
    });
  }, []);

  /** Remove a specific session snapshot. */
  const deleteSnapshot = useCallback((sessionId: string) => {
    setSessionsState(prev => {
      const next = prev.filter(s => s.sessionId !== sessionId);
      saveAll(next);
      return next;
    });
  }, []);

  /** Clear all saved sessions. */
  const clearAll = useCallback(() => {
    saveAll([]);
    setSessionsState([]);
  }, []);

  /** Build the context string injected into the AI for the current session. */
  const buildResumeContext = useCallback((sessionId: string): string => {
    const snap = sessions.find(s => s.sessionId === sessionId);
    if (!snap) return '';
    return (
      `[SESSION MEMORY — you previously studied this with the user]\n` +
      `Topic: ${snap.topic}\n` +
      `Last studied: ${new Date(snap.savedAt).toLocaleDateString()}\n` +
      `Mode used: ${snap.mode} | Persona: ${snap.persona}\n` +
      `Last question asked: "${snap.lastUserMsg}"\n` +
      `Where you left off: ${snap.aiSummary}`
    );
  }, [sessions]);

  return { sessions, saveSnapshot, deleteSnapshot, clearAll, buildResumeContext };
}

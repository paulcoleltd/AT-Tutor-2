/**
 * useMemoryBank — Tier-1 persistent memory that works entirely in the browser.
 *
 * After every AI response the hook scans the conversation for memorable facts
 * (name, preferences, subjects, goals, corrections) and stores them in
 * localStorage. On every new session these facts are injected into the AI's
 * userContext so it remembers who you are across sessions.
 *
 * Tier-2 (Supabase) sits on top and syncs facts to the cloud when configured.
 */

import { useState, useCallback, useEffect } from 'react';

export interface MemoryFact {
  id:         string;
  text:       string;           // e.g. "User's name is Paul"
  category:   MemoryCategory;
  source:     string;           // sessionId where it was learned
  learnedAt:  string;           // ISO date
  confidence: number;           // 0–1
}

export type MemoryCategory =
  | 'identity'      // name, location, occupation
  | 'preference'    // likes/dislikes, style, tools
  | 'subject'       // topics being studied
  | 'goal'          // learning goals
  | 'correction'    // user corrected the AI
  | 'achievement'   // something the user accomplished
  | 'general';      // anything else

const STORAGE_KEY   = 'ai-tutor-memory-bank';
const MAX_FACTS     = 80;
const MAX_CONTEXT   = 1200; // chars injected per session

// ── Pattern-based fact extraction ────────────────────────────────────────────
// Each entry: [category, regex, template fn]
const EXTRACTORS: Array<[MemoryCategory, RegExp, (m: RegExpMatchArray) => string]> = [
  // Identity
  ['identity',   /my name is ([A-Z][a-zA-Z'\- ]{1,30})/i,           m => `User's name is ${m[1].trim()}`],
  ['identity',   /i(?:'m| am) ([A-Z][a-zA-Z'\- ]{1,30})(?:\.|,|\s)/i, m => `User introduced themselves as ${m[1].trim()}`],
  ['identity',   /i(?:'m| am) from ([A-Za-z ,]{2,40})/i,             m => `User is from ${m[1].trim()}`],
  ['identity',   /i(?:'m| am) (?:a |an )?([a-zA-Z ]{3,40} (?:engineer|developer|student|teacher|manager|designer|doctor|nurse|analyst|scientist|architect))/i, m => `User works as ${m[1].trim()}`],
  ['identity',   /i(?:'m| am) (\d{1,2}) years old/i,                 m => `User is ${m[1]} years old`],
  // Preferences
  ['preference', /i (?:prefer|love|like|enjoy) ([a-zA-Z ]{3,40}) over/i, m => `User prefers ${m[1].trim()}`],
  ['preference', /my favou?rite (?:language|tool|framework) is ([a-zA-Z .]{2,30})/i, m => `User's favourite tech is ${m[1].trim()}`],
  ['preference', /my favou?rite ([a-zA-Z ]{2,20}) is ([a-zA-Z0-9 ]{2,30})/i, m => `User's favourite ${m[1].trim()} is ${m[2].trim()}`],
  ['preference', /i (?:hate|dislike|can't stand) ([a-zA-Z ]{3,40})/i, m => `User dislikes ${m[1].trim()}`],
  // Subjects / goals
  ['subject',    /i(?:'m| am) (?:learning|studying|working on) ([a-zA-Z ,]{3,50})/i, m => `User is studying ${m[1].trim()}`],
  ['subject',    /i want to (?:learn|understand|master) ([a-zA-Z ,]{3,50})/i,         m => `User wants to learn ${m[1].trim()}`],
  ['goal',       /my goal is (?:to )?([a-zA-Z ,]{5,80})/i,           m => `User's goal: ${m[1].trim()}`],
  ['goal',       /i(?:'m| am) (?:preparing for|studying for) ([a-zA-Z 0-9-]{3,50})/i, m => `User is preparing for ${m[1].trim()}`],
  // Corrections
  ['correction', /(?:no,? )?(?:that'?s|you'?re) (?:wrong|incorrect|not right)/i, _ => 'User corrected the AI in this session'],
  ['correction', /actually,? (?:it'?s|the answer is) ([a-zA-Z0-9 ,]{2,60})/i,  m => `User corrected: actually ${m[1].trim()}`],
  // Achievements
  ['achievement',/i (?:passed|completed|finished|got) (?:my |the )?([a-zA-Z 0-9-]{3,50})/i, m => `User completed ${m[1].trim()}`],
];

/** Extract facts from a single user message. */
export function extractFacts(
  message: string,
  sessionId: string,
): Omit<MemoryFact, 'id'>[] {
  const facts: Omit<MemoryFact, 'id'>[] = [];
  const seen = new Set<string>();

  for (const [category, pattern, template] of EXTRACTORS) {
    const match = message.match(pattern);
    if (match) {
      const text = template(match);
      if (!seen.has(text)) {
        seen.add(text);
        facts.push({
          text, category, source: sessionId,
          learnedAt: new Date().toISOString(),
          confidence: 0.85,
        });
      }
    }
  }
  return facts;
}

/** Build a compact context block from stored facts for injection. */
export function factsToContext(facts: MemoryFact[]): string {
  if (facts.length === 0) return '';
  // Most recent + highest confidence first
  const sorted = [...facts].sort((a, b) =>
    b.confidence - a.confidence || b.learnedAt.localeCompare(a.learnedAt),
  );
  // Group by category
  const groups: Partial<Record<MemoryCategory, string[]>> = {};
  for (const f of sorted) {
    (groups[f.category] ??= []).push(f.text);
  }
  const lines: string[] = ['[LONG-TERM MEMORY — facts learned across previous sessions]'];
  const order: MemoryCategory[] = ['identity','preference','subject','goal','achievement','correction','general'];
  for (const cat of order) {
    if (groups[cat]?.length) {
      lines.push(...(groups[cat] ?? []).slice(0, 5));
    }
  }
  const ctx = lines.join('\n');
  return ctx.length > MAX_CONTEXT ? ctx.slice(0, MAX_CONTEXT - 3) + '…' : ctx;
}

// ── Storage helpers ───────────────────────────────────────────────────────────
function load(): MemoryFact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryFact[]) : [];
  } catch { return []; }
}

function persist(facts: MemoryFact[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(facts)); } catch {}
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useMemoryBank() {
  const [facts, setFacts] = useState<MemoryFact[]>(load);

  // Keep state in sync if another tab writes to localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFacts(load());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  /** Add facts extracted from a user message. Deduplicates by text content. */
  const learnFromMessage = useCallback((message: string, sessionId: string) => {
    const newFacts = extractFacts(message, sessionId);
    if (newFacts.length === 0) return;

    setFacts(prev => {
      const existing = new Set(prev.map(f => f.text.toLowerCase()));
      const toAdd    = newFacts.filter(f => !existing.has(f.text.toLowerCase()));
      if (toAdd.length === 0) return prev;
      const next = [
        ...toAdd.map(f => ({ ...f, id: uid() })),
        ...prev,
      ].slice(0, MAX_FACTS);
      persist(next);
      return next;
    });
  }, []);

  /** Manually add a fact (e.g. from profile save). */
  const addFact = useCallback((
    text: string,
    category: MemoryCategory = 'general',
    sessionId = 'manual',
  ) => {
    setFacts(prev => {
      if (prev.some(f => f.text.toLowerCase() === text.toLowerCase())) return prev;
      const next = [
        { id: uid(), text, category, source: sessionId,
          learnedAt: new Date().toISOString(), confidence: 1 },
        ...prev,
      ].slice(0, MAX_FACTS);
      persist(next);
      return next;
    });
  }, []);

  /** Delete a specific fact. */
  const deleteFact = useCallback((id: string) => {
    setFacts(prev => {
      const next = prev.filter(f => f.id !== id);
      persist(next);
      return next;
    });
  }, []);

  /** Wipe all facts. */
  const clearAll = useCallback(() => {
    persist([]);
    setFacts([]);
  }, []);

  const contextBlock = factsToContext(facts);
  const hasMemory    = facts.length > 0;

  return { facts, contextBlock, hasMemory, learnFromMessage, addFact, deleteFact, clearAll };
}

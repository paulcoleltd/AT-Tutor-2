/**
 * Supabase-backed persistent memory service.
 * All functions return safe defaults when Supabase is not configured.
 */

import { getSupabase } from './client';
import OpenAI from 'openai';
import { CONFIG } from '../config';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  display_name: string | null;
  level:        string;
  goals:        string | null;
  preferences:  Record<string, unknown>;
}

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface MemorySummary {
  id:      string;
  summary: string;
}

// ── Embedding helper ──────────────────────────────────────────────────────────
let _openai: OpenAI | null = null;

async function embed(text: string): Promise<number[] | null> {
  if (!CONFIG.openaiApiKey) return null;
  _openai ??= new OpenAI({ apiKey: CONFIG.openaiApiKey });
  try {
    const res = await _openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    });
    return res.data[0].embedding;
  } catch {
    return null;
  }
}

// ── Session management ────────────────────────────────────────────────────────
export async function getOrCreateSupabaseSession(
  userId: string,
  sessionId: string,
  firstMessage?: string,
): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;

  const { data } = await db
    .from('chat_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (data) return data.id;

  const title = firstMessage
    ? firstMessage.slice(0, 60)
    : `Session ${new Date().toLocaleDateString()}`;

  const { data: created, error } = await db
    .from('chat_sessions')
    .insert({ id: sessionId, user_id: userId, title })
    .select('id')
    .single();

  if (error) {
    console.warn('[memory] Failed to create session:', error.message);
    return null;
  }
  return created.id;
}

// ── Message persistence ───────────────────────────────────────────────────────
export async function saveMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  const db = getSupabase();
  if (!db || !sessionId) return;
  await db.from('chat_messages').insert({ session_id: sessionId, role, content });
}

export async function loadRecentMessages(
  sessionId: string,
  limit = 20,
): Promise<ChatMessage[]> {
  const db = getSupabase();
  if (!db || !sessionId) return [];

  const { data } = await db
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).reverse() as ChatMessage[];
}

// ── User profile ──────────────────────────────────────────────────────────────
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getSupabase();
  if (!db || !userId) return null;

  const { data } = await db
    .from('user_profiles')
    .select('display_name, level, goals, preferences')
    .eq('user_id', userId)
    .maybeSingle();

  return data as UserProfile | null;
}

export async function upsertUserProfile(
  userId: string,
  profile: Partial<UserProfile>,
): Promise<void> {
  const db = getSupabase();
  if (!db || !userId) return;
  await db.from('user_profiles').upsert({
    user_id: userId,
    ...profile,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ── Semantic memory ───────────────────────────────────────────────────────────
export async function getSemanticMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<MemorySummary[]> {
  const db = getSupabase();
  if (!db || !userId) return [];

  const vector = await embed(query);
  if (!vector) {
    // Fall back to recency-based retrieval when embeddings unavailable
    const { data } = await db
      .from('user_memories')
      .select('id, summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as MemorySummary[];
  }

  const { data } = await db.rpc('match_memories', {
    query_embedding: vector,
    match_user_id:   userId,
    match_count:     limit,
  });

  return (data ?? []) as MemorySummary[];
}

export async function writeMemory(
  userId: string,
  summary: string,
  sourceSessionId?: string,
): Promise<void> {
  const db = getSupabase();
  if (!db || !userId || !summary.trim()) return;

  const embedding = await embed(summary);

  await db.from('user_memories').insert({
    user_id:           userId,
    summary,
    embedding,
    source_session_id: sourceSessionId ?? null,
  });
}

// ── Background memory extraction ─────────────────────────────────────────────
export function scheduleMemoryUpdate(
  userId: string,
  sessionId: string,
  messages: ChatMessage[],
  summariseFn: (msgs: ChatMessage[]) => Promise<string[]>,
): void {
  // Run async without blocking the chat response
  setImmediate(async () => {
    try {
      const facts = await summariseFn(messages);
      for (const fact of facts) {
        await writeMemory(userId, fact, sessionId);
      }
    } catch (e) {
      console.warn('[memory] Background update failed:', (e as Error).message);
    }
  });
}

-- AI Tutor Agent — Supabase schema
-- Run this once in the Supabase SQL editor.

-- Enable pgvector extension for semantic memory
create extension if not exists vector;

-- ── user_profiles ────────────────────────────────────────────────────────────
create table if not exists user_profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      text unique not null,   -- auth.uid() or anonymous cookie id
  display_name text,
  level        text default 'beginner',
  goals        text,
  preferences  jsonb default '{}',
  updated_at   timestamptz default now()
);

-- ── chat_sessions ────────────────────────────────────────────────────────────
create table if not exists chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  title      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_chat_sessions_user on chat_sessions(user_id, updated_at desc);

-- ── chat_messages ────────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role       text not null,          -- 'user' | 'assistant'
  content    text not null,
  tokens     int,
  created_at timestamptz default now()
);
create index if not exists idx_chat_messages_session on chat_messages(session_id, created_at asc);

-- ── user_memories ────────────────────────────────────────────────────────────
create table if not exists user_memories (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  summary           text not null,
  embedding         vector(1536),     -- OpenAI text-embedding-3-small
  source_session_id uuid,
  created_at        timestamptz default now()
);
create index if not exists idx_user_memories_user on user_memories(user_id);
-- ANN index for fast cosine similarity search
create index if not exists idx_user_memories_embedding
  on user_memories using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ── Vector similarity search function ──────────────────────────────────────
create or replace function match_memories(
  query_embedding vector(1536),
  match_user_id   text,
  match_count     int default 5
)
returns table (id uuid, summary text, similarity float)
language sql stable as $$
  select id, summary,
         1 - (embedding <=> query_embedding) as similarity
  from   user_memories
  where  user_id = match_user_id
    and  embedding is not null
  order  by embedding <=> query_embedding
  limit  match_count;
$$;

-- ── RLS policies (optional — enable if using Supabase Auth) ──────────────────
-- alter table user_profiles  enable row level security;
-- alter table chat_sessions  enable row level security;
-- alter table chat_messages  enable row level security;
-- alter table user_memories  enable row level security;

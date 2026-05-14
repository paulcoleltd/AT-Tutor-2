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

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables. The service_role key (used by the backend API)
-- bypasses RLS automatically. The anon key (used in the frontend Supabase
-- client) is blocked from direct table access — all reads/writes must go
-- through the authenticated backend API. (CWE-284, OWASP A01:2021)

alter table user_profiles  enable row level security;
alter table chat_sessions  enable row level security;
alter table chat_messages  enable row level security;
alter table user_memories  enable row level security;

-- ── Deny all direct anon-key access (backend API is the only entry point) ────
-- No SELECT/INSERT/UPDATE/DELETE policies for 'anon' role means the anon key
-- gets zero access to any table — only the service_role key (backend) can read/write.

-- user_profiles: deny all anon access
create policy if not exists "deny_anon_user_profiles"
  on user_profiles for all to anon using (false);

-- chat_sessions: deny all anon access
create policy if not exists "deny_anon_chat_sessions"
  on chat_sessions for all to anon using (false);

-- chat_messages: deny all anon access
create policy if not exists "deny_anon_chat_messages"
  on chat_messages for all to anon using (false);

-- user_memories: deny all anon access
create policy if not exists "deny_anon_user_memories"
  on user_memories for all to anon using (false);

-- ── match_memories() security definer ────────────────────────────────────────
-- Re-create the function as SECURITY DEFINER so it runs with service_role
-- privileges even when called via the anon key (needed if ever used directly).
create or replace function match_memories(
  query_embedding vector(1536),
  match_user_id   text,
  match_count     int default 5
)
returns table (id uuid, summary text, similarity float)
language sql stable security definer as $$
  select id, summary,
         1 - (embedding <=> query_embedding) as similarity
  from   user_memories
  where  user_id = match_user_id
    and  embedding is not null
  order  by embedding <=> query_embedding
  limit  match_count;
$$;

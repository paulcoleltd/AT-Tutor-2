# 🎓 AI Tutor Agent v2

An enhanced AI Tutor built on RAG (Retrieval-Augmented Generation). Upload your documents, then chat, get explanations, take quizzes, generate summaries, or create flashcards — all powered by streaming AI responses.

## What's New in v2

| Feature | v1 | v2 |
|---|---|---|
| Response streaming | ❌ | ✅ Real-time SSE tokens |
| AI models | haiku / gpt-4o-mini / gemini-flash | **claude-sonnet-4-6 / gpt-4o / gemini-1.5-pro** |
| Learning modes | 3 | **5** (Explain, Quiz, Chat, Summarize, Flashcards) |
| Source attribution | ❌ | ✅ Shows which doc answered |
| Dark mode | ❌ | ✅ System-aware toggle |
| Markdown rendering | ❌ | ✅ Full GFM markdown |
| Delete documents | ❌ | ✅ Per-document removal |
| File types | PDF, MD | **PDF, MD, TXT** |
| Session history | Global | **Per-browser UUID session** |
| Stop generation | ❌ | ✅ Abort mid-stream |

---

## Quick Start

### 1. Configure API Keys

```bash
cd backend
cp .env.example .env   # already done
```

Open `backend/.env` and fill in your keys:

```env
LLM_PROVIDER=claude          # or openai / gemini

OPENAI_API_KEY=sk-...        # REQUIRED for embeddings (always)
CLAUDE_API_KEY=sk-ant-...    # required if LLM_PROVIDER=claude
GEMINI_API_KEY=AIza...       # required if LLM_PROVIDER=gemini
```

> **Note:** `OPENAI_API_KEY` is always required — it powers the embedding model (`text-embedding-3-small`) regardless of which LLM you choose for chat.

### 2. Start the Backend

```bash
cd backend
npm run dev
# → http://localhost:4000
```

### 3. Start the Frontend

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

### 4. Environment variables for deployment

When deploying to Vercel, add the following environment variables in the Vercel dashboard for the project:

- `OPENAI_API_KEY`
- `CLAUDE_API_KEY` (optional if using Claude)
- `GEMINI_API_KEY` (optional if using Gemini)
- `LLM_PROVIDER` (one of `openai`, `claude`, `gemini`)
- `ALLOWED_ORIGIN` set to your Vercel app URL, e.g. `https://your-app.vercel.app`

### 5. Open the App

Visit **http://localhost:5173**, upload a document, and start learning.

---

## Project Structure

```
AI Tutor Agent/
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   └── teacherAgent.ts     — Core tutor logic, all 5 modes, streaming
│   │   ├── brain/
│   │   │   ├── brain.ts            — RAG retrieval with source attribution
│   │   │   ├── ingest.ts           — Chunking + embedding pipeline
│   │   │   └── vectorStore.ts      — In-memory cosine-similarity vector store
│   │   ├── models/
│   │   │   ├── llmRouter.ts        — OpenAI / Claude / Gemini (streaming + non-streaming)
│   │   │   └── embeddings.ts       — OpenAI text-embedding-3-small
│   │   ├── routes/
│   │   │   ├── chat.ts             — POST /api/chat (SSE streaming + JSON), DELETE /history
│   │   │   └── upload.ts           — POST /api/upload, DELETE /api/upload/:sourceId
│   │   ├── sessions/
│   │   │   └── sessionStore.ts     — Per-session chat history (30-min TTL)
│   │   ├── config.ts               — Env vars + validation
│   │   └── index.ts                — Express server
│   ├── .env                        — Your API keys (gitignored)
│   └── .env.example                — Template
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Chat.tsx            — Streaming chat, markdown, source chips, stop button
    │   │   ├── FileUpload.tsx      — Drag-and-drop upload (PDF/MD/TXT)
    │   │   ├── KnowledgeBaseStatus.tsx — Live doc list with delete buttons
    │   │   ├── VoiceControls.tsx   — Mic input + TTS output
    │   │   ├── ThemeToggle.tsx     — Dark/light mode
    │   │   └── ErrorBoundary.tsx
    │   ├── hooks/
    │   │   ├── useDarkMode.ts      — System-aware dark mode (localStorage)
    │   │   └── useSession.ts       — Per-tab UUID session
    │   ├── lib/
    │   │   └── api.ts              — Typed API client (streaming SSE + REST)
    │   └── App.tsx
    └── .env                        — Frontend env vars (VITE_API_URL)
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send a message (streaming or JSON) |
| `DELETE` | `/api/chat/history/:sessionId` | Clear session history |
| `POST` | `/api/upload` | Upload a document (PDF/MD/TXT) |
| `DELETE` | `/api/upload/:sourceId` | Remove a document |
| `GET` | `/api/health` | Backend status + knowledge base stats |

### Chat request body
```json
{
  "message":   "Explain neural networks",
  "mode":      "explain",
  "sessionId": "uuid-v4",
  "stream":    true
}
```
Modes: `explain` · `quiz` · `chat` · `summarize` · `flashcard`

---

## Security hardening
- `persona` input is limited, sanitized, and stripped of line breaks before reaching the backend.
- Custom role text is capped to 80 characters and normalized to prevent prompt-injection payloads.
- `/api/chat` validates all request fields and rejects malformed image payloads.
- Express now disables `x-powered-by`, reducing server fingerprint exposure.

> Keep `SECURITY.md` updated whenever security-related fixes, validation changes, or deployment hardening are added.
> Use Dependabot and CI to catch vulnerable dependency upgrades automatically.

## Deployment (full-stack on Vercel)

The project deploys as a single Vercel project: the Express backend becomes a serverless function at `/api/*` and the Vite frontend is served as a static site.

### Steps

1. Push the repo to GitHub.
2. In the [Vercel dashboard](https://vercel.com/new), import the repo — leave the framework preset as **Other**.
3. Add these environment variables in Vercel → Settings → Environment Variables:

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | ✅ Always | Powers embeddings (`text-embedding-3-small`) |
| `LLM_PROVIDER` | ✅ | `claude` · `openai` · `gemini` |
| `CLAUDE_API_KEY` | If `LLM_PROVIDER=claude` | Anthropic key |
| `GEMINI_API_KEY` | If `LLM_PROVIDER=gemini` | Google AI key |
| `ALLOWED_ORIGIN` | ✅ | Set to `https://your-app.vercel.app` |

4. Deploy — the `vercel.json` handles build + routing automatically.

> ⚠️ **In-memory knowledge base**: The vector store lives in RAM inside the serverless function. It resets on every cold start. For persistent storage across sessions, integrate an external vector store (Pinecone, Supabase pgvector, Upstash).

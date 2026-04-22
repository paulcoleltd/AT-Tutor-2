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

### 4. Open the App

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

## Deployment

### Backend → Railway
```bash
cd backend
npm run build
# Push to Railway — it reads PORT from env automatically
```

### Frontend → Vercel
```bash
cd frontend
# Set VITE_API_URL=https://your-backend.up.railway.app in Vercel env vars
npm run build
```

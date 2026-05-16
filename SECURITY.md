# Security Notes

This document is the source of truth for current security hardening in the AI Tutor Agent.
Keep it updated whenever security-sensitive code, API validation, access controls, or deployment protections change.

---

## Backend Protections

### `backend/src/routes/chat.ts`
- Zod schema validation on all `/api/chat` request fields.
- `persona` trimmed, ≤80 chars, no line breaks.
- `imageBase64` and `imageMimeType` must be provided together.
- `sanitiseInput()` strips `[\[\]<>{}]`, newlines, control characters (`\x00–\x1f`), injection keywords, and nested JSON role injections **before** the value is used in any log or LLM prompt.
- Audit-log preview is sanitized (ANSI/newline stripped) to prevent log injection (CWE-117).
- `DELETE /api/chat/history/:sessionId` uses a `?callerSession=` **query parameter** for ownership proof instead of a request body (fixes silent body-stripping on DELETE).
- Per-session request rate limiter (30 req/min) and per-user memory write limiter (50 writes/min).

### `backend/src/agent/teacherAgent.ts`
- `sanitizeChunk()` strips prompt-injection markers from every KB chunk before injection (OWASP LLM01 / CWE-94).
- Knowledge-base context wrapped in `<knowledge_base>…</knowledge_base>` XML tags — structurally separates reference data from instructions.
- User context wrapped in `<user_context>…</user_context>` XML tags — prevents structural injection via crafted profile data.
- `[EXAM_RESULT:…]` tag parsing is gated behind `inExamMode` flag — only parsed when `mode === 'exam'`, preventing score forgery in other modes (CWE-20).
- Persona strings sanitized and mapped to curated instruction blocks; custom personas stripped of structural markers.
- Session-scoped LLM provider: `getSessionProvider(sessionId)` is used instead of the global default — per-session preference changes do not affect other users.

### `backend/src/routes/upload.ts` and `uploadUrl.ts`
- `requireUploadToken` middleware: when `UPLOAD_TOKEN` env var is set, all upload/delete operations require a matching `x-upload-token` header (CWE-306).
- File type allowlist + `DANGEROUS_MIMES` blocklist + archive extension blocklist (zip-bomb prevention, CWE-434).
- SSRF blocklist in `uploadUrl.ts` extended to cover IPv6 loopback (`::1`), IPv4-mapped private ranges (`::ffff:10.x`, `::ffff:192.168.x`, `::ffff:172.16–31.x`), plus DNS-rebinding post-resolution check.
- `redirect: 'error'` on `fetch()` — no transparent redirects to internal addresses.
- 20 MB fetch cap enforced both via `Content-Length` header and actual buffer size.

### `backend/src/routes/tts.ts`
- Per-session/IP TTS rate limiter (10 req/min) — prevents API cost abuse (CWE-770).
- Text capped at 1200 chars to limit per-request OpenAI billing.
- Client-disconnect abort signal plumbed through to upstream fetch.

### `backend/src/routes/search.ts`
- Search query truncated to 30 chars in log output — prevents full user queries (potential PII) from being stored in server logs (CWE-532).

### `backend/src/routes/config.ts`
- `/api/config/provider` is now **rate-limited** (removed from `RATE_LIMIT_SKIP`).
- POST accepts optional `sessionId` — when provided, the provider switch is scoped to that session only and does not affect other users.

### `backend/src/runtimeConfig.ts`
- Per-session provider map with 30-minute TTL. `getSessionProvider(sessionId)` returns the session's preferred provider, falling back to the global default.

### `backend/src/app.ts`
- `applyProductionHeaders()` sets HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and a full CSP for Railway/Render deployments (Vercel gets equivalent headers at the edge via `vercel.json`).

### `backend/src/supabase/authMiddleware.ts`
- `X-User-Id` header removed (spoofable — CWE-287). Identity comes from Supabase JWT or anonymous cookie only.
- Anonymous cookie uses `httpOnly`, `secure`, `SameSite: Strict` (CWE-614, CWE-352).

### `backend/src/supabase/client.ts`
- `verifySupabaseRLS()` logs a warning at startup if RLS is not enabled on any memory table (CWE-863).

---

## Frontend Protections

### `frontend/src/lib/api.ts`
- Upload functions include `x-upload-token` header when `VITE_UPLOAD_TOKEN` is set.
- `clearHistory` passes `?callerSession=` query param to match the updated backend ownership check.

### `frontend/src/lib/secureStorage.ts` *(new)*
- AES-GCM-256 encryption for localStorage values using the Web Crypto API.
- Per-origin key generated once, exported as JWK to `sessionStorage` (survives navigation; cleared on tab close).
- Each write generates a fresh 96-bit IV; format is `base64(IV || ciphertext)`.
- Graceful fallback to plaintext when Web Crypto is unavailable.

### `frontend/src/components/Chat.tsx`
- Chat history stored via `secureStorage.setItem()` — encrypted at rest (CWE-922).
- `restoreChatAsync()` decrypts history on mount via `useEffect`.
- ReactMarkdown `a` renderer overridden with `SafeLink` — all AI-generated links rendered with `rel="noopener noreferrer"` (CWE-79).
- `urlTransform` blocks `javascript:`, `data:`, `vbscript:` URLs in rendered Markdown.
- Custom role input sanitized on every keystroke (allowlist approach, CWE-20).

---

## Build & Infrastructure

### `nixpacks.toml`
- Uses `npm ci` instead of `npm install` for reproducible, lockfile-enforced builds (supply-chain hardening).

### `vercel.json`
- HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, and a strict CSP applied at the Vercel edge.

---

## General Security Guidance

- Keep all API keys in `backend/.env` and `frontend/.env` — never commit them.
- Set `ALLOWED_ORIGIN` to your production domain to restrict CORS.
- Set `UPLOAD_TOKEN` (backend) and `VITE_UPLOAD_TOKEN` (frontend) in production to gate document ingestion.
- Rotate `UPLOAD_TOKEN` and Supabase keys on any suspected compromise.
- Run `npm audit --audit-level=moderate` in CI — current CI only fails on HIGH+.

## GitHub Security Automation

- `.github/dependabot.yml` tracks npm updates for `/backend` and `/frontend`.
- `.github/workflows/security-ci.yml` runs build and `npm audit --audit-level=high` on push and PR.

## Strategic Hardening (Pending)

- **Route-level JWT authentication**: gate all mutating endpoints (upload, delete, provider switch) behind Supabase JWT verification.
- **Supabase service-role key → scoped functions**: replace admin-key DB operations with Postgres `SECURITY DEFINER` functions to enforce RLS at the DB layer.
- **Persistent vector store**: namespace KB by userId to prevent cross-user pollution.
- **CSP nonce-based scripts**: replace `unsafe-inline` in the CSP with per-request nonces generated by the server or Vite SRI hashes.

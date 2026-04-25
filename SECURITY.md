# Security Notes

This document is the source of truth for current security hardening in the AI Tutor Agent.
Keep it updated whenever security-sensitive code, API validation, access controls, or deployment protections change.

This repository includes runtime hardening for the AI Tutor Agent backend and frontend.

## Backend protections

- `backend/src/routes/chat.ts`
  - Strict request validation for `/api/chat` using Zod.
  - `persona` is trimmed, limited to 80 characters, and prohibited from containing line breaks.
  - `imageBase64` and `imageMimeType` must be provided together or the request is rejected.

- `backend/src/agent/teacherAgent.ts`
  - Persona strings are sanitized before being inserted into the LLM prompt.
  - Known roles are mapped to precise assistant instructions rather than using raw free-form text.
  - Custom persona text is normalized and stripped of prompt-like markers to reduce prompt injection risk.

- `backend/src/index.ts`
  - `x-powered-by` is disabled to reduce server fingerprinting.

## Frontend protections

- `frontend/src/lib/api.ts`
  - Frontend API requests trim and cap persona values before sending them to the backend.
  - Streaming and non-streaming chat payloads both apply the same persona safety constraint.

- `frontend/src/components/Chat.tsx`
  - Custom role input is sanitized on every change.
  - Newlines and unsafe characters are removed from custom persona values.
  - Custom persona input is capped at 80 characters.

## General security guidance

- Keep all API keys out of source control in `backend/.env` and `frontend/.env`.
- Use `CORS` to restrict allowed frontend origins.
- Enforce rate limiting on expensive API routes.
- Avoid echoing sensitive upstream response data back to the client.
- Use dependent tooling such as Dependabot and CI to detect vulnerable package upgrades and failed security checks.
- Set `ALLOWED_ORIGIN` in production to the deployed Vercel domain to whitelist browser requests.

## GitHub security automation

- `.github/dependabot.yml` tracks npm dependency updates for `/backend` and `/frontend`.
- `.github/workflows/security-ci.yml` runs build and `npm audit --audit-level=high` for backend and frontend on push and PR.

## Recommended next steps

- Add authentication if the app is deployed publicly.
- Add logging/auditing for uploads and provider configuration changes.
- Harden URL ingestion further with a denylist of dangerous hostnames and additional SSRF protections.

# DocSortR

## Architecture
Offline-first document sorting app, 3 entities:
- **client/** — Electron 34 + React 19 + Vite 6 + Tailwind + Zustand (Entity 1: Local User)
- **server/** — Python FastAPI + SQLite + SQLAlchemy (Entity 2: Server/Owner)
- **Ollama** — Local LLM runtime for classification (Entity 3: LLM Provider, `http://localhost:11434`)

No cloud dependencies. No internet required at runtime.

## Conventions
- UI text & document types: **French**
- Code (variables, functions, comments): **English**
- Frontend: PascalCase components, camelCase variables
- Backend: snake_case (PEP 8)
- Archive path format: `{archive_base}/{client}/{type}/{year}/{filename}`

## Key Commands
- Client dev: `cd client && npm run dev`
- Server dev: `cd server && uvicorn app.main:app --reload`
- Alembic migrate: `cd server && alembic upgrade head`
- Ollama model pull: `ollama pull mistral` (or whatever `OLLAMA_MODEL` is set to)

## Auth
Single-user local auth. `POST /auth/local` issues a JWT pair with no credentials — the server bootstraps one built-in user on first call. JWT stored in Electron `safeStorage`.

> Note: `client/electron/auth-handler.ts` still contains unused OAuth callback code from the previous design. Safe to delete when touching that file.

## LLM
Ollama `/api/chat` with `format: "json"`, temperature 0.1. Model name configurable via `OLLAMA_MODEL` (default `mistral`). Structured JSON classification: `document_type`, `date`, `client_name`, `confidence_score`, `summary`. Valid types defined in `server/app/services/llm_service.py:VALID_TYPES`.

## Pipeline
Upload (multipart) → staging → OCR (RapidOCR + PyMuPDF) → Ollama classification → WebSocket push → user review → archive move (or reject delete).

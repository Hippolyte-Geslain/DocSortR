# DocSortR

## Architecture
3-entity document sorting app:
- **client/** — Electron 34 + React 19 + Vite 6 + Tailwind + Zustand (Entity 1: Local User)
- **server/** — Python FastAPI + SQLite + SQLAlchemy (Entity 2: Server/Owner)
- **Mistral AI API** — Document classification via mistralai SDK (Entity 3: LLM Provider)

## Conventions
- UI text & document types: **French**
- Code (variables, functions, comments): **English**
- Frontend: PascalCase components, camelCase variables
- Backend: snake_case (PEP 8)
- Archive path format: `{archive_path}/{client}/{type}/{year}/{filename}`

## Key Commands
- Client dev: `cd client && npm run dev`
- Server dev: `cd server && uvicorn app.main:app --reload`
- Alembic migrate: `cd server && alembic upgrade head`

## Auth
OAuth/SSO via Google & GitHub with PKCE flow. JWT stored in Electron safeStorage.

## LLM
Mistral AI (`mistral-small-latest`), structured JSON output for classification.

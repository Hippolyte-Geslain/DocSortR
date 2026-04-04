# DocSortR

Tri et archivage automatique de documents avec IA.

## Architecture

```
[Client Electron]  <--HTTP/WSS-->  [Serveur FastAPI]  <--HTTPS-->  [Mistral AI]
  Entity 1 (User)                  Entity 2 (Owner)               Entity 3 (LLM)
```

## Prérequis

- Node.js 20+
- Python 3.11+
- Comptes OAuth (Google et/ou GitHub)
- Clé API Mistral AI

## Démarrage rapide

### 1. Serveur

```bash
cd server
cp .env.example .env
# Remplir .env avec vos clés OAuth et Mistral

python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt

alembic upgrade head
uvicorn app.main:app --reload
```

### 2. Client

```bash
cd client
npm install
npm run dev
```

### Ou avec Docker (serveur uniquement)

```bash
cp server/.env.example server/.env
# Remplir server/.env

docker-compose up -d
```

## Structure

```
DocSortR/
├── client/      # Electron + React + Vite (Entity 1)
├── server/      # FastAPI + SQLite (Entity 2)
├── shared/      # Types TypeScript partagés
└── docker-compose.yml
```

## Pipeline de traitement

1. L'utilisateur sélectionne un dossier ou glisse des fichiers
2. Les fichiers sont envoyés au serveur (multipart)
3. Le serveur extrait le texte via OCR (RapidOCR + PyMuPDF)
4. Mistral AI classifie le document (type, date, client)
5. Le client reçoit la classification via WebSocket
6. L'utilisateur valide ou corrige, le fichier est archivé

## Archive

Format : `{archive_base}/{client}/{type}/{année}/{doc_id}.ext`

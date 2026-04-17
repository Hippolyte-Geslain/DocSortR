# DocSortR

Tri et archivage automatique de documents avec IA locale. 100% hors-ligne.

## Architecture

```
[Client Electron]  <--HTTP/WSS-->  [Serveur FastAPI]  <--HTTP-->  [Ollama (local)]
  Entity 1 (User)                  Entity 2 (Owner)               Entity 3 (LLM)
```

Aucune dépendance cloud. Aucune connexion internet requise en exécution.

## Prérequis

- Node.js 20+
- Python 3.11+
- [Ollama](https://ollama.com) installé et démarré localement

## Démarrage rapide

### 1. Ollama

```bash
ollama pull mistral          # ou un autre modèle compatible chat + JSON
ollama serve                 # démarre le service sur :11434
```

### 2. Serveur

```bash
cd server
cp .env.example .env         # ajustez OLLAMA_URL / OLLAMA_MODEL si besoin

python -m venv .venv
.venv\Scripts\activate       # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt

alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Client

```bash
cd client
npm install
npm run dev
```

### Ou avec Docker (serveur uniquement)

```bash
cp server/.env.example server/.env
docker-compose up -d
```

Note : Ollama doit tourner sur l'hôte (ou un conteneur séparé) et être joignable depuis le conteneur serveur.

## Structure

```
DocSortR/
├── client/      # Electron + React + Vite (Entity 1)
├── server/      # FastAPI + SQLite (Entity 2)
├── shared/      # Types TypeScript partagés
└── docker-compose.yml
```

## Authentification

Auth locale mono-utilisateur. Pas d'OAuth, pas de mot de passe. Le bouton **Démarrer** appelle `POST /auth/local` qui crée (ou récupère) l'utilisateur local et renvoie un JWT stocké dans le `safeStorage` d'Electron.

## Pipeline de traitement

1. L'utilisateur sélectionne un dossier ou glisse des fichiers
2. Les fichiers sont envoyés au serveur (multipart)
3. Le serveur extrait le texte via OCR (RapidOCR + PyMuPDF)
4. Ollama classifie le document (type, date, client) en JSON structuré
5. Le client reçoit la classification via WebSocket
6. L'utilisateur valide ou corrige, le fichier est archivé (ou rejeté)

## Archive

Format : `{archive_base}/{client}/{type}/{année}/{doc_id}.ext`

Un document archivé peut ensuite être **renommé** (`POST /documents/{id}/rename`) ou **déplacé** dans l'arborescence (`POST /documents/{id}/move`).

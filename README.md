# DocSortR

**Drop in your administrative documents, get them filed. No cloud, no internet connection, no data leaving your PC.**

DocSortR reads each document (native PDF or scan), asks a local LLM what it is, and files it into `Client / Type / Year` folders. It is built for small offices that handle documents they are not allowed to upload anywhere.

- **100% offline at runtime:** OCR and classification run locally through Ollama.
- **Client–server:** an Electron + React client talks to a FastAPI server over HTTP and WebSockets, so several users can share one archive.
- **Zero-touch install:** a Windows NSIS installer that downloads Ollama and the model on first launch. No Python, Node or shell needed for the end user.
- **Release pipeline:** PyInstaller + electron-builder, built by GitHub Actions on every `v*` tag.

`Electron` `React` `FastAPI` `SQLite` `Alembic` `Ollama` `PyInstaller`

*The rest of this README is in French.*

---

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

## Installation utilisateur final

Télécharger `DocSortR-Setup-<version>.exe` depuis la page [Releases](https://github.com/Hippolyte-Geslain/DocSortR/releases) et double-cliquer. L'installeur NSIS gère tout (langue FR, CLUF, raccourcis). Au premier lancement, le wizard zero-touch télécharge Ollama et le modèle d'IA automatiquement.

Aucun Python, Node ou commande shell requis côté utilisateur.

## Build de l'installeur

Prérequis sur la machine de build: Python 3.11+, Node 20+, PowerShell 5.1+.

```powershell
./scripts/build-release.ps1
```

Sortie: `client/build/DocSortR-Setup-<version>.exe` (~110 Mo). Détail complet, builds partiels et dépannage : voir [BUILD.md](BUILD.md).

Le script orchestre:
1. venv `server/.venv-build` + `pip install -r server/requirements.txt` + pyinstaller
2. PyInstaller → `server/dist/docsortr-server/docsortr-server.exe`
3. `npm ci` + `npm run dist:win` (build React + compile Electron + electron-builder) → installeur NSIS

Un build automatique est déclenché sur chaque tag `v*` par [`.github/workflows/release.yml`](.github/workflows/release.yml); l'installeur est publié comme asset de la release GitHub.

Régénérer l'icône placeholder: `python scripts/gen-icon.py`. Remplacer `client/build-resources/icon.ico` par un vrai ICO de marque quand disponible.

## Développement (sans installeur)

Le wizard zero-touch spawn le backend uniquement dans la version packagée (`app.isPackaged === true`). En dev il faut lancer uvicorn à la main.

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

# Build — Installeur Windows DocSortR

Comment produire l'installeur `DocSortR-Setup-<version>.exe` à partir des sources.

## Ce que produit le build

Un seul fichier : **`client/build/DocSortR-Setup-<version>.exe`** (~110 Mo).
C'est un installeur NSIS qui embarque :

- l'app **Electron** (interface React, le code que nous venons de modifier) ;
- le **serveur FastAPI gelé** via PyInstaller (aucun Python requis chez l'utilisateur final).

Ollama n'est **pas** embarqué : le wizard de premier lancement le télécharge et installe le modèle automatiquement.

## Prérequis (machine de build — une seule fois)

| Outil | Version | Vérifier |
|---|---|---|
| Windows | 10 / 11 x64 | |
| PowerShell | 5.1+ | `$PSVersionTable.PSVersion` |
| Python | 3.11+ sur le PATH | `python --version` |
| Node.js | 20+ sur le PATH | `node -v` |

Pas besoin d'Ollama pour **construire** (seulement pour **exécuter** l'app).

## Build complet — une commande

Depuis la racine du dépôt, dans **PowerShell** :

```powershell
./scripts/build-release.ps1
```

Le script enchaîne tout :

1. crée puis active le venv `server/.venv-build` (s'il n'existe pas) ;
2. `pip install -r server/requirements.txt` + `pip install pyinstaller` ;
3. PyInstaller **gèle le serveur** → `server/dist/docsortr-server/docsortr-server.exe` ;
4. `npm ci` côté client (uniquement si `client/node_modules` est absent) ;
5. `npm run dist:win` → build React + compilation Electron + electron-builder → installeur NSIS.

Durée : **~10–20 min à froid** (le gel PyInstaller est l'étape la plus longue).
À la fin, le script affiche :

```
Installer ready in: ...\client\build\
```

## Builds partiels — itération rapide

Le serveur Python change rarement. Après une **modification d'interface uniquement** (notre cas), ne reconstruis que le client :

```powershell
./scripts/build-release.ps1 -SkipPython
```

Réutilise le serveur déjà gelé dans `server/dist/`. **~3–5 min.** Nécessite qu'un `server/dist/docsortr-server/` valide existe déjà — sinon, lance d'abord un build complet une fois.

À l'inverse, pour ne regeler que le serveur sans repackager l'app Electron :

```powershell
./scripts/build-release.ps1 -SkipNpm
```

## Étapes manuelles (équivalent du script, pour debug)

Si tu veux lancer les phases une par une :

```powershell
# 1) Serveur — gel PyInstaller
cd server
python -m venv .venv-build
.\.venv-build\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller
Remove-Item -Recurse -Force dist, build -ErrorAction SilentlyContinue
pyinstaller --noconfirm pyinstaller.spec     # -> dist\docsortr-server\docsortr-server.exe
deactivate
cd ..

# 2) Client — build React + Electron + packaging
cd client
npm ci                  # (ou npm install)
npm run dist:win        # -> build\DocSortR-Setup-<version>.exe
cd ..
```

Détail de `npm run dist:win` :
`tsc && vite build` (React → `client/dist/`) → `tsc -p electron/tsconfig.json` (Electron → `client/dist-electron/`) → `electron-builder --win`.
electron-builder copie automatiquement `server/dist/docsortr-server/` dans l'installeur — voir `client/electron-builder.yml` › `extraResources`. **C'est pourquoi le serveur doit être gelé _avant_ le packaging.**

## Installer / tester le résultat

Double-clic sur `client/build/DocSortR-Setup-<version>.exe`. Installeur en français : choix du dossier, raccourcis bureau + menu Démarrer.

Pour **exécuter** l'app installée, Ollama doit être disponible — le wizard de premier lancement s'en charge (téléchargement Ollama + modèle).

## Version

Le nom du fichier suit le champ `version` de `client/package.json` (`DocSortR-Setup-<version>.exe`).

- Reconstruire la **même** version **écrase** l'installeur du même nom.
- Pour publier une nouvelle version, bumpe `version` dans `client/package.json` **avant** de builder.

## Signature de code

Les builds locaux sont **non signés** (Windows SmartScreen affichera un avertissement au premier lancement). Pour signer : définir `CSC_LINK` (chemin du `.pfx`) et `CSC_KEY_PASSWORD` dans l'environnement avant de lancer le script.

## Build automatique (CI)

Pousser un tag `v*` déclenche [`.github/workflows/release.yml`](.github/workflows/release.yml), qui exécute **le même** `scripts/build-release.ps1` sur `windows-latest` et publie l'installeur comme asset de la release GitHub.

## Dépannage

| Symptôme | Cause / solution |
|---|---|
| Le script s'arrête sur du texte stderr (pip / PyInstaller) | Déjà géré : `$ErrorActionPreference = "Continue"` + vérif explicite de `$LASTEXITCODE`. Ne pas repasser à `Stop`. |
| `electron-builder failed` / ressource serveur introuvable | `server/dist/docsortr-server/` manquant → lancer un build **complet** (sans `-SkipPython`) au moins une fois. |
| `pyinstaller failed` ou exe corrompu | Supprimer `server/.venv-build`, `server/dist`, `server/build`, puis relancer. |
| `npm ci failed` | Vérifier Node 20+ et la présence de `client/package-lock.json`. |

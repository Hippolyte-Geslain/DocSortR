# DocSortR — Wizard d'installation "zéro connaissance technique"

## Context

Aujourd'hui, faire tourner DocSortR exige que l'utilisateur : installe Python 3.11+, crée un venv, `pip install`, lance `alembic upgrade head`, lance `uvicorn`, installe Ollama à part, fasse `ollama pull mistral`, puis démarre le client Electron. C'est inacceptable pour un utilisateur non-technique — la cible réelle du produit (cabinets, indépendants qui trient leurs factures/contrats).

Objectif : un `.exe` Windows à double-clic qui, en moins de 10 minutes sans intervention technique, livre une app prête à classer des documents. L'utilisateur ne voit jamais les mots "Python", "Ollama", "venv", "port 8000", "JWT".

Cadre choisi (réponses utilisateur) :
- **Windows uniquement** (première version)
- **Installeur léger (~200 Mo)** + téléchargements au 1er lancement
- **Ollama piloté par l'app** comme sous-processus (invisible, démarré/arrêté avec l'app)

## Architecture cible

```
DocSortR.exe (NSIS installer, signé)
  └─ installe dans %LOCALAPPDATA%\Programs\DocSortR\
      ├─ DocSortR.exe            ← Electron
      ├─ resources/
      │   ├─ server/             ← backend figé via PyInstaller (onedir)
      │   │   └─ docsortr-server.exe
      │   └─ bin/
      │       └─ ollama.exe      ← téléchargé au 1er run, stocké ici
      └─ uninstall.exe

%APPDATA%\DocSortR\               ← données utilisateur (pas de droits admin requis)
  ├─ settings.json
  ├─ docsortr.db
  ├─ state.json                  ← setupCompleted, onboarding flags
  ├─ logs/
  └─ ollama-models/              ← OLLAMA_MODELS pointe ici
```

Le main process Electron orchestre 2 sous-processus : `docsortr-server.exe` (FastAPI figé) et `ollama.exe serve`. Tous deux tués à la fermeture de la fenêtre.

---

## Parcours utilisateur complet

### Étape 0 — Téléchargement & installation Windows (hors app)

1. Utilisateur télécharge `DocSortR-Setup-x.y.z.exe` (~200 Mo, signé Authenticode).
2. Double-clic. NSIS : choix langue (FR), accepter CLUF, dossier d'install (défaut OK), icône bureau. Pas d'UAC si install user-only.
3. « Lancer DocSortR » à la fin → Electron démarre.

### Étape 1 — Écran de bienvenue

- Plein écran, fond `dark-900`, logo + titre **DocSortR**.
- Sous-titre : *« Trions vos documents automatiquement. Quelques étapes, 5 minutes. »*
- Un seul CTA `btn-primary` : **Commencer**.
- Aucun choix technique, aucune question.

### Étape 2 — Diagnostic automatique (silencieux)

Au clic sur *Commencer*, le wizard exécute en parallèle :
- Vérifie espace disque libre (>8 Go requis pour modèle + OCR).
- Vérifie connectivité internet (ping `https://ollama.com`, `https://github.com`).
- Vérifie si `%LOCALAPPDATA%\Programs\DocSortR\resources\bin\ollama.exe` existe.
- Lance le backend figé `docsortr-server.exe` sur un port libre (0 = OS assigne), récupère le port, le stocke en mémoire.
- Crée les dossiers `%APPDATA%\DocSortR\{logs,ollama-models}`.

UI : un stepper visuel (4 pastilles) qui passe de `gray-600` → `accent-500` au fur et à mesure. Copies : *« Vérification de votre système… »*.

**En cas d'échec** : message clair + bouton unique **Réessayer** + lien *« Obtenir de l'aide »* (ouvre un mailto avec un bundle diagnostic pré-rempli).

### Étape 3 — Téléchargement du moteur IA local (Ollama)

Écran dédié avec illustration + texte :
> *« DocSortR a besoin d'un moteur d'IA qui tourne sur votre machine. Rien ne quittera votre ordinateur. »*

Action : téléchargement silencieux du binaire Ollama Windows (~500 Mo) depuis `https://ollama.com/download/ollama-windows-amd64.zip`, extraction de `ollama.exe` dans `resources/bin/`. Barre de progression (%, Mo/s, ETA).

Démarrage en sous-processus :
```
ollama.exe serve
  env: OLLAMA_HOST=127.0.0.1:<port libre>
       OLLAMA_MODELS=%APPDATA%\DocSortR\ollama-models
```
Poll `GET /api/tags` jusqu'à réponse 200 ou timeout 30 s. Stocke le port dans `state.json` (`ollamaPort`).

**Si échec** : bouton *Réessayer* + option *Télécharger manuellement* (ouvre la page officielle dans le navigateur, avec instructions visuelles).

### Étape 4 — Téléchargement du modèle de classification

Écran :
> *« Téléchargement du modèle d'analyse (environ 4 Go, une seule fois). Ceci peut prendre quelques minutes selon votre connexion. »*

Appel :
```
POST http://127.0.0.1:<ollamaPort>/api/pull
{"name": "mistral", "stream": true}
```
L'API renvoie un flux NDJSON avec `status`, `completed`, `total` → traduit en barre de progression + mini-log lisible (*« Téléchargement de la couche 3/7… »*, pas des hashs bruts).

Pause/reprise supportée (fermer la fenêtre pendant le pull : reprise propre au relancement grâce à `ollama pull` idempotent).

### Étape 5 — Dossier d'archivage

Écran :
> *« Où souhaitez-vous ranger vos documents triés ? »*
> *« DocSortR créera des sous-dossiers par client, type et année. »*

Composant : grande carte `dashed border`, click ouvre le `dialog.showOpenDialog` natif (IPC `selectFolder` déjà en place dans `preload.ts`).

Par défaut pré-suggéré : `%USERPROFILE%\Documents\DocSortR`.

Après sélection :
1. Affichage inline du chemin.
2. **Test d'écriture silencieux** : créer + supprimer `.docsortr-write-test` dans le dossier. En cas d'échec → bandeau rouge *« Ce dossier n'est pas accessible en écriture. Choisissez un autre emplacement. »*.
3. **Test de renommage** : créer un fichier sentinelle, le renommer, le supprimer. Couvre le scénario OneDrive / Dropbox qui peut bloquer.
4. **Prévisualisation de l'arborescence** : `Acme SARL / Factures / 2026 / facture_123.pdf` pour illustrer le format d'archivage.

Valeur persistée dans `settings.json` via IPC `write-settings` existant.

### Étape 6 — Préparation des modèles OCR (silencieuse)

Déclenche un appel ping au backend : `GET /health/warm-ocr` (nouveau) qui instancie `RapidOCR()` une fois → force le téléchargement des poids ONNX (~150 Mo) dans le cache utilisateur.

UI : *« Préparation de la reconnaissance de texte… »* + spinner. Pas de choix utilisateur.

### Étape 7 — Authentification locale (invisible)

Auto-appel `POST /auth/local` → stockage JWT via `safeStorage` (IPC `store-token` existant). Si échec : fallback explicite avec message et Retry.

Aucun écran utilisateur — c'est transparent.

### Étape 8 — Écran de confirmation & premier pas

Écran plein :
- Check vert animé
- *« Tout est prêt, <nom utilisateur Windows>. »*
- Deux CTA côte à côte :
  - `btn-primary` : **Glisser mes premiers documents** (→ dashboard avec overlay de démo sur la drop zone)
  - `btn-secondary` : **Découvrir l'interface** (→ dashboard avec 3 coachmarks successifs : zone de dépôt, historique, paramètres)

Écrit `state.json.setupCompleted = true`. Les lancements futurs sautent le wizard.

### Étape 9 — Lancements suivants

Au démarrage :
1. Vérifier `state.json.setupCompleted`.
2. Si `true` : lancer backend + `ollama serve` en tâche de fond (splash 1-2 s), poll `/health/deps`, puis dashboard.
3. **Auto-repair silencieux** : si `ollama.exe` manquant, ou modèle supprimé, ou port occupé → afficher un micro-wizard ciblé qui relance uniquement l'étape défaillante. Jamais de message d'erreur technique.

---

## Vérifications de dépendances centralisées

Un nouvel endpoint backend remplace le `/health` stub actuel :

```
GET /health/deps → {
  ollama_reachable: bool,
  ollama_port: int,
  model_present: bool,
  ocr_models_present: bool,
  archive_writable: bool,
  db_ok: bool,
  version: str
}
```

Utilisé par le wizard (chaque étape valide son prédécesseur) ET par un badge discret permanent dans la sidebar (point vert/rouge, tooltip « Tout fonctionne »).

---

## Fichiers critiques à modifier / créer

**Nouveau (Electron main)**
- `client/electron/installer/setup-state.ts` — lecture/écriture `state.json`, flag `setupCompleted`
- `client/electron/installer/ollama-manager.ts` — download, spawn, shutdown Ollama, choix de port
- `client/electron/installer/server-manager.ts` — spawn/kill `docsortr-server.exe`, port dynamique, pipe logs
- `client/electron/installer/model-puller.ts` — wrapper NDJSON stream sur `/api/pull`
- `client/electron/installer/fs-probe.ts` — write-test + rename-test sur dossier cible

**Modifié (Electron main)**
- `client/electron/main.ts` — avant `createWindow`, démarre server + Ollama ; avant `app.quit`, les tue proprement
- `client/electron/preload.ts` — nouveaux canaux IPC : `setup:getState`, `setup:downloadOllama`, `setup:pullModel` (avec progress events), `setup:probeFolder`, `setup:markComplete`, `system:getDepsHealth`
- `client/electron/auth-handler.ts` — **supprimer le code OAuth mort** (déjà noté dans CLAUDE.md)

**Nouveau (React renderer)**
- `client/src/pages/OnboardingWizard.tsx` — conteneur plein écran, machine à états (étapes 1-8)
- `client/src/components/onboarding/Stepper.tsx` — pastilles de progression
- `client/src/components/onboarding/ProgressBar.tsx` — barre avec %, Mo/s, ETA (réutilisable pour Ollama + modèle + OCR)
- `client/src/components/onboarding/FolderPicker.tsx` — dérivé de `upload/FolderPicker.tsx`, ajoute preview arbo + résultats des tests
- `client/src/components/onboarding/ErrorPanel.tsx` — message + Réessayer + Aide
- `client/src/components/onboarding/FinalCTA.tsx` — écran 8
- `client/src/stores/onboardingStore.ts` — Zustand : étape courante, progress values, erreurs, diagnostic

**Modifié (React renderer)**
- `client/src/App.tsx` — nouveau gate : si `!setupCompleted` → `<OnboardingWizard />` (avant même `LoginScreen`)
- `client/src/components/layout/AppShell.tsx` — ajouter badge `/health/deps` dans la sidebar
- `client/src/hooks/useApi.ts` — utiliser le port dynamique du backend (injecté par main via IPC ou variable d'env Electron)

**Serveur Python**
- `server/app/routers/health.py` — remplacer par `/health/deps` complet (connectivité Ollama, présence modèle via `/api/tags`, poids RapidOCR via test d'inférence courte, écriture archive, SQLite reachable)
- Nouveau `server/app/routers/health.py:warm_ocr` — route one-shot qui force `RapidOCR()` à télécharger ses poids
- `server/app/config.py` — lire `OLLAMA_URL` / `OLLAMA_MODEL` depuis l'env (déjà possible) et rendre `archive_base_path` / `staging_path` configurables à chaud via la table `settings` ou un endpoint dédié

**Packaging**
- `server/pyinstaller.spec` (nouveau) — bundle `app/`, `alembic/versions/*`, `.env.example` ; cible `docsortr-server.exe`
- `client/electron-builder.yml` (nouveau) — cible `nsis`, inclusion de `resources/server/`, icône, signature Authenticode, `perMachine: false`
- `scripts/build-release.ps1` (nouveau) — orchestre : `alembic upgrade head` sur db template → PyInstaller → `electron-builder --win nsis`

---

## Éléments existants à réutiliser

- IPC `select-folder` (`preload.ts`) → réemployé pour l'étape 5
- IPC `read-settings` / `write-settings` → persistance du chemin d'archive
- IPC `store-token` / `get-stored-token` avec `safeStorage` → JWT local
- `POST /auth/local` (`server/app/routers/auth.py`) → étape 7, aucun changement
- Classes Tailwind `card`, `btn-primary`, `btn-secondary`, palette `dark-*` / `accent-*` → cohérence visuelle du wizard
- Pattern modal de `ReviewModal.tsx` → inspiration pour l'overlay d'étape avec blocage

---

## Gestion des erreurs & observabilité

- Chaque étape du wizard log dans `%APPDATA%\DocSortR\logs\setup-<timestamp>.log`.
- Le bouton *« Obtenir de l'aide »* prépare un zip des 3 derniers logs + `state.json` (purgé des tokens) + infos système (version Windows, RAM, espace disque), et ouvre un mailto avec le zip en pièce jointe.
- Pas de télémétrie réseau par défaut (cohérent avec le positionnement offline-first).

---

## Verification (end-to-end)

Tests manuels sur une VM Windows 11 vierge (pas de Python, pas d'Ollama, pas de Visual C++ runtime non nécessaire) :

1. **Install propre** : double-clic installeur, valider les 8 étapes sans toucher à un terminal. Chronométrer < 10 min sur connexion 50 Mbps. Classer un PDF test.
2. **Relance** : fermer l'app, rouvrir → splash court, dashboard en < 5 s, pas de wizard.
3. **Ollama manquant** : supprimer `resources/bin/ollama.exe` à la main, relancer → micro-wizard relance uniquement l'étape 3.
4. **Modèle manquant** : `Remove-Item %APPDATA%\DocSortR\ollama-models\*`, relancer → micro-wizard étape 4 uniquement.
5. **Dossier archive supprimé/déplacé** : le dashboard affiche un bandeau de repair au prochain upload, pas de crash.
6. **Pas d'internet au 1er lancement** : message clair dès l'étape 2, blocage non-destructif, relance possible plus tard.
7. **Offline après install complète** : déconnecter le Wifi, lancer l'app, classer un PDF → fonctionne (c'est la promesse clé du produit).
8. **Désinstallation** : NSIS uninstall supprime `Programs\DocSortR\`, propose (case à cocher) de supprimer `%APPDATA%\DocSortR\` avec les modèles.

Tests automatisés (à ajouter) :
- `server/tests/test_health_deps.py` — mock Ollama down/up, vérifier les champs de `/health/deps`.
- `client/e2e/onboarding.spec.ts` (Playwright) — chemin heureux du wizard avec serveur + Ollama mockés.

---

## Livrable final

Un seul fichier : `DocSortR-Setup-x.y.z.exe` (~200 Mo), signé. L'utilisateur le double-clique, suit 8 écrans clairs en français, obtient une app fonctionnelle hors-ligne. Aucun terminal, aucun fichier `.env` à éditer, aucune commande à taper.

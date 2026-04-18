import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Cpu, FolderOpen, ScanText, KeyRound } from "lucide-react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { Stepper } from "@/components/onboarding/Stepper";
import { ProgressBar, ProgressBarWithBytes } from "@/components/onboarding/ProgressBar";
import { ErrorPanel } from "@/components/onboarding/ErrorPanel";
import { FolderPickerWizard } from "@/components/onboarding/FolderPickerWizard";
import { FinalCTA } from "@/components/onboarding/FinalCTA";
import { initRuntime, getServerUrl } from "@/lib/runtime";
import { useAuthStore } from "@/stores/authStore";

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function WizardShell({
  children,
  stepLabel,
}: {
  children: React.ReactNode;
  stepLabel?: string;
}) {
  const step = useOnboardingStore((s) => s.step);
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="p-6 border-b border-dark-800">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-accent-500" />
            <span className="text-lg font-bold">DocSortR</span>
          </div>
          {stepLabel && (
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              {stepLabel}
            </span>
          )}
        </div>
        {step !== "welcome" && step !== "done" && (
          <div className="mt-4">
            <Stepper current={step} />
          </div>
        )}
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Welcome
// ---------------------------------------------------------------------------
function WelcomeStep() {
  const next = useOnboardingStore((s) => s.next);
  return (
    <WizardShell>
      <div className="card text-center space-y-8 py-12">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-accent-500" />
            <h1 className="text-4xl font-bold">DocSortR</h1>
          </div>
          <p className="text-gray-400">
            Trions vos documents automatiquement.
          </p>
        </div>

        <div className="space-y-1 text-sm text-gray-500">
          <p>Quelques étapes, moins de 10 minutes.</p>
          <p>100% sur votre machine — rien ne quittera votre ordinateur.</p>
        </div>

        <button onClick={next} className="btn-primary text-lg px-8 py-3">
          Commencer
        </button>
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Diagnostic
// ---------------------------------------------------------------------------
function DiagnosticStep() {
  const { next, setDiagnostic, diagnostic, setStepError, stepError } =
    useOnboardingStore();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setStepError(null);
    try {
      const result = await window.electronAPI.setupRunDiagnostic();
      setDiagnostic(result);
      if (!result.ok) {
        const reason = !result.diskOk
          ? "Espace disque insuffisant (8 Go requis)."
          : !result.internetOk
          ? "Aucune connexion internet détectée. Vérifiez votre réseau."
          : "Impossible de préparer les dossiers de données.";
        setStepError(reason);
      } else {
        setTimeout(next, 600);
      }
    } catch (err) {
      setStepError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell stepLabel="Étape 1 / 6">
      <div className="card space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Vérification de votre système</h2>
          <p className="text-gray-400 text-sm">
            Nous nous assurons que tout est en place avant de télécharger quoi que ce soit.
          </p>
        </div>

        {running && <ProgressBar percent={0} indeterminate label="Analyse en cours…" />}

        {diagnostic && (
          <ul className="text-sm space-y-2">
            {diagnostic.details.map((d, i) => (
              <li key={i} className="text-gray-300">• {d}</li>
            ))}
          </ul>
        )}

        {stepError && !running && <ErrorPanel message={stepError} onRetry={run} />}
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Ollama
// ---------------------------------------------------------------------------
function OllamaStep() {
  const {
    next,
    setOllamaUrl,
    setOllamaProgress,
    ollamaProgress,
    stepError,
    setStepError,
  } = useOnboardingStore();
  const [phase, setPhase] = useState<"checking" | "downloading" | "starting">(
    "checking"
  );
  const eventIdRef = useRef<string>(randomId());

  const run = async () => {
    setStepError(null);
    setPhase("checking");
    try {
      const already = await window.electronAPI.setupIsOllamaInstalled();
      if (!already) {
        setPhase("downloading");
        const eventId = eventIdRef.current;
        const unsubscribe = window.electronAPI.onOllamaProgress(eventId, (p) => {
          setOllamaProgress(p);
        });
        const res = await window.electronAPI.setupDownloadOllama(eventId);
        unsubscribe();
        if (!res.ok) {
          setStepError(res.error ?? "Téléchargement d'Ollama impossible.");
          return;
        }
      }

      setPhase("starting");
      const start = await window.electronAPI.setupStartOllama();
      if (!start.ok || !start.url) {
        setStepError(start.error ?? "Démarrage d'Ollama impossible.");
        return;
      }
      setOllamaUrl(start.url);
      // Also tell the backend about the chosen Ollama URL so it uses it
      // for classification calls.
      try {
        await fetch(`${getServerUrl()}/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ollama_url: start.url }),
        });
      } catch {
        /* non-fatal: server might not be running in dev */
      }
      setTimeout(next, 400);
    } catch (err) {
      setStepError((err as Error).message);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell stepLabel="Étape 2 / 6">
      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <Cpu className="w-10 h-10 text-accent-500 shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-semibold">Moteur d'IA local</h2>
            <p className="text-gray-400 text-sm mt-1">
              DocSortR utilise un moteur d'IA qui tourne uniquement sur votre machine.
              Rien ne quittera votre ordinateur.
            </p>
          </div>
        </div>

        {phase === "checking" && (
          <ProgressBar percent={0} indeterminate label="Vérification de l'installation…" />
        )}

        {phase === "downloading" && (
          <ProgressBarWithBytes
            percent={ollamaProgress?.percent ?? 0}
            received={ollamaProgress?.receivedBytes}
            total={ollamaProgress?.totalBytes}
            label="Téléchargement du moteur d'IA (~500 Mo)"
          />
        )}

        {phase === "starting" && (
          <ProgressBar percent={100} indeterminate label="Démarrage du moteur…" />
        )}

        {stepError && <ErrorPanel message={stepError} onRetry={run} />}
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Model
// ---------------------------------------------------------------------------
function ModelStep() {
  const {
    next,
    setModelReady,
    setModelProgress,
    modelProgress,
    stepError,
    setStepError,
  } = useOnboardingStore();
  const [phase, setPhase] = useState<"checking" | "pulling">("checking");
  const eventIdRef = useRef<string>(randomId());

  const run = async () => {
    setStepError(null);
    setPhase("checking");
    try {
      const already = await window.electronAPI.setupIsModelPresent();
      if (!already) {
        setPhase("pulling");
        const eventId = eventIdRef.current;
        const unsubscribe = window.electronAPI.onModelProgress(eventId, (p) => {
          setModelProgress(p);
        });
        const res = await window.electronAPI.setupPullModel(eventId);
        unsubscribe();
        if (!res.ok) {
          setStepError(res.error ?? "Téléchargement du modèle impossible.");
          return;
        }
      }
      setModelReady(true);
      setTimeout(next, 400);
    } catch (err) {
      setStepError((err as Error).message);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell stepLabel="Étape 3 / 6">
      <div className="card space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Modèle de classification</h2>
          <p className="text-gray-400 text-sm">
            Téléchargement du modèle d'analyse (environ 4 Go, une seule fois).
            Ceci peut prendre quelques minutes selon votre connexion.
          </p>
        </div>

        {phase === "checking" && (
          <ProgressBar percent={0} indeterminate label="Vérification du modèle…" />
        )}

        {phase === "pulling" && (
          <ProgressBar
            percent={modelProgress?.percent ?? 0}
            label="Téléchargement du modèle"
            sublabel={modelProgress?.friendlyStatus}
          />
        )}

        {stepError && <ErrorPanel message={stepError} onRetry={run} />}
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Folder
// ---------------------------------------------------------------------------
function FolderStep() {
  const {
    next,
    archivePath,
    setArchivePath,
    folderProbe,
    setFolderProbe,
    stepError,
    setStepError,
  } = useOnboardingStore();
  const [isProbing, setIsProbing] = useState(false);

  const handleFolder = async (path: string) => {
    setIsProbing(true);
    setStepError(null);
    try {
      const result = await window.electronAPI.setupProbeFolder(path);
      setFolderProbe(result);
      if (result.ok) {
        setArchivePath(path);
      }
    } catch (err) {
      setStepError((err as Error).message);
    } finally {
      setIsProbing(false);
    }
  };

  const commit = async () => {
    if (!archivePath || !folderProbe?.ok) return;
    setStepError(null);
    try {
      // Persist in Electron settings.json
      await window.electronAPI.writeSettings({ archivePath });
      // Push to the live backend so it archives into this folder
      await fetch(`${getServerUrl()}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive_base_path: archivePath }),
      });
      next();
    } catch (err) {
      setStepError((err as Error).message);
    }
  };

  return (
    <WizardShell stepLabel="Étape 4 / 6">
      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <FolderOpen className="w-10 h-10 text-accent-500 shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-semibold">Dossier d'archivage</h2>
            <p className="text-gray-400 text-sm mt-1">
              Où souhaitez-vous ranger vos documents triés ?
            </p>
          </div>
        </div>

        <FolderPickerWizard
          initialPath={archivePath}
          onFolderSelected={handleFolder}
          probeResult={folderProbe}
          isProbing={isProbing}
        />

        {stepError && <ErrorPanel message={stepError} />}

        <div className="flex justify-end">
          <button
            onClick={commit}
            disabled={!archivePath || !folderProbe?.ok}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuer
          </button>
        </div>
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: OCR warm-up
// ---------------------------------------------------------------------------
function OcrStep() {
  const { next, setOcrReady, stepError, setStepError } = useOnboardingStore();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setStepError(null);
    try {
      const resp = await fetch(`${getServerUrl()}/health/warm-ocr`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = (await resp.json()) as { status: string; message?: string };
      if (data.status !== "ready") {
        throw new Error(data.message ?? "Préparation OCR impossible.");
      }
      setOcrReady(true);
      setTimeout(next, 400);
    } catch (err) {
      setStepError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell stepLabel="Étape 5 / 6">
      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <ScanText className="w-10 h-10 text-accent-500 shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-semibold">
              Préparation de la reconnaissance de texte
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Un dernier instant pour charger les modèles OCR.
            </p>
          </div>
        </div>

        {running && (
          <ProgressBar percent={0} indeterminate label="Chargement des modèles OCR…" />
        )}

        {stepError && !running && <ErrorPanel message={stepError} onRetry={run} />}
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Auth (invisible, auto)
// ---------------------------------------------------------------------------
function AuthStep() {
  const { next, stepError, setStepError } = useOnboardingStore();
  const initialize = useAuthStore((s) => s.initialize);

  const run = async () => {
    setStepError(null);
    try {
      await initialize();
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) throw new Error("L'authentification a échoué.");
      setTimeout(next, 200);
    } catch (err) {
      setStepError((err as Error).message);
    }
  };

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WizardShell stepLabel="Étape 6 / 6">
      <div className="card space-y-6">
        <div className="flex items-start gap-4">
          <KeyRound className="w-10 h-10 text-accent-500 shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-semibold">Finalisation</h2>
            <p className="text-gray-400 text-sm mt-1">
              Création de votre profil local…
            </p>
          </div>
        </div>

        <ProgressBar percent={100} indeterminate label="Presque terminé…" />

        {stepError && <ErrorPanel message={stepError} onRetry={run} />}
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Step: Done
// ---------------------------------------------------------------------------
function DoneStep({ onEnter }: { onEnter: (mode: "upload" | "discover") => void }) {
  const userName = useAuthStore((s) => s.user?.name) ?? "bienvenue";

  return (
    <WizardShell>
      <div className="card py-12">
        <FinalCTA
          userName={userName}
          onDragFirst={() => onEnter("upload")}
          onDiscover={() => onEnter("discover")}
        />
      </div>
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// Root wizard
// ---------------------------------------------------------------------------
interface OnboardingWizardProps {
  onComplete: (mode: "upload" | "discover") => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const step = useOnboardingStore((s) => s.step);
  const setSetupCompleted = useOnboardingStore((s) => s.setSetupCompleted);

  // Ensure runtime info is ready (backend URL) before any step makes HTTP calls
  useEffect(() => {
    void initRuntime();
  }, []);

  const handleEnter = useMemo(
    () => async (mode: "upload" | "discover") => {
      await window.electronAPI.setupMarkComplete();
      setSetupCompleted(true);
      onComplete(mode);
    },
    [onComplete, setSetupCompleted]
  );

  switch (step) {
    case "welcome":
      return <WelcomeStep />;
    case "diagnostic":
      return <DiagnosticStep />;
    case "ollama":
      return <OllamaStep />;
    case "model":
      return <ModelStep />;
    case "folder":
      return <FolderStep />;
    case "ocr":
      return <OcrStep />;
    case "auth":
      return <AuthStep />;
    case "done":
      return <DoneStep onEnter={handleEnter} />;
    default:
      return <WelcomeStep />;
  }
}

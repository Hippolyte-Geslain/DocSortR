import { create } from "zustand";

export type WizardStep =
  | "welcome"
  | "diagnostic"
  | "ollama"
  | "model"
  | "folder"
  | "ocr"
  | "auth"
  | "done";

export const WIZARD_STEPS: WizardStep[] = [
  "welcome",
  "diagnostic",
  "ollama",
  "model",
  "folder",
  "ocr",
  "auth",
  "done",
];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  welcome: "Bienvenue",
  diagnostic: "Vérifications",
  ollama: "Moteur IA",
  model: "Modèle",
  folder: "Dossier",
  ocr: "OCR",
  auth: "Connexion",
  done: "Terminé",
};

interface OnboardingState {
  step: WizardStep;
  setupCompleted: boolean;
  checking: boolean;

  // Results accumulated along the wizard
  diagnostic: DiagnosticResult | null;
  archivePath: string | null;
  folderProbe: FolderProbeResult | null;
  ollamaUrl: string | null;
  modelReady: boolean;
  ocrReady: boolean;

  // Progress trackers
  ollamaProgress: OllamaProgress | null;
  modelProgress: ModelProgress | null;

  // Error payload for ErrorPanel
  stepError: string | null;

  // Actions
  goto: (step: WizardStep) => void;
  next: () => void;
  reset: () => void;
  setDiagnostic: (d: DiagnosticResult | null) => void;
  setArchivePath: (p: string | null) => void;
  setFolderProbe: (r: FolderProbeResult | null) => void;
  setOllamaUrl: (u: string | null) => void;
  setOllamaProgress: (p: OllamaProgress | null) => void;
  setModelProgress: (p: ModelProgress | null) => void;
  setModelReady: (v: boolean) => void;
  setOcrReady: (v: boolean) => void;
  setStepError: (e: string | null) => void;
  setSetupCompleted: (v: boolean) => void;
  setChecking: (v: boolean) => void;
}

function nextStep(current: WizardStep): WizardStep {
  const idx = WIZARD_STEPS.indexOf(current);
  if (idx === -1 || idx === WIZARD_STEPS.length - 1) return current;
  return WIZARD_STEPS[idx + 1];
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: "welcome",
  setupCompleted: false,
  checking: true,

  diagnostic: null,
  archivePath: null,
  folderProbe: null,
  ollamaUrl: null,
  modelReady: false,
  ocrReady: false,

  ollamaProgress: null,
  modelProgress: null,

  stepError: null,

  goto: (step) => set({ step, stepError: null }),
  next: () => set((s) => ({ step: nextStep(s.step), stepError: null })),
  reset: () =>
    set({
      step: "welcome",
      diagnostic: null,
      archivePath: null,
      folderProbe: null,
      ollamaUrl: null,
      modelReady: false,
      ocrReady: false,
      ollamaProgress: null,
      modelProgress: null,
      stepError: null,
    }),

  setDiagnostic: (diagnostic) => set({ diagnostic }),
  setArchivePath: (archivePath) => set({ archivePath }),
  setFolderProbe: (folderProbe) => set({ folderProbe }),
  setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
  setOllamaProgress: (ollamaProgress) => set({ ollamaProgress }),
  setModelProgress: (modelProgress) => set({ modelProgress }),
  setModelReady: (modelReady) => set({ modelReady }),
  setOcrReady: (ocrReady) => set({ ocrReady }),
  setStepError: (stepError) => set({ stepError }),
  setSetupCompleted: (setupCompleted) => set({ setupCompleted }),
  setChecking: (checking) => set({ checking }),
}));

/// <reference types="vite/client" />

interface SetupState {
  setupCompleted: boolean;
  setupCompletedAt?: string;
  archivePath?: string;
  ollamaPort?: number;
  ollamaBinaryPath?: string;
  backendPort?: number;
  modelName?: string;
  lastError?: string;
}

interface DiagnosticResult {
  ok: boolean;
  diskOk: boolean;
  diskFreeGb: number | null;
  internetOk: boolean;
  userDataDirsReady: boolean;
  details: string[];
}

interface FolderProbeResult {
  ok: boolean;
  writable: boolean;
  renamable: boolean;
  error?: string;
}

interface DepsHealth {
  healthy: boolean;
  version?: string;
  ollama_reachable?: boolean;
  ollama_port?: number | null;
  model_present?: boolean;
  ocr_models_present?: boolean;
  archive_writable?: boolean;
  db_ok?: boolean;
  error?: string;
}

interface OllamaProgress {
  phase: "download" | "extract" | "start" | "done" | "error";
  receivedBytes?: number;
  totalBytes?: number;
  percent?: number;
  message?: string;
}

interface ModelProgress {
  status: string;
  friendlyStatus: string;
  percent: number;
  completed: number;
  total: number;
}

interface Window {
  electronAPI: {
    // Legacy / core
    selectFolder: () => Promise<string | null>;
    readSettings: () => Promise<Record<string, unknown>>;
    writeSettings: (settings: Record<string, unknown>) => Promise<void>;
    getStoredToken: () => Promise<string | null>;
    storeToken: (token: string) => Promise<void>;
    clearToken: () => Promise<void>;

    // Runtime info
    getBackendUrl: () => Promise<string>;
    getOllamaUrl: () => Promise<string | null>;
    getDepsHealth: () => Promise<DepsHealth>;
    openExternal: (url: string) => Promise<void>;

    // Wizard state
    setupGetState: () => Promise<SetupState>;
    setupResetState: () => Promise<SetupState>;
    setupMarkComplete: () => Promise<SetupState>;

    // Wizard operations
    setupRunDiagnostic: () => Promise<DiagnosticResult>;
    setupProbeFolder: (dir: string) => Promise<FolderProbeResult>;
    setupIsOllamaInstalled: () => Promise<boolean>;
    setupDownloadOllama: (
      eventId: string
    ) => Promise<{ ok: boolean; error?: string }>;
    setupStartOllama: () => Promise<{
      ok: boolean;
      url?: string;
      port?: number;
      error?: string;
    }>;
    setupStopOllama: () => Promise<{ ok: boolean }>;
    setupIsModelPresent: () => Promise<boolean>;
    setupPullModel: (
      eventId: string
    ) => Promise<{ ok: boolean; error?: string }>;
    setupStartBackend: (opts: {
      archivePath?: string;
      ollamaUrl?: string;
      ollamaModel?: string;
    }) => Promise<{ ok: boolean; url?: string; dev?: boolean; error?: string }>;

    // Progress event subscriptions (returns unsubscribe fn)
    onOllamaProgress: (
      eventId: string,
      cb: (p: OllamaProgress) => void
    ) => () => void;
    onModelProgress: (
      eventId: string,
      cb: (p: ModelProgress) => void
    ) => () => void;
  };
}

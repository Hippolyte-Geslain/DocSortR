/**
 * A full `window.electronAPI` stand-in for preview mode, so the renderer runs
 * in a plain browser with no Electron. Mirrors the surface declared in
 * `@/vite-env.d.ts`. Onboarding/login are mocked *past* (not rendered), so
 * setup state reports "completed" and deps report healthy.
 *
 * Preview mode only.
 */
import { getDataMode } from "./store";

export function makeElectronMock(): Window["electronAPI"] {
  let settings: Record<string, unknown> = {
    serverUrl: "http://localhost:8000",
    archivePath: "C:\\Users\\Demo\\Documents\\Archives DocSortR",
  };
  const noopUnsub = () => {};

  return {
    // Legacy / core
    selectFolder: async () => "C:\\Users\\Demo\\Documents\\À trier",
    readSettings: async () => settings,
    writeSettings: async (next) => {
      settings = { ...settings, ...next };
    },
    getStoredToken: async () => null, // let the mocked /auth/local issue a token
    storeToken: async () => {},
    clearToken: async () => {},

    // Runtime info
    getBackendUrl: async () => "http://localhost:8000",
    getOllamaUrl: async () => "http://localhost:11434",
    getDepsHealth: async () => {
      if (getDataMode() === "error") {
        return {
          healthy: false,
          ollama_reachable: false,
          error: "Ollama arrêté (mode démo).",
        };
      }
      return {
        healthy: true,
        version: "0.1.0-preview",
        ollama_reachable: true,
        ollama_port: 11434,
        model_present: true,
        ocr_models_present: true,
        archive_writable: true,
        db_ok: true,
      };
    },
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener");
    },

    // Wizard state — report completed so we boot straight into the app
    setupGetState: async () => ({ setupCompleted: true }),
    setupResetState: async () => ({ setupCompleted: false }),
    setupMarkComplete: async () => ({ setupCompleted: true }),

    // Wizard operations — canned success (wizard not previewed in this step)
    setupRunDiagnostic: async () => ({
      ok: true,
      diskOk: true,
      diskFreeGb: 128,
      internetOk: true,
      userDataDirsReady: true,
      details: [],
    }),
    setupProbeFolder: async () => ({ ok: true, writable: true, renamable: true }),
    setupIsOllamaInstalled: async () => true,
    setupDownloadOllama: async () => ({ ok: true }),
    setupStartOllama: async () => ({ ok: true, url: "http://localhost:11434", port: 11434 }),
    setupStopOllama: async () => ({ ok: true }),
    setupIsModelPresent: async () => true,
    setupPullModel: async () => ({ ok: true }),
    setupStartBackend: async () => ({ ok: true, url: "http://localhost:8000", dev: true }),

    // Progress subscriptions — no-op unsubscribe
    onOllamaProgress: () => noopUnsub,
    onModelProgress: () => noopUnsub,
  };
}

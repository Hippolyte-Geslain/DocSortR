/**
 * IPC wiring for the onboarding wizard.
 *
 * Exposes the setup:* and system:* channels consumed by the React
 * renderer. Long-running operations (download, pull) report progress
 * via one-off events on a given event id, pushed over `webContents.send`.
 */
import { ipcMain, BrowserWindow, shell } from "electron";
import * as ollama from "./ollama-manager";
import * as backend from "./server-manager";
import { pullModel, PullProgress } from "./model-puller";
import { probeFolder, FolderProbeResult } from "./fs-probe";
import { runDiagnostic, DiagnosticResult } from "./diagnostic";
import {
  readState,
  writeState,
  markSetupCompleted,
  resetState,
  SetupState,
} from "./setup-state";

const MODEL_NAME = "mistral";

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

export function registerInstallerHandlers(): void {
  // ---- State ----------------------------------------------------------
  ipcMain.handle("setup:getState", async (): Promise<SetupState> => readState());
  ipcMain.handle("setup:resetState", async () => {
    resetState();
    return readState();
  });
  ipcMain.handle("setup:markComplete", async () => markSetupCompleted());

  // ---- Diagnostic -----------------------------------------------------
  ipcMain.handle("setup:runDiagnostic", async (): Promise<DiagnosticResult> =>
    runDiagnostic()
  );

  // ---- Folder probe ---------------------------------------------------
  ipcMain.handle(
    "setup:probeFolder",
    async (_e, dir: string): Promise<FolderProbeResult> => probeFolder(dir)
  );

  // ---- Ollama ---------------------------------------------------------
  ipcMain.handle("setup:isOllamaInstalled", async () => ollama.isInstalled());

  ipcMain.handle("setup:downloadOllama", async (_e, eventId: string) => {
    try {
      await ollama.downloadAndInstall((p) =>
        broadcast(`setup:ollamaProgress:${eventId}`, p)
      );
      broadcast(`setup:ollamaProgress:${eventId}`, {
        phase: "done",
        percent: 100,
      });
      return { ok: true };
    } catch (err) {
      broadcast(`setup:ollamaProgress:${eventId}`, {
        phase: "error",
        message: (err as Error).message,
      });
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("setup:startOllama", async () => {
    try {
      const result = await ollama.start();
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("setup:stopOllama", async () => {
    ollama.stop();
    return { ok: true };
  });

  // ---- Model ----------------------------------------------------------
  ipcMain.handle("setup:isModelPresent", async () =>
    ollama.isModelPresent(MODEL_NAME)
  );

  ipcMain.handle("setup:pullModel", async (_e, eventId: string) => {
    const url = ollama.getOllamaUrl();
    if (!url) {
      return { ok: false, error: "Ollama n'est pas démarré." };
    }
    try {
      await pullModel(url, MODEL_NAME, (p: PullProgress) => {
        broadcast(`setup:modelProgress:${eventId}`, p);
      });
      broadcast(`setup:modelProgress:${eventId}`, {
        status: "success",
        friendlyStatus: "Modèle prêt.",
        percent: 100,
      });
      writeState({ modelName: MODEL_NAME });
      return { ok: true };
    } catch (err) {
      broadcast(`setup:modelProgress:${eventId}`, {
        status: "error",
        friendlyStatus: (err as Error).message,
        percent: 0,
      });
      return { ok: false, error: (err as Error).message };
    }
  });

  // ---- Backend lifecycle ---------------------------------------------
  ipcMain.handle(
    "setup:startBackend",
    async (_e, opts: { archivePath?: string; ollamaUrl?: string; ollamaModel?: string }) => {
      try {
        const result = await backend.startBackend(opts);
        return { ok: true, ...result };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    }
  );

  // ---- Runtime info for the renderer ---------------------------------
  ipcMain.handle("system:getBackendUrl", async () => backend.getBackendUrl());
  ipcMain.handle("system:getOllamaUrl", async () => ollama.getOllamaUrl());

  // ---- External links -------------------------------------------------
  ipcMain.handle("system:openExternal", async (_e, url: string) =>
    shell.openExternal(url)
  );

  // ---- Deps health proxy (calls backend, with graceful fallback) ----
  ipcMain.handle("system:getDepsHealth", async () => {
    const url = backend.getBackendUrl();
    try {
      const resp = await fetch(`${url}/health/deps`);
      if (!resp.ok) return { healthy: false, error: `HTTP ${resp.status}` };
      return await resp.json();
    } catch (err) {
      return { healthy: false, error: (err as Error).message };
    }
  });
}

export function teardownSubprocesses(): void {
  ollama.stop();
  backend.stopBackend();
}

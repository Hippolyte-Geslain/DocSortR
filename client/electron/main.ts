import { app, BrowserWindow } from "electron";
import path from "path";
import { registerIpcHandlers } from "./ipc-handlers";
import { registerAuthHandlers } from "./auth-handler";
import {
  registerInstallerHandlers,
  teardownSubprocesses,
} from "./installer/ipc-installer";
import { startBackend } from "./installer/server-manager";
import * as ollama from "./installer/ollama-manager";
import { readState } from "./installer/setup-state";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f172a",
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  registerAuthHandlers();
  registerInstallerHandlers();

  // In packaged mode, spin up Ollama (if installed) then the backend so the
  // renderer can talk to them as soon as it loads. In dev mode, this is
  // a no-op (user runs uvicorn/ollama manually).
  if (app.isPackaged) {
    let ollamaUrl: string | undefined;
    try {
      if (ollama.isInstalled()) {
        const result = await ollama.start();
        ollamaUrl = result.url;
      } else {
        console.warn("[main] Ollama binary not installed — setup incomplete?");
      }
    } catch (err) {
      console.error("[main] ollama failed to start:", (err as Error).message);
    }

    const state = readState();
    try {
      await startBackend({
        archivePath: state.archivePath ?? undefined,
        ollamaUrl,
        ollamaModel: state.modelName ?? undefined,
      });
    } catch (err) {
      console.error("[main] backend failed to start:", (err as Error).message);
      // The renderer will still load and show a repair UI via /health/deps.
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  teardownSubprocesses();
});

app.on("window-all-closed", () => {
  teardownSubprocesses();
  if (process.platform !== "darwin") app.quit();
});

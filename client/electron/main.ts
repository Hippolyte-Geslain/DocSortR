import { app, BrowserWindow } from "electron";
import path from "path";
import { registerIpcHandlers } from "./ipc-handlers";
import { registerAuthHandlers } from "./auth-handler";
import {
  registerInstallerHandlers,
  teardownSubprocesses,
} from "./installer/ipc-installer";
import { startBackend } from "./installer/server-manager";

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

  // In packaged mode, kick off the backend server right away so the
  // renderer can talk to it as soon as it loads. In dev mode, this is
  // a no-op (user runs uvicorn manually).
  if (app.isPackaged) {
    try {
      await startBackend();
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

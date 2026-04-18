/**
 * Backend (FastAPI) lifecycle manager.
 *
 * In development, the user runs `uvicorn app.main:app --reload` manually,
 * so this module is a no-op that reports the dev URL. In packaged mode,
 * it spawns the frozen `docsortr-server.exe` bundled under
 * `<app>/resources/server/`, picks a free port, and tears it down on
 * application quit.
 */
import { app } from "electron";
import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { findFreePort } from "./fs-probe";
import { writeState } from "./setup-state";

const DEV_URL = "http://127.0.0.1:8000";
const STARTUP_TIMEOUT_MS = 30_000;

let serverProc: ChildProcess | null = null;
let serverUrl: string = DEV_URL;

export function getBackendUrl(): string {
  return serverUrl;
}

function getPackagedBinaryPath(): string | null {
  // In packaged mode, extraResources ends up at `process.resourcesPath`.
  // We ship the frozen server at `resources/server/docsortr-server.exe`.
  const candidates = [
    path.join(process.resourcesPath ?? "", "server", "docsortr-server.exe"),
    path.join(process.resourcesPath ?? "", "server", "docsortr-server"),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

async function waitForReady(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${url}/health`);
      if (resp.ok) return true;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function startBackend(
  opts: {
    archivePath?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
  } = {}
): Promise<{ url: string; dev: boolean }> {
  // Dev mode: user runs uvicorn themselves
  if (!app.isPackaged) {
    serverUrl = DEV_URL;
    return { url: DEV_URL, dev: true };
  }

  // Already running?
  if (serverProc && !serverProc.killed) {
    return { url: serverUrl, dev: false };
  }

  const bin = getPackagedBinaryPath();
  if (!bin) {
    throw new Error(
      "Le serveur DocSortR est introuvable. Veuillez réinstaller l'application."
    );
  }

  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;

  const userData = app.getPath("userData");
  const dataDir = path.join(userData, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SERVER_HOST: "127.0.0.1",
    SERVER_PORT: String(port),
    DATABASE_URL: `sqlite+aiosqlite:///${path.join(userData, "docsortr.db").replace(/\\/g, "/")}`,
    ARCHIVE_BASE_PATH: opts.archivePath ?? path.join(dataDir, "archive"),
    STAGING_PATH: path.join(dataDir, "staging"),
    REVIEW_PATH: path.join(dataDir, "review"),
    ALLOWED_ORIGINS: `http://127.0.0.1:${port},http://localhost:${port}`,
  };
  if (opts.ollamaUrl) env.OLLAMA_URL = opts.ollamaUrl;
  if (opts.ollamaModel) env.OLLAMA_MODEL = opts.ollamaModel;

  const logPath = path.join(userData, "logs");
  fs.mkdirSync(logPath, { recursive: true });
  const logFile = fs.openSync(
    path.join(logPath, `server-${Date.now()}.log`),
    "a"
  );

  serverProc = spawn(bin, [], {
    env,
    cwd: userData,
    stdio: ["ignore", logFile, logFile],
    windowsHide: true,
  });

  serverProc.on("exit", (code, signal) => {
    console.log(`[server] exited (code=${code}, signal=${signal})`);
    serverProc = null;
  });

  const ready = await waitForReady(url, STARTUP_TIMEOUT_MS);
  if (!ready) {
    stopBackend();
    throw new Error("Le serveur n'a pas démarré dans le délai imparti.");
  }

  serverUrl = url;
  writeState({ backendPort: port });
  return { url, dev: false };
}

export function stopBackend(): void {
  if (!serverProc) return;
  try {
    if (process.platform === "win32") {
      // SIGTERM is unreliable on Windows for child processes
      spawn("taskkill", ["/pid", String(serverProc.pid), "/f", "/t"]);
    } else {
      serverProc.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
  serverProc = null;
}

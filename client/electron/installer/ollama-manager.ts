/**
 * Ollama lifecycle + download manager.
 *
 * Downloads the official Ollama Windows binary on first run, stores it
 * under `<userData>/bin/ollama.exe`, spawns `ollama serve` on a free
 * port with a dedicated model directory under userData, and tears it
 * down with the app.
 */
import { app } from "electron";
import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { findFreePort } from "./fs-probe";
import { writeState } from "./setup-state";

// Official Windows zip — contains `ollama.exe` at root. Size ~500 MB.
const OLLAMA_WINDOWS_URL =
  "https://ollama.com/download/ollama-windows-amd64.zip";
const STARTUP_TIMEOUT_MS = 30_000;

export interface OllamaProgress {
  phase: "download" | "extract" | "start";
  receivedBytes?: number;
  totalBytes?: number;
  percent?: number;
  message?: string;
}

export type ProgressCallback = (p: OllamaProgress) => void;

let ollamaProc: ChildProcess | null = null;
let ollamaPort: number | null = null;

export function getBinaryPath(): string {
  const binDir = path.join(app.getPath("userData"), "bin");
  return path.join(binDir, process.platform === "win32" ? "ollama.exe" : "ollama");
}

export function getModelsDir(): string {
  return path.join(app.getPath("userData"), "ollama-models");
}

export function getOllamaUrl(): string | null {
  return ollamaPort ? `http://127.0.0.1:${ollamaPort}` : null;
}

export function isInstalled(): boolean {
  return fs.existsSync(getBinaryPath());
}

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Electron ships with `unzip` on macOS/Linux. On Windows, use PowerShell's
  // Expand-Archive which is available on every Win10+ install.
  return new Promise((resolve, reject) => {
    let cmd: string;
    let args: string[];
    if (process.platform === "win32") {
      cmd = "powershell.exe";
      args = [
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
      ];
    } else {
      cmd = "unzip";
      args = ["-o", zipPath, "-d", destDir];
    }
    const p = spawn(cmd, args, { windowsHide: true });
    p.on("error", reject);
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Extraction failed with code ${code}`));
    });
  });
}

export async function downloadAndInstall(
  onProgress: ProgressCallback
): Promise<void> {
  const binPath = getBinaryPath();
  if (fs.existsSync(binPath)) return;

  const binDir = path.dirname(binPath);
  fs.mkdirSync(binDir, { recursive: true });

  const tmpZip = path.join(binDir, "ollama-download.zip");

  onProgress({ phase: "download", percent: 0, message: "Connexion au serveur…" });

  const resp = await fetch(OLLAMA_WINDOWS_URL);
  if (!resp.ok || !resp.body) {
    throw new Error(`Téléchargement impossible (HTTP ${resp.status})`);
  }

  const totalBytesHeader = resp.headers.get("content-length");
  const totalBytes = totalBytesHeader ? parseInt(totalBytesHeader, 10) : 0;
  let received = 0;

  const reader = resp.body.getReader();
  const write = fs.createWriteStream(tmpZip);

  // Bridge from web ReadableStream to Node Writable, reporting progress.
  const nodeReadable = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        received += value.byteLength;
        onProgress({
          phase: "download",
          receivedBytes: received,
          totalBytes,
          percent: totalBytes > 0 ? Math.round((received / totalBytes) * 100) : 0,
        });
        this.push(Buffer.from(value));
      } catch (err) {
        this.destroy(err as Error);
      }
    },
  });

  await pipeline(nodeReadable, write);

  onProgress({ phase: "extract", message: "Extraction en cours…" });
  await extractZip(tmpZip, binDir);

  // The zip layout places ollama.exe at the root of the extracted content,
  // either directly under binDir or under a subfolder — normalize.
  if (!fs.existsSync(binPath)) {
    const candidates = fs
      .readdirSync(binDir)
      .map((name) => path.join(binDir, name));
    for (const candidate of candidates) {
      const stat = fs.statSync(candidate);
      if (stat.isDirectory()) {
        const inner = path.join(
          candidate,
          process.platform === "win32" ? "ollama.exe" : "ollama"
        );
        if (fs.existsSync(inner)) {
          fs.renameSync(inner, binPath);
          break;
        }
      }
    }
  }

  try {
    fs.unlinkSync(tmpZip);
  } catch {
    /* ignore */
  }

  if (!fs.existsSync(binPath)) {
    throw new Error("Le binaire Ollama n'a pas pu être installé.");
  }

  // Ensure executable on Unix-likes
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(binPath, 0o755);
    } catch {
      /* ignore */
    }
  }

  writeState({ ollamaBinaryPath: binPath });
}

async function waitForReady(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${url}/api/tags`);
      if (resp.ok) return true;
    } catch {
      /* keep polling */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

export async function start(): Promise<{ url: string; port: number }> {
  if (ollamaProc && !ollamaProc.killed && ollamaPort) {
    return { url: `http://127.0.0.1:${ollamaPort}`, port: ollamaPort };
  }

  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) {
    throw new Error("Ollama n'est pas installé.");
  }

  const port = await findFreePort();
  const modelsDir = getModelsDir();
  fs.mkdirSync(modelsDir, { recursive: true });

  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = fs.openSync(
    path.join(logDir, `ollama-${Date.now()}.log`),
    "a"
  );

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OLLAMA_HOST: `127.0.0.1:${port}`,
    OLLAMA_MODELS: modelsDir,
    OLLAMA_KEEP_ALIVE: "24h",
  };

  ollamaProc = spawn(binPath, ["serve"], {
    env,
    stdio: ["ignore", logFile, logFile],
    windowsHide: true,
  });

  ollamaProc.on("exit", (code, signal) => {
    console.log(`[ollama] exited (code=${code}, signal=${signal})`);
    ollamaProc = null;
    ollamaPort = null;
  });

  const url = `http://127.0.0.1:${port}`;
  const ready = await waitForReady(url, STARTUP_TIMEOUT_MS);
  if (!ready) {
    stop();
    throw new Error("Ollama n'a pas démarré dans le délai imparti.");
  }

  ollamaPort = port;
  writeState({ ollamaPort: port });
  return { url, port };
}

export function stop(): void {
  if (!ollamaProc) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(ollamaProc.pid), "/f", "/t"]);
    } else {
      ollamaProc.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
  ollamaProc = null;
  ollamaPort = null;
}

export async function isModelPresent(
  modelName: string,
  ollamaUrl?: string
): Promise<boolean> {
  const url = ollamaUrl ?? getOllamaUrl();
  if (!url) return false;
  try {
    const resp = await fetch(`${url}/api/tags`);
    if (!resp.ok) return false;
    const data = (await resp.json()) as { models?: { name: string }[] };
    const models = data.models ?? [];
    return models.some(
      (m) => m.name === modelName || m.name.startsWith(`${modelName}:`)
    );
  } catch {
    return false;
  }
}

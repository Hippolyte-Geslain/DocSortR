/**
 * Runtime configuration resolver.
 *
 * The backend server port is chosen by the Electron main process (dynamic
 * in packaged mode, `:8000` in dev). The renderer learns about it via IPC.
 * This module caches the result so every fetch in the app can get the URL
 * synchronously.
 */
import { SERVER_URL as DEFAULT_SERVER_URL } from "./constants";

let cachedServerUrl: string | null = null;
let initPromise: Promise<string> | null = null;

export async function initRuntime(): Promise<string> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const url = await window.electronAPI?.getBackendUrl();
      cachedServerUrl = url && url.length > 0 ? url : DEFAULT_SERVER_URL;
    } catch {
      cachedServerUrl = DEFAULT_SERVER_URL;
    }
    return cachedServerUrl;
  })();
  return initPromise;
}

export function getServerUrl(): string {
  return cachedServerUrl ?? DEFAULT_SERVER_URL;
}

export function getWebSocketUrl(token: string): string {
  const http = getServerUrl();
  const ws = http.replace(/^http/, "ws");
  return `${ws}/ws?token=${encodeURIComponent(token)}`;
}

async function pingBackend(): Promise<boolean> {
  try {
    const resp = await fetch(`${getServerUrl()}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pingBackend()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Make sure the local FastAPI service is reachable.
 *
 * Pings `/health` first; if it is down, asks the Electron main process to
 * spawn the bundled server (no-op in dev mode), then polls until it
 * responds. Returns false if the service stays unreachable after the
 * timeout — callers should surface a human-readable error.
 */
export async function ensureBackendUp(
  opts: { archivePath?: string | null; ollamaUrl?: string | null; ollamaModel?: string | null } = {},
  timeoutMs = 15_000
): Promise<boolean> {
  if (await pingBackend()) return true;

  try {
    const res = await window.electronAPI?.setupStartBackend?.({
      archivePath: opts.archivePath ?? undefined,
      ollamaUrl: opts.ollamaUrl ?? undefined,
      ollamaModel: opts.ollamaModel ?? undefined,
    });
    if (res && typeof res === "object" && "url" in res && typeof (res as { url?: unknown }).url === "string") {
      cachedServerUrl = (res as { url: string }).url;
    }
  } catch {
    /* fall through to polling */
  }

  return waitForBackend(timeoutMs);
}

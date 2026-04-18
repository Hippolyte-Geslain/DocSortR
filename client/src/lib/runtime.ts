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

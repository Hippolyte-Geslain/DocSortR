/**
 * Intercepts `window.fetch` for the DocSortR backend (localhost:8000) and
 * answers from the in-memory `./store`. Any request to another host (Vite
 * assets/HMR, real backend if present) passes through untouched.
 *
 * Preview mode only.
 */
import {
  addUploads,
  confirmDocument,
  deriveClients,
  getDataMode,
  getSession,
  getSessions,
  getUser,
  queryDocuments,
  rejectDocument,
} from "./store";

const BACKEND_HOST = "localhost:8000";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Marker thrown by read endpoints in "error" data mode. Rethrown by the fetch
 * override as a rejected fetch, mirroring a backend that's down — which the UI
 * handles gracefully (its try/catch blocks fall back to empty states). We must
 * NOT return a 500-with-JSON: the app calls `.json()` without checking
 * `response.ok`, so a parseable error body would corrupt its data shape.
 */
const NETWORK_DOWN = Symbol("preview:network-down");

async function route(
  method: string,
  url: URL,
  init: RequestInit | undefined,
  input: RequestInfo | URL
): Promise<Response | null> {
  const path = url.pathname;
  const isError = getDataMode() === "error";

  // --- Auth ---
  if (method === "POST" && path === "/auth/local") {
    return json({ access_token: "preview-token", token_type: "bearer" });
  }
  if (method === "GET" && path === "/auth/me") {
    return json(getUser());
  }

  // --- Clients ---
  if (method === "GET" && path === "/clients") {
    if (isError) throw NETWORK_DOWN;
    return json(deriveClients());
  }

  // --- Documents (list) ---
  if (method === "GET" && path === "/documents") {
    if (isError) throw NETWORK_DOWN;
    const status = url.searchParams.get("status");
    const clientName = url.searchParams.get("client_name");
    return json(queryDocuments(status, clientName));
  }

  // --- Document actions ---
  const confirmMatch = path.match(/^\/documents\/([^/]+)\/confirm$/);
  if (method === "POST" && confirmMatch) {
    const body = await readJson(init, input);
    confirmDocument(confirmMatch[1], body as Record<string, string> | undefined);
    return json({ ok: true });
  }
  const rejectMatch = path.match(/^\/documents\/([^/]+)\/reject$/);
  if (method === "POST" && rejectMatch) {
    rejectDocument(rejectMatch[1]);
    return json({ ok: true });
  }

  // --- Upload (multipart) ---
  if (method === "POST" && path === "/documents/upload") {
    const filenames = readUploadFilenames(init);
    const accepted = addUploads(filenames);
    return json({ session_id: `s-${Date.now()}`, accepted });
  }

  // --- Sessions ---
  if (method === "GET" && path === "/sessions") {
    if (isError) throw NETWORK_DOWN;
    return json(getSessions());
  }
  const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (method === "GET" && sessionMatch) {
    if (isError) throw NETWORK_DOWN;
    const s = getSession(sessionMatch[1]);
    return s ? json(s) : json({ detail: "Not found" }, 404);
  }

  // --- Config / health (onboarding bits; harmless OK) ---
  if (method === "POST" && path === "/config") return json({ ok: true });
  if (method === "GET" && path === "/health/warm-ocr") return json({ ok: true });
  if (method === "GET" && path === "/health/deps") {
    if (isError) throw NETWORK_DOWN;
    return json({ healthy: true });
  }

  return null; // unmatched → caller passes through
}

async function readJson(
  init: RequestInit | undefined,
  input: RequestInfo | URL
): Promise<unknown> {
  try {
    if (init?.body && typeof init.body === "string") return JSON.parse(init.body);
    if (input instanceof Request) return await input.clone().json();
  } catch {
    /* ignore */
  }
  return undefined;
}

function readUploadFilenames(init: RequestInit | undefined): string[] {
  const body = init?.body instanceof FormData ? init.body : undefined;
  if (body) {
    const names = body
      .getAll("files")
      .map((f) => (f instanceof File ? f.name : String(f)))
      .filter(Boolean);
    if (names.length > 0) return names;
  }
  // Fallback demo payload when filenames aren't recoverable.
  return ["nouveau_document.pdf"];
}

export function installApiMock(): void {
  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url: URL | null = null;
    try {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      url = new URL(raw, window.location.origin);
    } catch {
      url = null;
    }

    if (url && url.host === BACKEND_HOST) {
      const method = (
        init?.method ??
        (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      try {
        const res = await route(method, url, init, input);
        if (res) return res;
      } catch (err) {
        if (err === NETWORK_DOWN) {
          // Reject like a down backend; callers' try/catch show empty states.
          throw new TypeError("Backend indisponible (mode démo).");
        }
        console.warn("[preview] api-mock route error:", err);
        throw err instanceof Error ? err : new TypeError("Échec fetch (préversion).");
      }
    }

    return original(input as RequestInfo | URL, init);
  };
}

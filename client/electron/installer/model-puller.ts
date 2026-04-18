/**
 * Streaming wrapper around Ollama's `POST /api/pull`.
 *
 * Ollama responds with a stream of NDJSON lines, each shaped like:
 *   { status: "downloading digest", digest: "...", total: N, completed: M }
 *   { status: "verifying sha256 digest" }
 *   { status: "writing manifest" }
 *   { status: "success" }
 *
 * We parse the stream, aggregate the progress across digests, and emit
 * friendly updates for the wizard UI.
 */

export interface PullProgress {
  status: string;
  friendlyStatus: string;
  percent: number;
  completed: number;
  total: number;
}

export type PullProgressCallback = (p: PullProgress) => void;

function translate(status: string): string {
  // Keep untranslated statuses verbatim; translate the common ones to FR.
  if (status.includes("pulling manifest")) return "Récupération du manifeste…";
  if (status.includes("verifying sha256")) return "Vérification d'intégrité…";
  if (status.includes("writing manifest")) return "Finalisation…";
  if (status.includes("removing unused")) return "Nettoyage…";
  if (status.startsWith("pulling ")) return "Téléchargement du modèle…";
  if (status.startsWith("downloading")) return "Téléchargement du modèle…";
  if (status === "success") return "Modèle prêt.";
  return status;
}

export async function pullModel(
  ollamaUrl: string,
  modelName: string,
  onProgress: PullProgressCallback,
  abortSignal?: AbortSignal
): Promise<void> {
  const resp = await fetch(`${ollamaUrl}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: modelName, stream: true }),
    signal: abortSignal,
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Pull failed (HTTP ${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastCompleted = 0;
  let lastTotal = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      try {
        const obj = JSON.parse(line) as {
          status?: string;
          error?: string;
          completed?: number;
          total?: number;
        };
        if (obj.error) {
          throw new Error(obj.error);
        }
        const status = obj.status ?? "";
        const completed = obj.completed ?? lastCompleted;
        const total = obj.total ?? lastTotal;
        if (completed) lastCompleted = completed;
        if (total) lastTotal = total;
        const percent =
          lastTotal > 0 ? Math.min(100, Math.round((lastCompleted / lastTotal) * 100)) : 0;
        onProgress({
          status,
          friendlyStatus: translate(status),
          percent,
          completed: lastCompleted,
          total: lastTotal,
        });

        if (status === "success") {
          return;
        }
      } catch (parseErr) {
        // Ignore malformed lines, propagate thrown errors
        if (parseErr instanceof Error && parseErr.message !== "Unexpected end of JSON input") {
          throw parseErr;
        }
      }
    }
  }
}

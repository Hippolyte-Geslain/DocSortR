import { useEffect, useState } from "react";

/**
 * Polls `/health/deps` every `intervalMs` (default 30s) via the Electron
 * main process, which knows the dynamic backend URL. Returns the latest
 * payload, or `null` while loading / if the backend is unreachable.
 */
export function useDepsHealth(intervalMs: number = 30000): DepsHealth | null {
  const [data, setData] = useState<DepsHealth | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const result = await window.electronAPI?.getDepsHealth();
        if (cancelled) return;
        setData(result ?? null);
      } catch {
        if (!cancelled) setData(null);
      }
    };

    void tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return data;
}

export function isAllHealthy(data: DepsHealth | null): boolean {
  if (!data) return false;
  // `healthy` is set by the Electron main process on transport errors.
  // When present and false, don't bother inspecting the individual flags.
  if (data.healthy === false) return false;
  return Boolean(
    data.ollama_reachable &&
      data.model_present &&
      data.ocr_models_present &&
      data.archive_writable &&
      data.db_ok
  );
}

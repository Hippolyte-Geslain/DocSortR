/**
 * First-run system diagnostics: disk space, internet, user data directories.
 */
import { app } from "electron";
import fs from "fs";
import path from "path";

export interface DiagnosticResult {
  ok: boolean;
  diskOk: boolean;
  diskFreeGb: number | null;
  internetOk: boolean;
  userDataDirsReady: boolean;
  details: string[];
}

const MIN_FREE_GB = 8;

async function checkDiskSpace(): Promise<number | null> {
  try {
    // fs.statfs is available on Node 18.15+/20+. Fallback handled below.
    const maybeStatfs = (fs as unknown as { statfs?: (p: string, cb: (err: Error | null, s: { bavail: bigint; bsize: bigint }) => void) => void }).statfs;
    if (!maybeStatfs) return null;
    return await new Promise<number | null>((resolve) => {
      maybeStatfs(app.getPath("userData"), (err, stats) => {
        if (err || !stats) return resolve(null);
        const freeBytes = Number(stats.bavail) * Number(stats.bsize);
        resolve(freeBytes / 1024 ** 3);
      });
    });
  } catch {
    return null;
  }
}

async function checkInternet(): Promise<boolean> {
  const targets = ["https://ollama.com", "https://github.com"];
  for (const url of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(url, { method: "HEAD", signal: controller.signal });
      clearTimeout(timer);
      if (resp.ok || resp.status < 500) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function ensureUserDataDirs(): boolean {
  const userData = app.getPath("userData");
  const dirs = [
    path.join(userData, "logs"),
    path.join(userData, "bin"),
    path.join(userData, "ollama-models"),
    path.join(userData, "data"),
    path.join(userData, "data", "staging"),
    path.join(userData, "data", "archive"),
  ];
  try {
    for (const d of dirs) fs.mkdirSync(d, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

export async function runDiagnostic(): Promise<DiagnosticResult> {
  const details: string[] = [];
  const diskFreeGb = await checkDiskSpace();
  const diskOk = diskFreeGb === null || diskFreeGb >= MIN_FREE_GB;
  if (diskFreeGb !== null) {
    details.push(`Espace libre : ${diskFreeGb.toFixed(1)} Go`);
  }
  if (!diskOk) {
    details.push(
      `Au moins ${MIN_FREE_GB} Go libres sont nécessaires pour installer le modèle.`
    );
  }

  const internetOk = await checkInternet();
  details.push(
    internetOk ? "Connexion internet détectée." : "Pas de connexion internet."
  );

  const userDataDirsReady = ensureUserDataDirs();
  if (!userDataDirsReady) {
    details.push("Impossible de créer les dossiers de données.");
  }

  return {
    ok: diskOk && internetOk && userDataDirsReady,
    diskOk,
    diskFreeGb,
    internetOk,
    userDataDirsReady,
    details,
  };
}

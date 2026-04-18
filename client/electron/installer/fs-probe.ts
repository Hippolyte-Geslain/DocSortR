/**
 * Filesystem probes — used by the archive-folder wizard step to verify
 * that the chosen folder is writable and supports renames (OneDrive /
 * Dropbox / read-only mounts can fail the second test).
 */
import fs from "fs";
import path from "path";

export interface FolderProbeResult {
  ok: boolean;
  writable: boolean;
  renamable: boolean;
  error?: string;
}

export async function probeFolder(dir: string): Promise<FolderProbeResult> {
  const result: FolderProbeResult = { ok: false, writable: false, renamable: false };

  // Ensure the directory exists (user may have picked it via native dialog,
  // but we also allow creating it if it's missing).
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    result.error = `Création du dossier impossible : ${(err as Error).message}`;
    return result;
  }

  // Write test
  const writeProbe = path.join(dir, ".docsortr-write-test");
  try {
    fs.writeFileSync(writeProbe, "ok", "utf-8");
    result.writable = true;
  } catch (err) {
    result.error = `Écriture impossible : ${(err as Error).message}`;
    return result;
  }

  // Rename test
  const renameProbe = path.join(dir, ".docsortr-rename-test");
  try {
    fs.renameSync(writeProbe, renameProbe);
    result.renamable = true;
  } catch (err) {
    // Cleanup the write-probe that remained
    try {
      fs.unlinkSync(writeProbe);
    } catch {
      /* ignore */
    }
    result.error = `Renommage impossible : ${(err as Error).message}`;
    return result;
  }

  // Cleanup
  try {
    fs.unlinkSync(renameProbe);
  } catch {
    /* ignore */
  }

  result.ok = result.writable && result.renamable;
  return result;
}

/**
 * Find a free TCP port by asking the OS (listen on 0 → read port).
 */
export async function findFreePort(): Promise<number> {
  const net = await import("net");
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const port = address.port;
        srv.close(() => resolve(port));
      } else {
        srv.close();
        reject(new Error("Could not determine free port"));
      }
    });
  });
}

/**
 * Local auth token persistence via Electron's safeStorage.
 *
 * The OAuth callback-server flow from the pre-Ollama era has been removed —
 * DocSortR now uses single-user local auth (POST /auth/local) with no
 * credentials, so we only need to stash the resulting JWT.
 */
import { ipcMain, safeStorage } from "electron";
import { app } from "electron";
import fs from "fs";
import path from "path";

const TOKEN_FILE = "token.bin";

interface TokenStore {
  token: string | null;
}

function getTokenPath(): string {
  return path.join(app.getPath("userData"), TOKEN_FILE);
}

function load(): TokenStore {
  const p = getTokenPath();
  if (!fs.existsSync(p)) return { token: null };
  try {
    const raw = fs.readFileSync(p);
    if (safeStorage.isEncryptionAvailable()) {
      return { token: safeStorage.decryptString(raw) };
    }
    return { token: raw.toString("utf-8") };
  } catch {
    return { token: null };
  }
}

function save(token: string | null): void {
  const p = getTokenPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!token) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
    return;
  }
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(token)
    : Buffer.from(token, "utf-8");
  fs.writeFileSync(p, data);
}

export function registerAuthHandlers() {
  ipcMain.handle("get-stored-token", async () => load().token);
  ipcMain.handle("store-token", async (_event, token: string) => save(token));
  ipcMain.handle("clear-token", async () => save(null));
}

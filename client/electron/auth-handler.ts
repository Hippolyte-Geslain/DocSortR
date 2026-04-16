import { ipcMain, shell, safeStorage } from "electron";
import http from "http";
import { URL } from "url";

const AUTH_CALLBACK_PORT = 19876;
const SERVER_URL = "http://localhost:8000";
const TOKEN_KEY = "docsortr_token";
const REFRESH_KEY = "docsortr_refresh";

let callbackServer: http.Server | null = null;

export function registerAuthHandlers() {
  ipcMain.handle("start-oauth", async (_event, provider: "google" | "github") => {
    return new Promise<string | null>((resolve) => {
      if (callbackServer) {
        callbackServer.close();
        callbackServer = null;
      }

      callbackServer = http.createServer((req, res) => {
        const url = new URL(req.url!, `http://localhost:${AUTH_CALLBACK_PORT}`);
        if (url.pathname === "/callback") {
          const token = url.searchParams.get("token");
          const refreshToken = url.searchParams.get("refresh_token");

          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(`
            <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
              <div style="text-align:center">
                <h1>Connexion réussie</h1>
                <p>Vous pouvez fermer cette fenêtre.</p>
              </div>
            </body></html>
          `);

          if (token) {
            try {
              const encrypted = safeStorage.encryptString(token);
              const encryptedRefresh = refreshToken
                ? safeStorage.encryptString(refreshToken)
                : null;
              // Store as base64 in a simple key-value approach
              (global as Record<string, unknown>)._tokens = { token: encrypted, refresh: encryptedRefresh };
            } catch {
              // safeStorage not available in dev
              (global as Record<string, unknown>)._tokens = { tokenPlain: token, refreshPlain: refreshToken };
            }
          }

          resolve(token);
          setTimeout(() => {
            callbackServer?.close();
            callbackServer = null;
          }, 1000);
        }
      });

      callbackServer.listen(AUTH_CALLBACK_PORT, () => {
        const redirectUri = `http://localhost:${AUTH_CALLBACK_PORT}/callback`;
        const authUrl = `${SERVER_URL}/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}`;
        shell.openExternal(authUrl);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (callbackServer) {
          callbackServer.close();
          callbackServer = null;
          resolve(null);
        }
      }, 300000);
    });
  });

  ipcMain.handle("get-stored-token", async () => {
    const tokens = (global as any)._tokens;
    if (!tokens) return null;
    if (tokens.tokenPlain) return tokens.tokenPlain;
    try {
      return safeStorage.decryptString(tokens.token);
    } catch {
      return null;
    }
  });

  ipcMain.handle("store-token", async (_event, token: string) => {
    try {
      const encrypted = safeStorage.encryptString(token);
      if (!(global as any)._tokens) (global as any)._tokens = {};
      (global as any)._tokens.token = encrypted;
    } catch {
      if (!(global as any)._tokens) (global as any)._tokens = {};
      (global as any)._tokens.tokenPlain = token;
    }
  });

  ipcMain.handle("clear-token", async () => {
    (global as any)._tokens = null;
  });
}

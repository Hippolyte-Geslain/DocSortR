/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectFolder: () => Promise<string | null>;
    readSettings: () => Promise<Record<string, unknown>>;
    writeSettings: (settings: Record<string, unknown>) => Promise<void>;
    startOAuth: (provider: "google" | "github") => Promise<string | null>;
    getStoredToken: () => Promise<string | null>;
    storeToken: (token: string) => Promise<void>;
    clearToken: () => Promise<void>;
  };
}

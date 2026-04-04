import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  readSettings: () => ipcRenderer.invoke("read-settings"),
  writeSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("write-settings", settings),
  startOAuth: (provider: "google" | "github") =>
    ipcRenderer.invoke("start-oauth", provider),
  getStoredToken: () => ipcRenderer.invoke("get-stored-token"),
  storeToken: (token: string) => ipcRenderer.invoke("store-token", token),
  clearToken: () => ipcRenderer.invoke("clear-token"),
});

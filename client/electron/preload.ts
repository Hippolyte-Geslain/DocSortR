import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Legacy / core channels
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  readSettings: () => ipcRenderer.invoke("read-settings"),
  writeSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke("write-settings", settings),
  getStoredToken: () => ipcRenderer.invoke("get-stored-token"),
  storeToken: (token: string) => ipcRenderer.invoke("store-token", token),
  clearToken: () => ipcRenderer.invoke("clear-token"),

  // Runtime info
  getBackendUrl: () => ipcRenderer.invoke("system:getBackendUrl"),
  getOllamaUrl: () => ipcRenderer.invoke("system:getOllamaUrl"),
  getDepsHealth: () => ipcRenderer.invoke("system:getDepsHealth"),
  openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),

  // Wizard state
  setupGetState: () => ipcRenderer.invoke("setup:getState"),
  setupResetState: () => ipcRenderer.invoke("setup:resetState"),
  setupMarkComplete: () => ipcRenderer.invoke("setup:markComplete"),

  // Wizard operations
  setupRunDiagnostic: () => ipcRenderer.invoke("setup:runDiagnostic"),
  setupProbeFolder: (dir: string) => ipcRenderer.invoke("setup:probeFolder", dir),
  setupIsOllamaInstalled: () => ipcRenderer.invoke("setup:isOllamaInstalled"),
  setupDownloadOllama: (eventId: string) =>
    ipcRenderer.invoke("setup:downloadOllama", eventId),
  setupStartOllama: () => ipcRenderer.invoke("setup:startOllama"),
  setupStopOllama: () => ipcRenderer.invoke("setup:stopOllama"),
  setupIsModelPresent: () => ipcRenderer.invoke("setup:isModelPresent"),
  setupPullModel: (eventId: string) =>
    ipcRenderer.invoke("setup:pullModel", eventId),
  setupStartBackend: (opts: {
    archivePath?: string;
    ollamaUrl?: string;
    ollamaModel?: string;
  }) => ipcRenderer.invoke("setup:startBackend", opts),

  // Progress events: callers subscribe with a unique eventId and receive
  // one-off payloads until they call the returned unsubscribe fn.
  onOllamaProgress: (
    eventId: string,
    cb: (p: unknown) => void
  ): (() => void) => {
    const channel = `setup:ollamaProgress:${eventId}`;
    const listener = (_event: IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onModelProgress: (
    eventId: string,
    cb: (p: unknown) => void
  ): (() => void) => {
    const channel = `setup:modelProgress:${eventId}`;
    const listener = (_event: IpcRendererEvent, payload: unknown) => cb(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});

import { create } from "zustand";

interface SettingsState {
  serverUrl: string;
  archivePath: string;
  setServerUrl: (url: string) => void;
  setArchivePath: (path: string) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  serverUrl: "http://localhost:8000",
  archivePath: "",

  setServerUrl: (serverUrl) => set({ serverUrl }),
  setArchivePath: (archivePath) => set({ archivePath }),

  loadSettings: async () => {
    const settings = await window.electronAPI?.readSettings();
    if (settings) {
      set({
        serverUrl: (settings.serverUrl as string) || "http://localhost:8000",
        archivePath: (settings.archivePath as string) || "",
      });
    }
  },

  saveSettings: async () => {
    const { serverUrl, archivePath } = get();
    await window.electronAPI?.writeSettings({ serverUrl, archivePath });
  },
}));

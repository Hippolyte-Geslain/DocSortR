import { ipcMain, dialog, app } from "electron";
import fs from "fs";
import path from "path";

const SETTINGS_FILE = "settings.json";

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), SETTINGS_FILE);
}

export function registerIpcHandlers() {
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Sélectionner un dossier",
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle("read-settings", async () => {
    const settingsPath = getSettingsPath();
    if (!fs.existsSync(settingsPath)) return {};
    const data = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(data);
  });

  ipcMain.handle("write-settings", async (_event, settings: Record<string, unknown>) => {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
  });
}

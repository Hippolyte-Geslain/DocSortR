/**
 * Persistent installer/wizard state.
 *
 * Stored at `<userData>/state.json`. Tracks whether the onboarding wizard
 * has been completed, plus the ports and paths chosen at install time.
 */
import { app } from "electron";
import fs from "fs";
import path from "path";

const STATE_FILE = "state.json";

export interface SetupState {
  setupCompleted: boolean;
  setupCompletedAt?: string;
  archivePath?: string;
  ollamaPort?: number;
  ollamaBinaryPath?: string;
  backendPort?: number;
  modelName?: string;
  lastError?: string;
}

const DEFAULT_STATE: SetupState = {
  setupCompleted: false,
};

function getStatePath(): string {
  return path.join(app.getPath("userData"), STATE_FILE);
}

export function readState(): SetupState {
  const p = getStatePath();
  if (!fs.existsSync(p)) return { ...DEFAULT_STATE };
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeState(partial: Partial<SetupState>): SetupState {
  const current = readState();
  const next: SetupState = { ...current, ...partial };
  const p = getStatePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function resetState(): void {
  writeState({ ...DEFAULT_STATE });
}

export function markSetupCompleted(): SetupState {
  return writeState({
    setupCompleted: true,
    setupCompletedAt: new Date().toISOString(),
  });
}

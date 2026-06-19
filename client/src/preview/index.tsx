/**
 * Preview-mode entry point. `installPreview()` is called once from `main.tsx`
 * (only when Vite runs with `--mode preview`) BEFORE React renders, so the
 * Electron / fetch / WebSocket mocks are in place by the time any component
 * mounts. The whole `./preview` folder is dynamically imported behind that
 * mode check, so it's tree-shaken out of normal builds.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { makeElectronMock } from "./electron-mock";
import { installApiMock } from "./api-mock";
import { installWebSocketMock } from "./ws-mock";
import { PreviewToolbar } from "./PreviewToolbar";

let installed = false;

export function installPreview(): void {
  if (installed) return;
  installed = true;

  if (!window.electronAPI) {
    window.electronAPI = makeElectronMock();
  }
  installApiMock();
  installWebSocketMock();

  const mount = document.createElement("div");
  mount.id = "preview-toolbar-root";
  document.body.appendChild(mount);
  createRoot(mount).render(
    <StrictMode>
      <PreviewToolbar />
    </StrictMode>
  );
}

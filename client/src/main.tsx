import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initRuntime } from "./lib/runtime";
import "./styles/globals.css";

async function bootstrap() {
  // Preview mode (`vite --mode preview`): install Electron / backend / WS mocks
  // before anything renders. Dynamically imported behind the mode check so the
  // whole preview layer is tree-shaken out of normal Electron/production builds.
  if (import.meta.env.MODE === "preview") {
    const { installPreview } = await import("./preview");
    installPreview();
  }

  // Resolve the backend URL from the Electron main process before any
  // component renders — downstream modules rely on `getServerUrl()` being
  // ready. In the browser (dev without Electron) this falls back to the
  // default localhost URL. Render even if resolution fails.
  await initRuntime().catch(() => {});

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrap();

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initRuntime } from "./lib/runtime";
import "./styles/globals.css";

// Resolve the backend URL from the Electron main process before any
// component renders — downstream modules rely on `getServerUrl()` being
// ready. In the browser (dev without Electron) this falls back to the
// default localhost URL.
void initRuntime().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});

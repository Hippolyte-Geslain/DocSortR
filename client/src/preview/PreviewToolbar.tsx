/**
 * Floating dev toolbar for preview mode. Lets you jump between screens, swap
 * the data state (populated / empty / error), and fire a scripted processing
 * run — without a backend or Electron. Inline-styled and theme-independent so
 * it looks the same over both the dark and the light ("Quiet") design systems,
 * and collapses out of the way for clean design screenshots.
 *
 * Preview mode only.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { setDataMode, getDataMode, type DataMode } from "./store";
import { startScriptedRun } from "./ws-mock";

const SCREENS: { label: string; path: string }[] = [
  { label: "Tri", path: "/" },
  { label: "Traitement", path: "/upload" },
  { label: "Historique", path: "/history" },
  { label: "Paramètres", path: "/settings" },
];

const MODES: { label: string; value: DataMode }[] = [
  { label: "Complet", value: "populated" },
  { label: "Vide", value: "empty" },
  { label: "Erreur", value: "error" },
];

function navigate(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const C = {
  panel: "#1b1f27",
  border: "#323a47",
  text: "#e5e9f0",
  textDim: "#9aa4b2",
  accent: "#6aa3ff",
  accentBg: "#28324a",
  chip: "#262c36",
};

const btn: CSSProperties = {
  appearance: "none",
  border: `1px solid ${C.border}`,
  background: C.chip,
  color: C.text,
  borderRadius: 6,
  padding: "5px 9px",
  fontSize: 12,
  lineHeight: 1.1,
  cursor: "pointer",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: C.textDim,
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

export function PreviewToolbar() {
  const [open, setOpen] = useState(true);
  const [path, setPath] = useState(window.location.pathname);
  const mode = getDataMode();

  useEffect(() => {
    const onNav = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const base: CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    zIndex: 2147483647,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    color: C.text,
  };

  if (!open) {
    return (
      <div style={base}>
        <button
          onClick={() => setOpen(true)}
          title="Ouvrir le panneau d'aperçu"
          style={{
            ...btn,
            background: C.panel,
            borderColor: C.border,
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 6px 20px rgba(0,0,0,.35)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 99, background: C.accent }} />
          PREVIEW
        </button>
      </div>
    );
  }

  return (
    <div style={base}>
      <div
        style={{
          width: 232,
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: C.accent }} />
            Aperçu design
          </div>
          <button
            onClick={() => setOpen(false)}
            title="Réduire"
            style={{ ...btn, padding: "2px 7px", background: "transparent", borderColor: "transparent", color: C.textDim }}
          >
            ✕
          </button>
        </div>

        <Group title="Écrans">
          {SCREENS.map((s) => {
            const active = s.path === path;
            return (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                style={{
                  ...btn,
                  background: active ? C.accentBg : C.chip,
                  borderColor: active ? C.accent : C.border,
                  color: active ? C.text : C.textDim,
                }}
              >
                {s.label}
              </button>
            );
          })}
        </Group>

        <Group title="Données">
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <button
                key={m.value}
                onClick={() => {
                  if (m.value === mode) return;
                  setDataMode(m.value);
                  window.location.reload();
                }}
                style={{
                  ...btn,
                  background: active ? C.accentBg : C.chip,
                  borderColor: active ? C.accent : C.border,
                  color: active ? C.text : C.textDim,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </Group>

        <Group title="Action">
          <button
            onClick={() => {
              navigate("/upload");
              setTimeout(startScriptedRun, 60);
            }}
            style={{ ...btn, background: C.accentBg, borderColor: C.accent, width: "100%", padding: "7px 9px" }}
          >
            ▶ Lancer un traitement
          </button>
        </Group>

        <div style={{ marginTop: 10, fontSize: 10, color: C.textDim, lineHeight: 1.4 }}>
          Mode aperçu — sans Electron ni serveur. Données fictives.
        </div>
      </div>
    </div>
  );
}

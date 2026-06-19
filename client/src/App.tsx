import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QuietShell } from "@/components/layout/QuietShell";
import { AuthGate } from "@/components/layout/AuthGate";
import { SelectionPage } from "@/pages/SelectionPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { OnboardingWizard } from "@/pages/OnboardingWizard";

/**
 * Thin wrapper to allow the onboarding flow to navigate after completion.
 * Mode "upload" goes straight to the dashboard upload zone; "discover"
 * also lands on the dashboard but a future coachmark hook can read this
 * via query string.
 */
function CompletedRedirect({ mode }: { mode: "upload" | "discover" | null }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (mode === "upload") navigate("/", { replace: true });
    else if (mode === "discover") navigate("/?tour=1", { replace: true });
  }, [mode, navigate]);
  return null;
}

function App() {
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
  const [completionMode, setCompletionMode] = useState<"upload" | "discover" | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const state = await window.electronAPI?.setupGetState();
        if (cancelled) return;
        setSetupCompleted(Boolean(state?.setupCompleted));
      } catch {
        if (!cancelled) setSetupCompleted(true); // dev fallback: skip wizard
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (setupCompleted === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#FBFAF8" }}
      >
        <div className="animate-pulse" style={{ color: "#5A5650" }}>
          Chargement…
        </div>
      </div>
    );
  }

  if (!setupCompleted) {
    return (
      <OnboardingWizard
        onComplete={(mode) => {
          setCompletionMode(mode);
          setSetupCompleted(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <CompletedRedirect mode={completionMode} />
      <Routes>
        <Route
          path="/"
          element={
            <AuthGate>
              <SelectionPage />
            </AuthGate>
          }
        />
        <Route element={<QuietShell />}>
          <Route path="/upload" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { App };

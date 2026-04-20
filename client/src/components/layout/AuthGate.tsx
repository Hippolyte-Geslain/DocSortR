import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { LoginScreen } from "@/components/auth/LoginScreen";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  useEffect(() => {
    initialize();
    loadSettings();
  }, [initialize, loadSettings]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-pulse text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

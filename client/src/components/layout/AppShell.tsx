import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { LoginScreen } from "@/components/auth/LoginScreen";

export function AppShell() {
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

  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

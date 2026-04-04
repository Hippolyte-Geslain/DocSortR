import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

export function useAuth() {
  const { setToken, setUser, logout, isAuthenticated, user, isLoading } =
    useAuthStore();

  const fetchUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch {
      // Token invalid
    }
  }, [setUser]);

  const loginWithProvider = useCallback(
    async (provider: "google" | "github") => {
      const token = await window.electronAPI?.startOAuth(provider);
      if (token) {
        setToken(token);
        await fetchUser();
      }
    },
    [setToken, fetchUser]
  );

  return {
    loginWithProvider,
    fetchUser,
    logout,
    isAuthenticated,
    user,
    isLoading,
  };
}

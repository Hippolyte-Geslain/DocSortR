import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getServerUrl } from "@/lib/runtime";

export function useAuth() {
  const { setToken, setUser, logout, isAuthenticated, user, isLoading } =
    useAuthStore();

  const fetchUser = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${getServerUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch {
      // Server not reachable
    }
  }, [setUser]);

  const loginLocal = useCallback(async () => {
    try {
      const response = await fetch(`${getServerUrl()}/auth/local`, {
        method: "POST",
      });
      if (response.ok) {
        const { access_token } = await response.json();
        setToken(access_token);
        await window.electronAPI?.storeToken(access_token);
        await fetchUser(access_token);
      }
    } catch {
      // Server not reachable
    }
  }, [setToken, fetchUser]);

  return {
    loginLocal,
    fetchUser,
    logout,
    isAuthenticated,
    user,
    isLoading,
  };
}

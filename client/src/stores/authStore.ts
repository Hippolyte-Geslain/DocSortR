import { create } from "zustand";
import { SERVER_URL } from "@/lib/constants";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    provider: string;
  } | null;
  isLoading: boolean;

  setToken: (token: string) => void;
  setUser: (user: AuthState["user"]) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  token: null,
  isAuthenticated: false,
  user: null,
  isLoading: true,

  setToken: (token) => set({ token, isAuthenticated: true }),

  setUser: (user) => set({ user }),

  logout: () => {
    window.electronAPI?.clearToken();
    set({ token: null, isAuthenticated: false, user: null });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initialize: async () => {
    try {
      // Try stored token first
      const storedToken = await window.electronAPI?.getStoredToken();
      if (storedToken) {
        const res = await fetch(`${SERVER_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const user = await res.json();
          set({ token: storedToken, isAuthenticated: true, user });
          return;
        }
      }

      // Auto-login with local endpoint
      const res = await fetch(`${SERVER_URL}/auth/local`, { method: "POST" });
      if (res.ok) {
        const { access_token } = await res.json();
        await window.electronAPI?.storeToken(access_token);
        const meRes = await fetch(`${SERVER_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const user = meRes.ok ? await meRes.json() : null;
        set({ token: access_token, isAuthenticated: true, user });
      }
    } catch {
      // Server not running yet — user will see login screen
    } finally {
      set({ isLoading: false });
    }
  },
}));

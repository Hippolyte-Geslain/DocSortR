import { create } from "zustand";

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

export const useAuthStore = create<AuthState>((set, get) => ({
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
      const token = await window.electronAPI?.getStoredToken();
      if (token) {
        set({ token, isAuthenticated: true });
      }
    } catch {
      // No stored token
    } finally {
      set({ isLoading: false });
    }
  },
}));

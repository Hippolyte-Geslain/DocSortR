import { SERVER_URL } from "./constants";
import { useAuthStore } from "@/stores/authStore";

async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error("Unauthorized");
  }

  return response;
}

export const api = {
  get: (path: string) => fetchWithAuth(path),
  post: (path: string, body?: unknown) =>
    fetchWithAuth(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string) => fetchWithAuth(path, { method: "DELETE" }),
  upload: (path: string, formData: FormData) =>
    fetchWithAuth(path, { method: "POST", body: formData }),
};

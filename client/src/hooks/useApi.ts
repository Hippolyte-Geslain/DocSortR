import { useCallback } from "react";
import { api } from "@/lib/api";

export function useApi() {
  const uploadFiles = useCallback(async (files: File[], sessionId?: string) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    if (sessionId) formData.append("session_id", sessionId);
    const response = await api.upload("/documents/upload", formData);
    return response.json();
  }, []);

  const confirmDocument = useCallback(
    async (docId: string, data: { document_type: string; date?: string; client_name?: string }) => {
      const response = await api.post(`/documents/${docId}/confirm`, data);
      return response.json();
    },
    []
  );

  const rejectDocument = useCallback(async (docId: string) => {
    const response = await api.post(`/documents/${docId}/reject`);
    return response.json();
  }, []);

  const getSessions = useCallback(async () => {
    const response = await api.get("/sessions");
    return response.json();
  }, []);

  const getSession = useCallback(async (sessionId: string) => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.json();
  }, []);

  return { uploadFiles, confirmDocument, rejectDocument, getSessions, getSession };
}

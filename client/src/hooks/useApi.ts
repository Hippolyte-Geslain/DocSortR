import { useCallback } from "react";
import { api } from "@/lib/api";

export interface ClientSummary {
  name: string | null;
  archived_count: number;
  inbox_count: number;
}

export interface DocumentRow {
  id: string;
  original_filename: string;
  file_extension: string;
  status: string;
  document_type: string | null;
  document_date: string | null;
  client_name: string | null;
  confidence_score: number | null;
  summary: string | null;
  final_path: string | null;
  custom_filename: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

const UNCLASSIFIED_SENTINEL = "__unclassified__";

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

  const getClients = useCallback(async (): Promise<ClientSummary[]> => {
    const response = await api.get("/clients");
    return response.json();
  }, []);

  const getDocumentsForClient = useCallback(
    async (
      clientName: string | null,
      status = "needs_review"
    ): Promise<DocumentRow[]> => {
      const params = new URLSearchParams({ status });
      params.set("client_name", clientName === null ? UNCLASSIFIED_SENTINEL : clientName);
      const response = await api.get(`/documents?${params}`);
      return response.json();
    },
    []
  );

  const getDocuments = useCallback(
    async (status = "needs_review"): Promise<DocumentRow[]> => {
      const response = await api.get(`/documents?status=${encodeURIComponent(status)}`);
      return response.json();
    },
    []
  );

  return {
    uploadFiles,
    confirmDocument,
    rejectDocument,
    getSessions,
    getSession,
    getClients,
    getDocumentsForClient,
    getDocuments,
  };
}

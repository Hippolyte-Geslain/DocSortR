// Shared API types between client and server

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: "google" | "github";
  created_at: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string;
}

export interface ClassificationResult {
  document_type: string;
  date: string | null;
  client_name: string | null;
  confidence_score: number;
  summary: string;
}

export interface DocumentResponse {
  id: string;
  original_filename: string;
  file_extension: string;
  status: DocumentStatus;
  document_type: string | null;
  document_date: string | null;
  client_name: string | null;
  confidence_score: number | null;
  summary: string | null;
  final_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus =
  | "pending"
  | "ocr"
  | "llm"
  | "needs_review"
  | "archived"
  | "rejected"
  | "error";

export interface DocumentConfirm {
  document_type: string;
  date?: string | null;
  client_name?: string | null;
}

export interface UploadResponse {
  session_id: string;
  accepted: string[];
  rejected: { filename: string; reason: string }[];
}

export interface SessionResponse {
  id: string;
  name: string | null;
  status: "active" | "completed";
  created_at: string;
  completed_at: string | null;
  document_count: number;
}

export interface SessionDetailResponse extends SessionResponse {
  documents: DocumentResponse[];
}

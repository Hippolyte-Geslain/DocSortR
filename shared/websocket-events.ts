// WebSocket event types

export type WSServerEvent =
  | WSProcessingUpdate
  | WSClassificationReady
  | WSErrorEvent
  | WSPong;

export type WSClientEvent = WSPing;

export interface WSProcessingUpdate {
  type: "processing_update";
  session_id: string;
  document_id: string;
  filename: string;
  step: "ocr" | "llm" | "review";
}

export interface WSClassificationReady {
  type: "classification_ready";
  session_id: string;
  document_id: string;
  filename: string;
  classification: {
    document_type: string;
    date: string | null;
    client_name: string | null;
    confidence_score: number;
    summary: string;
  };
}

export interface WSErrorEvent {
  type: "error";
  session_id: string;
  document_id: string;
  filename: string;
  message: string;
}

export interface WSPing {
  type: "ping";
}

export interface WSPong {
  type: "pong";
}

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { SERVER_URL } from "@/lib/constants";

export function useWebSocket() {
  const token = useAuthStore((s) => s.token);
  const updateDocument = useAppStore((s) => s.updateDocument);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = SERVER_URL.replace(/^http/, "ws") + `/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "processing_update":
          updateDocument(data.document_id, { status: data.step });
          break;
        case "classification_ready":
          updateDocument(data.document_id, {
            status: "needs_review",
            documentType: data.classification.document_type,
            date: data.classification.date,
            clientName: data.classification.client_name,
            confidence: data.classification.confidence_score,
            summary: data.classification.summary,
          });
          break;
        case "error":
          updateDocument(data.document_id, {
            status: "error",
            errorMessage: data.message,
          });
          break;
      }
    };

    ws.onclose = (event) => {
      clearInterval(pingIntervalRef.current);
      if (event.code !== 4001) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    };
  }, [token, updateDocument]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      clearInterval(pingIntervalRef.current);
      wsRef.current?.close();
    };
  }, [connect]);
}

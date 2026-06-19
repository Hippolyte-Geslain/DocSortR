/**
 * Replaces `window.WebSocket` with a stand-in that ONLY mocks connections to
 * the DocSortR backend. Every other socket (critically, Vite's HMR socket on
 * the dev-server port) is delegated to the native WebSocket, so hot-reload
 * keeps working.
 *
 * Also exposes `startScriptedRun()` to animate the processing feed by driving
 * the app store through a realistic OCR → LLM → ready timeline.
 *
 * Preview mode only.
 */
import { useAppStore, type ProcessingDocument } from "@/stores/appStore";

const NativeWebSocket = window.WebSocket;

/** Mock only the backend socket (port 8000 or a `/ws` path). */
function shouldMock(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.port === "8000" || u.pathname.includes("/ws");
  } catch {
    return false;
  }
}

class PreviewWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url = "";
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    // Pass non-backend sockets (Vite HMR, etc.) straight to the real impl.
    if (!shouldMock(url)) {
      return new NativeWebSocket(url, protocols) as unknown as PreviewWebSocket;
    }
    this.url = url;
    setTimeout(() => {
      this.readyState = this.OPEN;
      this.onopen?.(new Event("open"));
    }, 0);
  }

  send(): void {
    /* no-op: backend never receives anything in preview */
  }

  close(): void {
    // Don't fire onclose — avoids the reconnect loop in useWebSocket.
    this.readyState = this.CLOSED;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
}

export function installWebSocketMock(): void {
  window.WebSocket = PreviewWebSocket as unknown as typeof WebSocket;
}

// --- Scripted processing demo ---------------------------------------------

interface DemoDoc {
  id: string;
  filename: string;
  documentType: string;
  confidence: number;
  summary: string;
}

const DEMO_DOCS: DemoDoc[] = [
  {
    id: "demo-1",
    filename: "Facture_Orange_juin.pdf",
    documentType: "Facture",
    confidence: 0.95,
    summary: "Facture téléphonie — 39,99 € TTC.",
  },
  {
    id: "demo-2",
    filename: "Bulletin_paie_06_2026.pdf",
    documentType: "Bulletin de Paie",
    confidence: 0.91,
    summary: "Bulletin de paie de juin 2026.",
  },
  {
    id: "demo-3",
    filename: "scan_releve_banque.jpg",
    documentType: "Relevé Bancaire",
    confidence: 0.67,
    summary: "Relevé de compte, juin 2026.",
  },
];

const STEP_MS = 700;
const DOC_STAGGER_MS = 900;

/**
 * Seeds the app store with pending docs then walks each through
 * pending → ocr → llm → needs_review, matching the real WS-driven UI.
 */
export function startScriptedRun(): void {
  const app = useAppStore.getState();
  app.clearDocuments();
  app.setProcessing(true);

  const pending: ProcessingDocument[] = DEMO_DOCS.map((d) => ({
    id: d.id,
    filename: d.filename,
    status: "pending",
  }));
  app.addDocuments(pending);

  DEMO_DOCS.forEach((d, i) => {
    const base = i * DOC_STAGGER_MS;

    setTimeout(() => {
      const s = useAppStore.getState();
      s.updateDocument(d.id, { status: "ocr" });
      s.setActiveStep({
        documentId: d.id,
        filename: d.filename,
        step: "ocr",
        detail: "Extraction du texte",
        startedAt: Date.now(),
      });
    }, base + STEP_MS);

    setTimeout(() => {
      const s = useAppStore.getState();
      s.updateDocument(d.id, { status: "llm" });
      s.setActiveStep({
        documentId: d.id,
        filename: d.filename,
        step: "llm",
        detail: "Classification IA",
        startedAt: Date.now(),
      });
    }, base + STEP_MS * 2);

    setTimeout(() => {
      const s = useAppStore.getState();
      s.updateDocument(d.id, {
        status: "needs_review",
        documentType: d.documentType,
        confidence: d.confidence,
        summary: d.summary,
      });
      s.setActiveStep(null);
      s.bumpLastUpdate();
    }, base + STEP_MS * 3);
  });

  const total = (DEMO_DOCS.length - 1) * DOC_STAGGER_MS + STEP_MS * 3 + 400;
  setTimeout(() => {
    const s = useAppStore.getState();
    s.setProcessing(false);
    s.markSessionCompleted();
  }, total);
}

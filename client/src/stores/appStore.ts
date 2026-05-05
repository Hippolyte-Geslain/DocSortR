import { create } from "zustand";

export type ProcessingStatus =
  | "pending"
  | "ocr"
  | "llm"
  | "needs_review"
  | "archived"
  | "rejected"
  | "error";

export interface ProcessingDocument {
  id: string;
  filename: string;
  status: ProcessingStatus;
  documentType?: string;
  date?: string;
  clientName?: string;
  confidence?: number;
  summary?: string;
  errorMessage?: string;
}

export interface ActiveStep {
  documentId: string;
  filename: string;
  step: "ocr" | "llm";
  detail?: string;
  startedAt: number;
}

interface AppState {
  currentSessionId: string | null;
  documents: ProcessingDocument[];
  isProcessing: boolean;
  activeStep: ActiveStep | null;
  sessionCompleted: boolean;
  /** Bumped whenever a WS event might have changed server-side state
   * that other views (e.g. SelectionPage) need to refetch. */
  lastUpdate: number;

  setSessionId: (id: string | null) => void;
  addDocuments: (docs: ProcessingDocument[]) => void;
  updateDocument: (id: string, updates: Partial<ProcessingDocument>) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  setProcessing: (processing: boolean) => void;
  setActiveStep: (step: ActiveStep | null) => void;
  markSessionCompleted: () => void;
  bumpLastUpdate: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSessionId: null,
  documents: [],
  isProcessing: false,
  activeStep: null,
  sessionCompleted: false,
  lastUpdate: 0,

  setSessionId: (currentSessionId) =>
    set({ currentSessionId, sessionCompleted: false }),
  addDocuments: (docs) =>
    set((state) => ({
      documents: [...state.documents, ...docs],
      sessionCompleted: false,
    })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    })),
  clearDocuments: () =>
    set({
      documents: [],
      currentSessionId: null,
      activeStep: null,
      sessionCompleted: false,
    }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setActiveStep: (activeStep) => set({ activeStep }),
  markSessionCompleted: () =>
    set((state) => ({
      sessionCompleted: true,
      activeStep: null,
      lastUpdate: state.lastUpdate + 1,
    })),
  bumpLastUpdate: () => set((state) => ({ lastUpdate: state.lastUpdate + 1 })),
}));

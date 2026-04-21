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

  setSessionId: (id: string | null) => void;
  addDocuments: (docs: ProcessingDocument[]) => void;
  updateDocument: (id: string, updates: Partial<ProcessingDocument>) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  setProcessing: (processing: boolean) => void;
  setActiveStep: (step: ActiveStep | null) => void;
  markSessionCompleted: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSessionId: null,
  documents: [],
  isProcessing: false,
  activeStep: null,
  sessionCompleted: false,

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
  markSessionCompleted: () => set({ sessionCompleted: true, activeStep: null }),
}));

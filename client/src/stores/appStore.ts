import { create } from "zustand";

export interface ProcessingDocument {
  id: string;
  filename: string;
  status: "pending" | "ocr" | "llm" | "needs_review" | "archived" | "rejected" | "error";
  documentType?: string;
  date?: string;
  clientName?: string;
  confidence?: number;
  summary?: string;
  errorMessage?: string;
}

interface AppState {
  currentSessionId: string | null;
  documents: ProcessingDocument[];
  isProcessing: boolean;

  setSessionId: (id: string | null) => void;
  addDocuments: (docs: ProcessingDocument[]) => void;
  updateDocument: (id: string, updates: Partial<ProcessingDocument>) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
  setProcessing: (processing: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentSessionId: null,
  documents: [],
  isProcessing: false,

  setSessionId: (currentSessionId) => set({ currentSessionId }),
  addDocuments: (docs) =>
    set((state) => ({ documents: [...state.documents, ...docs] })),
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
  clearDocuments: () => set({ documents: [], currentSessionId: null }),
  setProcessing: (isProcessing) => set({ isProcessing }),
}));

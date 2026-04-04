import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { FolderPicker } from "@/components/upload/FolderPicker";
import { DropZone } from "@/components/upload/DropZone";
import { FileList } from "@/components/upload/FileList";
import { SortOptions } from "@/components/upload/SortOptions";
import { ProcessingFeed } from "@/components/processing/ProcessingFeed";
import { ReviewModal } from "@/components/review/ReviewModal";
import { useAppStore, type ProcessingDocument } from "@/stores/appStore";
import { useApi } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ALLOWED_EXTENSIONS } from "@/lib/constants";

export function DashboardPage() {
  useWebSocket();

  const [files, setFiles] = useState<File[]>([]);
  const [sortBy, setSortBy] = useState<string[]>(["date", "type"]);
  const [reviewDoc, setReviewDoc] = useState<ProcessingDocument | null>(null);

  const { addDocuments, setSessionId, setProcessing, isProcessing, updateDocument } =
    useAppStore();
  const { uploadFiles, confirmDocument, rejectDocument } = useApi();

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const response = await uploadFiles(files);
      setSessionId(response.session_id);

      // Add placeholder docs — WS updates will fill in real IDs
      const placeholders: ProcessingDocument[] = response.accepted.map(
        (filename: string, idx: number) => ({
          id: `pending-${Date.now()}-${idx}`,
          filename,
          status: "pending" as const,
        })
      );
      addDocuments(placeholders);
      setFiles([]);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = useCallback(
    async (
      docId: string,
      data: { document_type: string; date?: string; client_name?: string }
    ) => {
      try {
        await confirmDocument(docId, data);
        updateDocument(docId, { status: "archived" });
      } catch (err) {
        console.error("Confirm failed:", err);
      }
    },
    [confirmDocument, updateDocument]
  );

  const handleReject = useCallback(
    async (docId: string) => {
      try {
        await rejectDocument(docId);
        updateDocument(docId, { status: "rejected" });
      } catch (err) {
        console.error("Reject failed:", err);
      }
    },
    [rejectDocument, updateDocument]
  );

  return (
    <>
      <Header title="Traitement">
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isProcessing}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isProcessing ? "Envoi…" : "Envoyer"}
        </button>
      </Header>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <FolderPicker onFolderSelected={() => {}} />
        <DropZone
          onFilesSelected={handleFilesSelected}
          allowedExtensions={ALLOWED_EXTENSIONS}
        />
        <FileList files={files} onRemove={handleRemoveFile} />
        <SortOptions selected={sortBy} onChange={setSortBy} />
        <ProcessingFeed onReview={setReviewDoc} />
      </div>

      {reviewDoc && (
        <ReviewModal
          doc={reviewDoc}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onClose={() => setReviewDoc(null)}
        />
      )}
    </>
  );
}

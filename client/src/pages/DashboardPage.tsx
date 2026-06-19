import { useState, useCallback } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { FolderPicker } from "@/components/upload/FolderPicker";
import { DropZone } from "@/components/upload/DropZone";
import { FileList } from "@/components/upload/FileList";
import { SortOptions } from "@/components/upload/SortOptions";
import { ProcessingFeed } from "@/components/processing/ProcessingFeed";
import { ProcessingStatusBar } from "@/components/processing/ProcessingStatusBar";
import { ReviewModal } from "@/components/review/ReviewModal";
import { useAppStore, type ProcessingDocument } from "@/stores/appStore";
import { useApi } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDepsHealth, isAllHealthy } from "@/hooks/useDepsHealth";
import { ALLOWED_EXTENSIONS } from "@/lib/constants";

export function DashboardPage() {
  useWebSocket();

  const [files, setFiles] = useState<File[]>([]);
  const [sortBy, setSortBy] = useState<string[]>(["date", "type"]);
  const [reviewDoc, setReviewDoc] = useState<ProcessingDocument | null>(null);

  const { addDocuments, setSessionId, setProcessing, isProcessing, updateDocument } =
    useAppStore();
  const { uploadFiles, confirmDocument, rejectDocument } = useApi();
  const deps = useDepsHealth(15000);
  const depsHealthy = isAllHealthy(deps);
  const ollamaDown = deps !== null && deps.ollama_reachable === false;
  const modelMissing = deps !== null && deps.model_present === false;
  const blockUpload = ollamaDown || modelMissing;

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

      const placeholders: ProcessingDocument[] = response.accepted.map(
        (d: { id: string; filename: string }) => ({
          id: d.id,
          filename: d.filename,
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
      <div className="ds-page-head">
        <h1>Traitement</h1>
        <div className="ds-page-head-actions">
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isProcessing || blockUpload}
            title={
              blockUpload
                ? ollamaDown
                  ? "Le moteur IA local est arrêté"
                  : "Le modèle IA est introuvable"
                : undefined
            }
            className="ds-btn-primary"
          >
            <Send className="w-4 h-4" />
            {isProcessing ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </div>

      <div className="ds-page">
        <ProcessingStatusBar />
        {!depsHealthy && deps !== null && blockUpload && (
          <div className="ds-alert">
            <AlertTriangle className="lead" />
            <div>
              <p className="ds-alert-title">
                {ollamaDown
                  ? "Moteur IA local indisponible"
                  : "Modèle IA introuvable"}
              </p>
              <p className="ds-alert-text">
                {ollamaDown
                  ? "Ollama est arrêté. Les uploads sont désactivés tant que le service n'est pas redémarré."
                  : "Le modèle configuré n'est pas installé. Ouvrez Paramètres pour le télécharger."}
              </p>
            </div>
          </div>
        )}
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

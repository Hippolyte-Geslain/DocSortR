import { Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import type { ProcessingDocument } from "@/stores/appStore";

interface ProcessingCardProps {
  doc: ProcessingDocument;
  onReview: (doc: ProcessingDocument) => void;
}

const statusConfig = {
  pending: { icon: Loader2, label: "En attente", color: "text-gray-400", spin: false },
  ocr: { icon: Loader2, label: "OCR en cours", color: "text-yellow-400", spin: true },
  llm: { icon: Loader2, label: "Classification IA", color: "text-blue-400", spin: true },
  needs_review: { icon: FileText, label: "À vérifier", color: "text-accent-400", spin: false },
  archived: { icon: CheckCircle2, label: "Archivé", color: "text-green-400", spin: false },
  rejected: { icon: AlertCircle, label: "Rejeté", color: "text-gray-500", spin: false },
  error: { icon: AlertCircle, label: "Erreur", color: "text-red-400", spin: false },
} as const;

export function ProcessingCard({ doc, onReview }: ProcessingCardProps) {
  const config = statusConfig[doc.status];
  const Icon = config.icon;

  return (
    <div
      className={`card flex items-center gap-4 ${
        doc.status === "needs_review"
          ? "cursor-pointer hover:border-accent-500 border border-transparent"
          : ""
      }`}
      onClick={() => doc.status === "needs_review" && onReview(doc)}
    >
      <Icon
        className={`w-5 h-5 ${config.color} shrink-0 ${
          config.spin ? "animate-spin" : ""
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.filename}</p>
        <p className={`text-xs ${config.color}`}>{config.label}</p>
        {doc.documentType && (
          <p className="text-xs text-gray-400 mt-0.5">
            {doc.documentType}
            {doc.confidence != null
              ? ` (${Math.round(doc.confidence * 100)}%)`
              : ""}
          </p>
        )}
        {doc.errorMessage && (
          <p className="text-xs text-red-400 mt-0.5 truncate">{doc.errorMessage}</p>
        )}
      </div>
    </div>
  );
}

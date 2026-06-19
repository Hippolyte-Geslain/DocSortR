import { Loader2, CheckCircle2, AlertCircle, FileText, Clock } from "lucide-react";
import type { ProcessingDocument } from "@/stores/appStore";

const statusConfig = {
  pending: { icon: Clock, label: "En attente", color: "var(--fg-4)", spin: false },
  ocr: { icon: Loader2, label: "OCR en cours", color: "#C9871F", spin: true },
  llm: { icon: Loader2, label: "Classification IA", color: "#2F6FB0", spin: true },
  needs_review: { icon: FileText, label: "À vérifier", color: "var(--accent)", spin: false },
  archived: { icon: CheckCircle2, label: "Archivé", color: "#3E9D5C", spin: false },
  rejected: { icon: AlertCircle, label: "Rejeté", color: "var(--fg-4)", spin: false },
  error: { icon: AlertCircle, label: "Erreur", color: "#C0492F", spin: false },
} as const;

interface ProcessingCardProps {
  doc: ProcessingDocument;
  onReview: (doc: ProcessingDocument) => void;
}

export function ProcessingCard({ doc, onReview }: ProcessingCardProps) {
  const config = statusConfig[doc.status];
  const Icon = config.icon;
  const actionable = doc.status === "needs_review";

  return (
    <div
      className={`ds-proc-card ${actionable ? "actionable" : ""}`}
      onClick={() => actionable && onReview(doc)}
    >
      <Icon
        className={`ds-proc-ico ${config.spin ? "animate-spin" : ""}`}
        style={{ color: config.color }}
      />
      <div className="ds-proc-main">
        <p className="ds-proc-name">{doc.filename}</p>
        <p className="ds-proc-status" style={{ color: config.color }}>
          {config.label}
        </p>
        {doc.documentType && (
          <p className="ds-proc-sub">
            {doc.documentType}
            {doc.confidence != null
              ? ` (${Math.round(doc.confidence * 100)}%)`
              : ""}
          </p>
        )}
        {doc.errorMessage && <p className="ds-proc-err">{doc.errorMessage}</p>}
      </div>
    </div>
  );
}

import { useState } from "react";
import { X, Check, Ban } from "lucide-react";
import type { ProcessingDocument } from "@/stores/appStore";
import { DOCUMENT_TYPES } from "@/lib/constants";

interface ReviewModalProps {
  doc: ProcessingDocument;
  onConfirm: (
    docId: string,
    data: { document_type: string; date?: string; client_name?: string }
  ) => void;
  onReject: (docId: string) => void;
  onClose: () => void;
}

export function ReviewModal({ doc, onConfirm, onReject, onClose }: ReviewModalProps) {
  const [docType, setDocType] = useState(doc.documentType || "");
  const [date, setDate] = useState(doc.date || "");
  const [clientName, setClientName] = useState(doc.clientName || "");

  const handleConfirm = () => {
    if (!docType) return;
    onConfirm(doc.id, {
      document_type: docType,
      date: date || undefined,
      client_name: clientName || undefined,
    });
    onClose();
  };

  const handleReject = () => {
    onReject(doc.id);
    onClose();
  };

  return (
    <div
      className="ds-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ds-modal">
        <div className="ds-modal-head">
          <h2 className="ds-modal-title">Vérifier le document</h2>
          <button className="ds-iconbtn" onClick={onClose} aria-label="Fermer">
            <X />
          </button>
        </div>

        <div className="ds-modal-meta">
          <p className="ds-modal-meta-name">{doc.filename}</p>
          {doc.summary && <p className="ds-modal-meta-sub">{doc.summary}</p>}
          {doc.documentType && doc.confidence != null && (
            <p className="ds-modal-meta-sub">
              Confiance : {Math.round(doc.confidence * 100)}%
            </p>
          )}
        </div>

        <div className="ds-modal-form">
          <div className="ds-field">
            <label className="ds-label">
              Type de document <span className="ds-req">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="ds-input"
            >
              <option value="">-- Sélectionner --</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="ds-field">
            <label className="ds-label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="ds-input"
            />
          </div>

          <div className="ds-field">
            <label className="ds-label">Client / Nom</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom du client ou de l'entreprise"
              className="ds-input"
            />
          </div>
        </div>

        <div className="ds-modal-actions">
          <button className="ds-btn-secondary" onClick={handleReject}>
            <Ban className="w-4 h-4" />
            Rejeter
          </button>
          <button
            className="ds-btn-primary"
            onClick={handleConfirm}
            disabled={!docType}
          >
            <Check className="w-4 h-4" />
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

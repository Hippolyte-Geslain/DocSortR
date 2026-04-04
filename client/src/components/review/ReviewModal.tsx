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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card max-w-lg w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vérifier le document</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-dark-700 rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium">{doc.filename}</p>
          {doc.summary && (
            <p className="text-xs text-gray-400">{doc.summary}</p>
          )}
          {doc.confidence != null && (
            <p className="text-xs text-gray-400">
              Confiance : {Math.round(doc.confidence * 100)}%
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Type de document <span className="text-red-400">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            >
              <option value="">-- Sélectionner --</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Client / Nom
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom du client ou de l'entreprise"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-500"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleReject}
            className="btn-secondary flex items-center gap-2 flex-1 justify-center"
          >
            <Ban className="w-4 h-4" />
            Rejeter
          </button>
          <button
            onClick={handleConfirm}
            disabled={!docType}
            className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

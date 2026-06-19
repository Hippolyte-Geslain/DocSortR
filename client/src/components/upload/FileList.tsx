import { File, X } from "lucide-react";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="ds-card">
      <h3 className="ds-section-label">
        {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné
        {files.length > 1 ? "s" : ""}
      </h3>
      <div className="ds-modal-list">
        {files.map((file, idx) => (
          <div key={`${file.name}-${idx}`} className="ds-file-row">
            <File className="lead" />
            <span className="ds-file-name">{file.name}</span>
            <span className="ds-file-size">{(file.size / 1024).toFixed(0)} Ko</span>
            <button
              className="ds-file-x"
              onClick={() => onRemove(idx)}
              aria-label="Retirer le fichier"
            >
              <X />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

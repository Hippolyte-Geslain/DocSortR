import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  allowedExtensions: string[];
}

export function DropZone({ onFilesSelected, allowedExtensions }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        allowedExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected, allowedExtensions]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesSelected(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`ds-dropzone ${isDragging ? "drag" : ""}`}
    >
      <label className="ds-dropzone-label">
        <Upload />
        <p className="ds-dropzone-title">Glissez vos fichiers ici</p>
        <p className="ds-dropzone-sub">
          ou cliquez pour parcourir ({allowedExtensions.join(", ")})
        </p>
        <input
          type="file"
          multiple
          accept={allowedExtensions.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />
      </label>
    </div>
  );
}

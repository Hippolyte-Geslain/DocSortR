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
      className={`card border-2 border-dashed transition-colors ${
        isDragging
          ? "border-accent-500 bg-accent-500/10"
          : "border-dark-600 hover:border-dark-500"
      }`}
    >
      <label className="flex flex-col items-center justify-center py-12 cursor-pointer">
        <Upload className="w-10 h-10 text-gray-400 mb-3" />
        <p className="font-medium">Glissez vos fichiers ici</p>
        <p className="text-sm text-gray-400 mt-1">
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

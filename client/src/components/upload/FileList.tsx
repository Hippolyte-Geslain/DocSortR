import { File, X } from "lucide-react";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="card space-y-2">
      <h3 className="text-sm font-medium text-gray-400">
        {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné
        {files.length > 1 ? "s" : ""}
      </h3>
      <ul className="space-y-1">
        {files.map((file, idx) => (
          <li
            key={`${file.name}-${idx}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-700"
          >
            <File className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm truncate flex-1">{file.name}</span>
            <span className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(0)} Ko
            </span>
            <button
              onClick={() => onRemove(idx)}
              className="p-1 hover:bg-dark-600 rounded"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

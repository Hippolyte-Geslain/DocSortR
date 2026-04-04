import { useState } from "react";
import { FolderOpen } from "lucide-react";

interface FolderPickerProps {
  onFolderSelected: (path: string) => void;
}

export function FolderPicker({ onFolderSelected }: FolderPickerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleSelect = async () => {
    const path = await window.electronAPI?.selectFolder();
    if (path) {
      setSelectedPath(path);
      onFolderSelected(path);
    }
  };

  return (
    <div className="card">
      <button
        onClick={handleSelect}
        className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-dark-600 rounded-lg hover:border-accent-500 hover:bg-accent-500/5 transition-colors"
      >
        <FolderOpen className="w-8 h-8 text-accent-500" />
        <div className="text-left">
          <p className="font-medium">
            {selectedPath ? selectedPath : "Sélectionner un dossier"}
          </p>
          <p className="text-sm text-gray-400">
            {selectedPath
              ? "Cliquez pour changer"
              : "Choisissez le dossier contenant vos documents"}
          </p>
        </div>
      </button>
    </div>
  );
}

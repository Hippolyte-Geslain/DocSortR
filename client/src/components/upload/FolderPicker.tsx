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
    <button onClick={handleSelect} className="ds-folderpick">
      <FolderOpen />
      <div>
        <p className="ds-folderpick-title">
          {selectedPath ? selectedPath : "Sélectionner un dossier"}
        </p>
        <p className="ds-folderpick-sub">
          {selectedPath
            ? "Cliquez pour changer"
            : "Choisissez le dossier contenant vos documents"}
        </p>
      </div>
    </button>
  );
}

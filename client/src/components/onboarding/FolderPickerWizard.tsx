import { useState } from "react";
import { FolderOpen, CheckCircle, AlertTriangle } from "lucide-react";

interface FolderPickerWizardProps {
  initialPath?: string | null;
  onFolderSelected: (path: string) => Promise<void> | void;
  probeResult: FolderProbeResult | null;
  isProbing: boolean;
}

export function FolderPickerWizard({
  initialPath,
  onFolderSelected,
  probeResult,
  isProbing,
}: FolderPickerWizardProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialPath ?? null
  );

  const handleSelect = async () => {
    const picked = await window.electronAPI?.selectFolder();
    if (picked) {
      setSelectedPath(picked);
      await onFolderSelected(picked);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSelect}
        className="card w-full flex items-center gap-4 py-6 border-2 border-dashed border-dark-600 hover:border-accent-500 hover:bg-accent-500/5 transition-colors"
      >
        <FolderOpen className="w-8 h-8 text-accent-500 shrink-0" />
        <div className="text-left flex-1 min-w-0">
          <p className="font-medium truncate">
            {selectedPath ?? "Choisir un dossier…"}
          </p>
          <p className="text-sm text-gray-400">
            {selectedPath
              ? "Cliquer pour changer"
              : "DocSortR créera des sous-dossiers par client, type et année"}
          </p>
        </div>
      </button>

      {selectedPath && (
        <div className="card bg-dark-800/50">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Aperçu de l'arborescence
          </p>
          <pre className="text-xs font-mono text-gray-400 leading-relaxed">
{`${selectedPath}\\
├── Acme SARL\\
│   ├── Factures\\
│   │   └── 2026\\
│   │       └── facture_123.pdf
│   └── Contrats\\
│       └── 2025\\
└── Durand SAS\\
    └── Devis\\
        └── 2026\\`}
          </pre>
        </div>
      )}

      {isProbing && (
        <p className="text-sm text-gray-400 animate-pulse">
          Vérification du dossier…
        </p>
      )}

      {probeResult && !isProbing && (
        <div
          className={`flex items-start gap-3 p-3 rounded-lg ${
            probeResult.ok
              ? "bg-green-500/10 text-green-300"
              : "bg-red-500/10 text-red-300"
          }`}
        >
          {probeResult.ok ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="text-sm">
            {probeResult.ok ? (
              <p>Dossier accessible en écriture et en renommage.</p>
            ) : (
              <p>
                {probeResult.error ??
                  "Ce dossier n'est pas accessible. Choisissez un autre emplacement."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

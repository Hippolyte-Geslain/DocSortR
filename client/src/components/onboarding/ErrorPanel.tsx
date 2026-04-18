import { AlertTriangle, RefreshCw, LifeBuoy } from "lucide-react";

interface ErrorPanelProps {
  message: string;
  onRetry?: () => void;
  helpHref?: string;
}

export function ErrorPanel({ message, onRetry, helpHref }: ErrorPanelProps) {
  const mailto =
    helpHref ??
    `mailto:support@docsortr.local?subject=${encodeURIComponent(
      "DocSortR — besoin d'aide à l'installation"
    )}&body=${encodeURIComponent(
      `Bonjour,\n\nJ'ai rencontré une erreur pendant l'installation :\n\n${message}\n\n(Merci de joindre les derniers journaux situés dans %APPDATA%\\DocSortR\\logs\\)`
    )}`;

  const openHelp = () => {
    window.electronAPI?.openExternal(mailto);
  };

  return (
    <div className="card border-red-500/30 bg-red-500/5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-300">Quelque chose s'est mal passé</h3>
          <p className="text-sm text-gray-300 mt-1">{message}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        )}
        <button
          onClick={openHelp}
          className="btn-secondary flex items-center gap-2"
        >
          <LifeBuoy className="w-4 h-4" />
          Obtenir de l'aide
        </button>
      </div>
    </div>
  );
}

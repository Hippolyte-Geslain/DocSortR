import { CheckCircle, Upload, Compass } from "lucide-react";

interface FinalCTAProps {
  userName: string;
  onDragFirst: () => void;
  onDiscover: () => void;
}

export function FinalCTA({ userName, onDragFirst, onDiscover }: FinalCTAProps) {
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center animate-in fade-in zoom-in duration-500">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Tout est prêt, {userName}.</h2>
        <p className="text-gray-400">
          DocSortR est configuré et attend vos premiers documents.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onDragFirst}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Glisser mes premiers documents
        </button>
        <button
          onClick={onDiscover}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <Compass className="w-5 h-5" />
          Découvrir l'interface
        </button>
      </div>
    </div>
  );
}

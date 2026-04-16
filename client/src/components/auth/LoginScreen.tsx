import { FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function LoginScreen() {
  const { loginLocal, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4">
      <div className="card max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-10 h-10 text-accent-500" />
            <h1 className="text-3xl font-bold">DocSortR</h1>
          </div>
          <p className="text-gray-400">
            Tri et archivage automatique de documents
          </p>
        </div>

        <button
          onClick={loginLocal}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-accent-500 text-white px-4 py-3 rounded-lg hover:bg-accent-600 transition-colors font-medium disabled:opacity-50"
        >
          {isLoading ? "Connexion..." : "Démarrer"}
        </button>

        <p className="text-xs text-gray-500">
          Application locale — aucune connexion internet requise.
        </p>
      </div>
    </div>
  );
}

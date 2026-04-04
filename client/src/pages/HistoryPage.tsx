import { useEffect, useState } from "react";
import { Clock, FileText } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useApi } from "@/hooks/useApi";

interface Session {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  document_count: number;
}

export function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getSessions } = useApi();

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [getSessions]);

  return (
    <>
      <Header title="Historique" />
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="text-center text-gray-400 py-12 animate-pulse">
            Chargement…
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Aucune session de traitement</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="card flex items-center gap-4">
                <FileText className="w-5 h-5 text-accent-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {session.name ||
                      `Session du ${new Date(session.created_at).toLocaleDateString(
                        "fr-FR"
                      )}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.document_count} document
                    {session.document_count > 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    session.status === "completed"
                      ? "bg-green-500/10 text-green-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}
                >
                  {session.status === "completed" ? "Terminé" : "En cours"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

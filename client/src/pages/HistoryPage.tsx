import { useEffect, useState } from "react";
import { Clock, FileText } from "lucide-react";
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
      <div className="ds-page-head">
        <h1>Historique</h1>
      </div>
      <div className="ds-page">
        {isLoading ? (
          <div className="ds-page-empty">
            <p>Chargement…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="ds-page-empty">
            <Clock />
            <p>Aucune session de traitement</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="ds-row">
              <FileText className="lead" />
              <div className="ds-row-main">
                <div className="ds-row-title">
                  {session.name ||
                    `Session du ${new Date(session.created_at).toLocaleDateString(
                      "fr-FR"
                    )}`}
                </div>
                <div className="ds-row-sub">
                  {session.document_count} document
                  {session.document_count > 1 ? "s" : ""}
                </div>
              </div>
              <span
                className={`ds-status ${
                  session.status === "completed" ? "done" : "running"
                }`}
              >
                <span className="dot" />
                {session.status === "completed" ? "Terminé" : "En cours"}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

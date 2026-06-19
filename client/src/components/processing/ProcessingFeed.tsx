import { useAppStore, type ProcessingDocument } from "@/stores/appStore";
import { ProcessingCard } from "./ProcessingCard";

interface ProcessingFeedProps {
  onReview: (doc: ProcessingDocument) => void;
}

export function ProcessingFeed({ onReview }: ProcessingFeedProps) {
  const documents = useAppStore((s) => s.documents);

  if (documents.length === 0) return null;

  const processing = documents.filter((d) =>
    ["pending", "ocr", "llm"].includes(d.status)
  );
  const review = documents.filter((d) => d.status === "needs_review");
  const done = documents.filter((d) =>
    ["archived", "rejected", "error"].includes(d.status)
  );

  return (
    <div className="space-y-6">
      {processing.length > 0 && (
        <section>
          <h3 className="ds-section-label">En cours ({processing.length})</h3>
          <div className="space-y-2">
            {processing.map((doc) => (
              <ProcessingCard key={doc.id} doc={doc} onReview={onReview} />
            ))}
          </div>
        </section>
      )}

      {review.length > 0 && (
        <section>
          <h3 className="ds-section-label">À vérifier ({review.length})</h3>
          <div className="space-y-2">
            {review.map((doc) => (
              <ProcessingCard key={doc.id} doc={doc} onReview={onReview} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h3 className="ds-section-label">Terminé ({done.length})</h3>
          <div className="space-y-2">
            {done.map((doc) => (
              <ProcessingCard key={doc.id} doc={doc} onReview={onReview} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

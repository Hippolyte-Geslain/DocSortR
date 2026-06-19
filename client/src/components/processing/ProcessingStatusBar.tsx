import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, ScanLine, Sparkles } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

const STEP_LABELS: Record<"ocr" | "llm", string> = {
  ocr: "Lecture OCR",
  llm: "Classification IA",
};

const STEP_ICONS: Record<"ocr" | "llm", typeof ScanLine> = {
  ocr: ScanLine,
  llm: Sparkles,
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem.toString().padStart(2, "0")}s`;
}

/**
 * Sticky live progress bar shown while documents are being processed.
 *
 * Shows: current file, current step (OCR/LLM), elapsed time, overall
 * progress (N/total). Also surfaces a success banner when the session
 * is fully processed.
 */
export function ProcessingStatusBar() {
  const documents = useAppStore((s) => s.documents);
  const activeStep = useAppStore((s) => s.activeStep);
  const sessionCompleted = useAppStore((s) => s.sessionCompleted);
  const [elapsed, setElapsed] = useState(0);

  const total = documents.length;
  const done = documents.filter((d) =>
    ["needs_review", "archived", "rejected", "error"].includes(d.status)
  ).length;
  const errored = documents.filter((d) => d.status === "error").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  useEffect(() => {
    if (!activeStep) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - activeStep.startedAt);
    }, 500);
    setElapsed(Date.now() - activeStep.startedAt);
    return () => clearInterval(id);
  }, [activeStep]);

  if (total === 0) return null;

  if (sessionCompleted || (done === total && total > 0 && !activeStep)) {
    return (
      <div className="ds-statusbar done">
        <div className="ds-statusbar-row">
          <CheckCircle2 className="ds-statusbar-ico" />
          <div className="ds-statusbar-main">
            <p className="ds-statusbar-title">
              Session terminée · {done}/{total} document{total > 1 ? "s" : ""} traité
              {total > 1 ? "s" : ""}
              {errored > 0 ? ` (${errored} en erreur)` : ""}
            </p>
            <p className="ds-statusbar-note">
              Vérifiez les documents signalés « À vérifier ».
            </p>
          </div>
        </div>
      </div>
    );
  }

  const StepIcon = activeStep ? STEP_ICONS[activeStep.step] : FileText;
  const stepLabel = activeStep ? STEP_LABELS[activeStep.step] : "En attente";
  const currentFile =
    activeStep?.filename ??
    documents.find(
      (d) => d.status === "pending" || d.status === "ocr" || d.status === "llm"
    )?.filename;

  return (
    <div className="ds-statusbar">
      <div className="ds-statusbar-row">
        {activeStep ? (
          <Loader2 className="ds-statusbar-ico animate-spin" />
        ) : (
          <StepIcon className="ds-statusbar-ico" />
        )}
        <div className="ds-statusbar-main">
          <div className="ds-statusbar-line">
            <span className="strong">
              {done}/{total}
            </span>
            <span className="sep">·</span>
            <span className="step">{stepLabel}</span>
            {activeStep && (
              <>
                <span className="sep">·</span>
                <span className="time">{formatDuration(elapsed)}</span>
              </>
            )}
          </div>
          {currentFile && (
            <p className="ds-statusbar-file">
              {activeStep?.detail ? `${activeStep.detail} — ` : ""}
              {currentFile}
            </p>
          )}
        </div>
        <span className="ds-statusbar-pct">{pct}%</span>
      </div>
      <div className="ds-progress">
        <div className="ds-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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
      <div className="sticky top-0 z-10 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-200">
            Session terminée · {done}/{total} document{total > 1 ? "s" : ""} traité
            {total > 1 ? "s" : ""}
            {errored > 0 ? ` (${errored} en erreur)` : ""}
          </p>
          <p className="text-xs text-green-300/70">
            Vérifiez les documents signalés « À vérifier ».
          </p>
        </div>
      </div>
    );
  }

  const StepIcon = activeStep ? STEP_ICONS[activeStep.step] : FileText;
  const stepLabel = activeStep ? STEP_LABELS[activeStep.step] : "En attente";
  const currentFile = activeStep?.filename ?? documents.find(
    (d) => d.status === "pending" || d.status === "ocr" || d.status === "llm"
  )?.filename;

  return (
    <div className="sticky top-0 z-10 rounded-xl border border-accent-500/30 bg-dark-800/95 backdrop-blur px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        {activeStep ? (
          <Loader2 className="w-5 h-5 text-accent-400 animate-spin shrink-0" />
        ) : (
          <StepIcon className="w-5 h-5 text-accent-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {done}/{total}
            </span>
            <span className="text-gray-400">·</span>
            <span className="text-accent-300">{stepLabel}</span>
            {activeStep && (
              <>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400 tabular-nums">
                  {formatDuration(elapsed)}
                </span>
              </>
            )}
          </div>
          {currentFile && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {activeStep?.detail ? `${activeStep.detail} — ` : ""}
              {currentFile}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-dark-700 overflow-hidden">
        <div
          className="h-full bg-accent-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

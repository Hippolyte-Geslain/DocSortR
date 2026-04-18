import { Check } from "lucide-react";
import { WizardStep, WIZARD_STEPS, WIZARD_STEP_LABELS } from "@/stores/onboardingStore";

interface StepperProps {
  current: WizardStep;
}

export function Stepper({ current }: StepperProps) {
  const currentIdx = WIZARD_STEPS.indexOf(current);

  return (
    <nav aria-label="Progression" className="flex items-center justify-center gap-2">
      {WIZARD_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isDone
                    ? "bg-accent-500 text-white"
                    : isCurrent
                    ? "bg-accent-500/20 text-accent-400 ring-2 ring-accent-500"
                    : "bg-dark-700 text-gray-500"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1 text-[10px] uppercase tracking-wide ${
                  isCurrent ? "text-accent-400" : "text-gray-500"
                }`}
              >
                {WIZARD_STEP_LABELS[step]}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${isDone ? "bg-accent-500" : "bg-dark-700"}`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

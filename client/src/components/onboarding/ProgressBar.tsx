interface ProgressBarProps {
  percent: number;
  label?: string;
  sublabel?: string;
  indeterminate?: boolean;
}

function formatBytes(n?: number): string {
  if (!n || n < 1024) return `${n ?? 0} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export function ProgressBar({
  percent,
  label,
  sublabel,
  indeterminate,
}: ProgressBarProps) {
  const p = Math.max(0, Math.min(100, percent));

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{label}</span>
          {!indeterminate && (
            <span className="text-accent-400 font-medium tabular-nums">
              {p}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-accent-500 transition-[width] duration-300 ${
            indeterminate ? "animate-pulse w-1/3" : ""
          }`}
          style={!indeterminate ? { width: `${p}%` } : undefined}
        />
      </div>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}

export function ProgressBarWithBytes({
  percent,
  received,
  total,
  label,
}: {
  percent: number;
  received?: number;
  total?: number;
  label?: string;
}) {
  const sublabel =
    received !== undefined && total
      ? `${formatBytes(received)} / ${formatBytes(total)}`
      : received !== undefined
      ? formatBytes(received)
      : undefined;
  return <ProgressBar percent={percent} label={label} sublabel={sublabel} />;
}

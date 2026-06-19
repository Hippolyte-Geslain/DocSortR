import { ArrowDownAZ, Calendar, FileType } from "lucide-react";

const options = [
  { value: "date" as const, icon: Calendar, label: "Par date" },
  { value: "type" as const, icon: FileType, label: "Par type" },
  { value: "name" as const, icon: ArrowDownAZ, label: "Par nom" },
];

interface SortOptionsProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function SortOptions({ selected, onChange }: SortOptionsProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="ds-card">
      <h3 className="ds-section-label">Trier par</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`ds-chip ${selected.includes(value) ? "sel" : ""}`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

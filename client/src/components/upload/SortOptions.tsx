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
    <div className="card">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Trier par</h3>
      <div className="flex gap-2">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => toggle(value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              selected.includes(value)
                ? "bg-accent-500 text-white"
                : "bg-dark-700 text-gray-300 hover:bg-dark-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

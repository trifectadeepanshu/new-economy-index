import type { CompanyGridView } from "@/components/company-grid/types";

const VIEW_OPTIONS: Array<{ value: CompanyGridView; label: string }> = [
  { value: "table", label: "Table" },
  { value: "grid", label: "Cards" },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: CompanyGridView;
  onChange: (value: CompanyGridView) => void;
}) {
  return (
    <div className="nei-view-toggle" role="group" aria-label="Constituent view">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          className={value === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

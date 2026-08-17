import type { IrrRangeMode } from "@/components/company-grid/types";

export const IRR_OPTIONS: ReadonlyArray<{ value: IrrRangeMode; label: string }> = [
  { value: "1y", label: "1 Year" },
  { value: "3y", label: "3 Years" },
  { value: "5y", label: "5 Years" },
  { value: "sinceBase", label: "Since Base" },
];

export function IrrRangeControl({
  mode,
  onModeChange,
  isLoading,
  error,
}: {
  mode: IrrRangeMode;
  onModeChange: (mode: IrrRangeMode) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <span className="nei-irr-range">
      <select
        value={mode}
        onChange={(event) => onModeChange(event.target.value as IrrRangeMode)}
        aria-label="IRR period"
        aria-busy={isLoading}
      >
        {IRR_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isLoading && (
        <span className="nei-irr-range-loading" role="status" aria-label="Loading IRR data" />
      )}
      {error && (
        <span className="nei-irr-range-error" role="status" title={error}>
          Unavailable
        </span>
      )}
    </span>
  );
}

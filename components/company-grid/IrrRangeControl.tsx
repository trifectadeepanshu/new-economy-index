import type { IrrRangeMode } from "@/components/company-grid/types";
import { SelectMenu } from "@/components/ui/SelectMenu";

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
    <span className="nei-irr-range" aria-busy={isLoading}>
      <SelectMenu
        ariaLabel="IRR period"
        className="nei-irr-select"
        tone="dark"
        value={mode}
        options={IRR_OPTIONS}
        onChange={onModeChange}
      />
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

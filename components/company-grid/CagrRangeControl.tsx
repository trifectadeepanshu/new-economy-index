import { INDEX_BASE_DATE } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
import { SingleDatePicker } from "@/components/company-grid/SingleDatePicker";
import type { CagrRangeMode } from "@/components/company-grid/types";

const OPTIONS: { value: CagrRangeMode; label: string }[] = [
  { value: "sinceBase", label: "Since Base" },
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "custom", label: "Custom…" },
];

export function CagrRangeControl({
  mode,
  onModeChange,
  customDate,
  onCustomDateChange,
  isLoading,
}: {
  mode: CagrRangeMode;
  onModeChange: (mode: CagrRangeMode) => void;
  customDate: string | null;
  onCustomDateChange: (date: string) => void;
  isLoading: boolean;
}) {
  return (
    <span className="nei-cagr-range">
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as CagrRangeMode)}
        aria-label="CAGR window"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {mode === "custom" && (
        <SingleDatePicker
          value={customDate}
          min={INDEX_BASE_DATE}
          max={getISTDate()}
          onChange={onCustomDateChange}
          placeholder="Pick a date"
        />
      )}
      {isLoading && (
        <span className="nei-cagr-range-loading" role="status" aria-label="Loading" />
      )}
    </span>
  );
}

import type { ReactNode } from "react";
import { SECTORS, type Sector } from "@/lib/companies";
import {
  RANGE_OPTIONS,
  SECTOR_CHART_COLORS,
  type RangeKey,
} from "@/components/index-chart/constants";
import type { CustomRange } from "@/components/index-chart/useChartHistory";
import { DateRangePicker } from "@/components/index-chart/DateRangePicker";
import { formatSignedPct, formatValue } from "@/components/index-chart/format";
import type { ChartPoint } from "@/components/index-chart/types";

function ControlButton({
  active,
  children,
  onClick,
  tone = "default",
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "ink";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`nei-control-button ${active ? "is-active" : ""} ${
        tone === "ink" ? "is-ink" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function LegendButton({
  sector,
  active,
  muted,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  sector: Sector;
  active: boolean;
  muted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`nei-legend-button ${active ? "is-active" : ""} ${
        muted ? "is-muted" : ""
      }`}
    >
      <span
        className="nei-legend-dot"
        style={{ background: SECTOR_CHART_COLORS[sector] }}
      />
      {sector}
    </button>
  );
}

export function ChartState({
  tone,
  children,
}: {
  tone: "loading" | "error" | "empty";
  children?: ReactNode;
}) {
  return <div className={`nei-chart-state is-${tone}`}>{children}</div>;
}

/** Range segmented control (1W/1M/1Y/Max/Custom) + the custom date picker. */
export function RangeControl({
  isReference,
  rangeKey,
  onRangeKeyChange,
  customRange,
  onCustomRangeChange,
  minDate,
  maxDate,
}: {
  isReference: boolean;
  rangeKey: RangeKey;
  onRangeKeyChange: (key: RangeKey) => void;
  customRange: CustomRange | null;
  onCustomRangeChange: (next: CustomRange) => void;
  minDate: string;
  maxDate: string;
}) {
  return (
    <div className="nei-chart-controls">
      <div className="nei-segmented-control" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((option) => (
          <ControlButton
            key={option.key}
            active={rangeKey === option.key}
            tone={isReference ? "ink" : "default"}
            onClick={() => onRangeKeyChange(option.key)}
          >
            {option.label}
          </ControlButton>
        ))}
      </div>

      {rangeKey === "CUSTOM" && (
        <DateRangePicker
          value={customRange}
          min={minDate}
          max={maxDate}
          onChange={onCustomRangeChange}
        />
      )}
    </div>
  );
}

export function ChartToolbar({
  isReference,
  latestPoint,
  onRangeKeyChange,
  rangeKey,
  rangeLabel,
  rangeChangePct,
  customRange,
  onCustomRangeChange,
  minDate,
  maxDate,
  title,
}: {
  isReference: boolean;
  latestPoint?: ChartPoint;
  onRangeKeyChange: (key: RangeKey) => void;
  rangeKey: RangeKey;
  rangeLabel: string;
  rangeChangePct: number | null;
  customRange: CustomRange | null;
  onCustomRangeChange: (next: CustomRange) => void;
  minDate: string;
  maxDate: string;
  title: string;
}) {
  const changeTone = (rangeChangePct ?? 0) >= 0 ? "is-positive" : "is-negative";
  const referenceLabel = "NEI Top 50";

  return (
    <div className="nei-chart-toolbar">
      {isReference ? (
        <div>
          <div className="nei-reference-chart-label">
            {rangeLabel} / {referenceLabel}
          </div>
          <div className="nei-reference-chart-value">
            <span className="nei-mono">
              {latestPoint ? formatValue(latestPoint.value) : "-"}
            </span>
            <strong className={`nei-mono ${changeTone}`}>
              {rangeChangePct !== null ? formatSignedPct(rangeChangePct) : "-"}
            </strong>
          </div>
        </div>
      ) : (
        <div>
          <div className="nei-label nei-chart-title-label">Chart View</div>
          <div className="nei-heading nei-chart-title">{title}</div>
        </div>
      )}

      <RangeControl
        isReference={isReference}
        rangeKey={rangeKey}
        onRangeKeyChange={onRangeKeyChange}
        customRange={customRange}
        onCustomRangeChange={onCustomRangeChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    </div>
  );
}

export function SectorTabs({
  activeSector,
  focusedSector = null,
  label,
  onClick,
  onFocus = () => {},
}: {
  activeSector: Sector;
  focusedSector?: Sector | null;
  label: string;
  onClick: (sector: Sector) => void;
  onFocus?: (sector: Sector | null) => void;
}) {
  return (
    <div className="nei-sector-tabs" role="group" aria-label={label}>
      {SECTORS.map((sector) => {
        const active = activeSector === sector;
        const muted = Boolean(focusedSector && focusedSector !== sector);

        return (
          <LegendButton
            key={sector}
            sector={sector}
            active={active}
            muted={muted}
            onClick={() => onClick(sector)}
            onMouseEnter={() => onFocus(sector)}
            onMouseLeave={() => onFocus(null)}
          />
        );
      })}
    </div>
  );
}

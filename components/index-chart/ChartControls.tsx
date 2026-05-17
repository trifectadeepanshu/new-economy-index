import type { ReactNode } from "react";
import { SECTORS, type Sector } from "@/lib/companies";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/index-api";
import { CHART_MODES, SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { formatSignedPct, formatValue } from "@/components/index-chart/format";
import type { ChartMode, ChartPoint } from "@/components/index-chart/types";

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

export function ChartToolbar({
  isReference,
  latestPoint,
  mode,
  onModeChange,
  onRangeChange,
  range,
  rangeChangePct,
  title,
}: {
  isReference: boolean;
  latestPoint?: ChartPoint;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  onRangeChange: (range: HistoryRange) => void;
  range: HistoryRange;
  rangeChangePct: number | null;
  title: string;
}) {
  const changeTone = (rangeChangePct ?? 0) >= 0 ? "is-positive" : "is-negative";

  return (
    <div className="nei-chart-toolbar">
      {isReference ? (
        <div>
          <div className="nei-reference-chart-label">{range} Range / NEI</div>
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

      <div className="nei-chart-controls">
        {!isReference && (
          <div className="nei-segmented-control" role="group" aria-label="Chart mode">
            {CHART_MODES.map((chartMode) => (
              <ControlButton
                key={chartMode.value}
                active={mode === chartMode.value}
                onClick={() => onModeChange(chartMode.value)}
              >
                {chartMode.label}
              </ControlButton>
            ))}
          </div>
        )}

        <div className="nei-segmented-control" role="group" aria-label="Date range">
          {HISTORY_RANGES.map((option) => (
            <ControlButton
              key={option}
              active={range === option}
              tone={isReference ? "ink" : "default"}
              onClick={() => onRangeChange(option)}
            >
              {option}
            </ControlButton>
          ))}
        </div>
      </div>
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

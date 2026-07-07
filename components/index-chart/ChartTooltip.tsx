import { INDEX_BASE_VALUE } from "@/lib/companies";
import { formatPctFromBase, formatValue } from "@/components/index-chart/format";

type TooltipItem = {
  value?: number;
  name?: string;
  color?: string;
};

type TooltipRow = TooltipItem & {
  value: number;
};

function hasTooltipValue(item: TooltipItem): item is TooltipRow {
  return typeof item.value === "number";
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  // Drop the NEI area's tooltip entry (dataKey "value"); the NEI line covers it.
  const rows = payload
    .filter(hasTooltipValue)
    .filter((item) => item.name !== "value")
    .sort((a, b) => b.value - a.value);
  if (!rows.length) return null;

  return (
    <div className="nei-chart-tooltip" style={{ minWidth: rows.length > 1 ? 190 : 142 }}>
      <div className="nei-chart-tooltip-label">{label}</div>
      <div className="nei-chart-tooltip-list">
        {rows.map((item) => (
          <div key={item.name ?? "value"} className="nei-chart-tooltip-row">
            <span className="nei-chart-tooltip-name">
              {item.color && (
                <span
                  className="nei-chart-tooltip-dot"
                  style={{ background: item.color }}
                />
              )}
              <span>{item.name ?? "NEI"}</span>
            </span>
            <span className="nei-chart-tooltip-value nei-mono">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>

      {rows.length === 1 && (
        <div
          className={`nei-chart-tooltip-change nei-mono ${
            rows[0].value >= INDEX_BASE_VALUE ? "is-positive" : "is-negative"
          }`}
        >
          {formatPctFromBase(rows[0].value)} <span>from base</span>
        </div>
      )}
    </div>
  );
}

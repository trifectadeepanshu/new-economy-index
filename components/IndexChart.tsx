"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { INDEX_BASE_VALUE, SECTORS, type Sector } from "@/lib/companies";
import type { StockData } from "@/hooks/useIndexData";

type Range = "1W" | "1M" | "1Y" | "ALL";
type ChartMode = "index" | "compare" | "detail";

const RANGES: Range[] = ["1W", "1M", "1Y", "ALL"];
const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: "index", label: "Index" },
  { value: "compare", label: "Sector Compare" },
  { value: "detail", label: "Sector Detail" },
];

const SECTOR_CHART_COLORS: Record<Sector, string> = {
  Platforms: "#1E3A5F",
  "Consumer Brands": "#B45A2E",
  Fintech: "#2C6E3C",
  B2B: "#346C8C",
  BFSI: "#8B5D77",
  Software: "#5E5A8A",
  Others: "#747B86",
};

interface HistoryPoint {
  date: string;
  value: number;
}

interface SectorHistoryPoint {
  date: string;
  sector: Sector;
  value: number;
  numCompanies: number;
}

interface ChartPoint {
  date: string;
  label: string;
  value: number;
}

type ComparePoint = {
  date: string;
  label: string;
} & Partial<Record<Sector, number>>;

function formatLabel(date: string, range: Range): string {
  const pattern = range === "1W" || range === "1M" ? "dd MMM" : "MMM ''yy";
  return format(parseISO(date), pattern);
}

function formatValue(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPctFromBase(value: number) {
  const pct = ((value - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function buildCompareData(sectorData: SectorHistoryPoint[], range: Range): ComparePoint[] {
  const byDate = new Map<string, ComparePoint>();

  for (const point of sectorData) {
    const row = byDate.get(point.date) ?? {
      date: point.date,
      label: formatLabel(point.date, range),
    };
    row[point.sector] = Number(point.value);
    byDate.set(point.date, row);
  }

  return Array.from(byDate.values());
}

function getLiveSectorValues(stocks: StockData[]) {
  const values = {} as Partial<Record<Sector, number>>;

  for (const sector of SECTORS) {
    const sectorStocks = stocks.filter(
      (stock) => stock.sector === sector && typeof stock.ratio === "number"
    );
    if (!sectorStocks.length) continue;

    const avgRatio =
      sectorStocks.reduce((sum, stock) => sum + (stock.ratio ?? 0), 0) /
      sectorStocks.length;
    values[sector] = Math.round(INDEX_BASE_VALUE * avgRatio * 100) / 100;
  }

  return values;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((item): item is { value: number; name?: string; color?: string } => (
      typeof item.value === "number"
    ))
    .sort((a, b) => b.value - a.value);

  if (!rows.length) return null;

  return (
    <div
      style={{
        background: "var(--nei-surface)",
        border: "1px solid var(--nei-grid-strong)",
        padding: "10px 12px",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: "var(--nei-card-shadow)",
        minWidth: rows.length > 1 ? 190 : 142,
      }}
    >
      <div
        style={{
          color: "var(--nei-muted)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((item) => (
          <div
            key={item.name ?? "value"}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                minWidth: 0,
                color: "var(--nei-muted)",
              }}
            >
              {item.color && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 112,
                }}
              >
                {item.name ?? "NEI"}
              </span>
            </span>
            <span
              className="nei-mono"
              style={{
                color: "var(--nei-fg)",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
      {rows.length === 1 && (
        <div
          className="nei-mono"
          style={{
            marginTop: 6,
            fontSize: 12,
            color:
              rows[0].value >= INDEX_BASE_VALUE ? "var(--nei-pos)" : "var(--nei-neg)",
          }}
        >
          {formatPctFromBase(rows[0].value)}{" "}
          <span style={{ color: "var(--nei-muted)" }}>from base</span>
        </div>
      )}
    </div>
  );
}

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
  const ink = tone === "ink";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        minHeight: 38,
        padding: "7px 12px",
        fontSize: 11,
        letterSpacing: "0.04em",
        fontWeight: 600,
        background: active ? (ink ? "var(--nei-fg)" : "var(--nei-surface)") : "transparent",
        color: active ? (ink ? "var(--nei-bg)" : "var(--nei-fg)") : "var(--nei-muted)",
        border: "none",
        borderRadius: 7,
        cursor: "pointer",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
        transition: "color 120ms, background 120ms, box-shadow 120ms",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function LegendButton({
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
      style={{
        minHeight: 36,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        border: "1px solid var(--nei-grid-strong)",
        borderRadius: 999,
        background: active
          ? "color-mix(in oklab, var(--nei-accent) 12%, transparent)"
          : "var(--nei-surface)",
        color: active ? "var(--nei-fg)" : "var(--nei-muted)",
        opacity: muted ? 0.4 : 1,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 120ms, color 120ms, background 120ms",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: SECTOR_CHART_COLORS[sector],
          flexShrink: 0,
        }}
      />
      {sector}
    </button>
  );
}

export function IndexChart({
  liveValue,
  stocks,
  variant = "default",
}: {
  liveValue: number | null;
  stocks: StockData[];
  variant?: "default" | "reference";
}) {
  const [range, setRange] = useState<Range>("1Y");
  const [mode, setMode] = useState<ChartMode>("index");
  const [selectedSector, setSelectedSector] = useState<Sector>("Platforms");
  const [focusedSector, setFocusedSector] = useState<Sector | null>(null);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [sectorData, setSectorData] = useState<SectorHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch(`/api/index/history?range=${range}&includeSectors=1`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!active) return;
        setHistoryData(json.data ?? []);
        setSectorData(json.sectorData ?? []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active || (e instanceof DOMException && e.name === "AbortError")) {
          return;
        }
        setHistoryData([]);
        setSectorData([]);
        setError(e instanceof Error ? e.message : "Failed to load chart data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [range]);

  const liveSectorValues = useMemo(() => getLiveSectorValues(stocks), [stocks]);

  const indexData = useMemo<ChartPoint[]>(() => {
    const points = historyData.map((point) => ({
      date: point.date,
      label: formatLabel(point.date, range),
      value: Number(point.value),
    }));
    if (liveValue !== null && points.length > 0) {
      return [...points, { date: "now", label: "Now", value: liveValue }];
    }
    return points;
  }, [historyData, liveValue, range]);

  const compareData = useMemo<ComparePoint[]>(() => {
    const points = buildCompareData(sectorData, range);
    const hasLiveSectors = SECTORS.some((sector) => liveSectorValues[sector] !== undefined);
    if (!hasLiveSectors || points.length === 0) return points;
    return [...points, { date: "now", label: "Now", ...liveSectorValues }];
  }, [liveSectorValues, range, sectorData]);

  const detailData = useMemo<ChartPoint[]>(() => {
    const points = sectorData
      .filter((point) => point.sector === selectedSector)
      .map((point) => ({
        date: point.date,
        label: formatLabel(point.date, range),
        value: Number(point.value),
      }));
    const liveSectorValue = liveSectorValues[selectedSector];
    if (liveSectorValue === undefined || points.length === 0) return points;
    return [...points, { date: "now", label: "Now", value: liveSectorValue }];
  }, [liveSectorValues, range, sectorData, selectedSector]);

  const isReference = variant === "reference";
  const activeMode = isReference ? "index" : mode;
  const currentData =
    activeMode === "index" ? indexData : activeMode === "detail" ? detailData : compareData;
  const singleSeriesData = activeMode === "detail" ? detailData : indexData;
  const latestPoint = singleSeriesData[singleSeriesData.length - 1];
  const firstPoint = singleSeriesData[0];
  const rangeChangePct =
    latestPoint && firstPoint ? ((latestPoint.value - firstPoint.value) / firstPoint.value) * 100 : null;
  const latestColor =
    activeMode === "detail"
      ? SECTOR_CHART_COLORS[selectedSector]
      : latestPoint && latestPoint.value < INDEX_BASE_VALUE
        ? "var(--nei-neg)"
        : "var(--nei-accent)";
  const chartTitle =
    activeMode === "index"
      ? "NEI performance"
      : activeMode === "compare"
        ? "Sector compare"
        : `${selectedSector} performance`;

  const selectedOrFocusedSector = focusedSector ?? selectedSector;

  return (
    <div className={isReference ? "nei-reference-chart" : undefined} style={{ marginTop: isReference ? 0 : 20 }}>
      <div className="nei-chart-toolbar">
        {isReference ? (
          <div>
            <div className="nei-reference-chart-label">
              {range} Range · NEI
            </div>
            <div className="nei-reference-chart-value">
              <span className="nei-mono">
                {latestPoint ? formatValue(latestPoint.value) : "—"}
              </span>
              <strong
                className="nei-mono"
                style={{
                  color:
                    (rangeChangePct ?? 0) >= 0
                      ? "var(--nei-pos)"
                      : "var(--nei-neg)",
                }}
              >
                {rangeChangePct !== null
                  ? `${rangeChangePct >= 0 ? "+" : ""}${rangeChangePct.toFixed(2)}%`
                  : "—"}
              </strong>
            </div>
          </div>
        ) : (
          <div>
            <div className="nei-label" style={{ marginBottom: 4 }}>
              Chart View
            </div>
            <div
              className="nei-heading"
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: 0,
                color: "var(--nei-fg)",
              }}
            >
              {chartTitle}
            </div>
          </div>
        )}

        <div className="nei-chart-controls">
          {!isReference && (
            <div className="nei-segmented-control" role="group" aria-label="Chart mode">
              {CHART_MODES.map((chartMode) => (
                <ControlButton
                  key={chartMode.value}
                  active={mode === chartMode.value}
                  onClick={() => setMode(chartMode.value)}
                >
                  {chartMode.label}
                </ControlButton>
              ))}
            </div>
          )}

          <div className="nei-segmented-control" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <ControlButton
                key={r}
                active={range === r}
                tone={isReference ? "ink" : "default"}
                onClick={() => {
                  if (r !== range) {
                    setLoading(true);
                    setRange(r);
                  }
                }}
              >
                {r}
              </ControlButton>
            ))}
          </div>
        </div>
      </div>

      {!isReference && activeMode === "detail" && (
        <div className="nei-sector-tabs" role="group" aria-label="Sector detail">
          {SECTORS.map((sector) => (
            <LegendButton
              key={sector}
              sector={sector}
              active={selectedSector === sector}
              muted={false}
              onClick={() => setSelectedSector(sector)}
              onMouseEnter={() => setFocusedSector(sector)}
              onMouseLeave={() => setFocusedSector(null)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div
          style={{
            height: 330,
            background: "var(--nei-chip)",
            borderRadius: 8,
            animation: "nei-pulse 1.8s ease-in-out infinite",
          }}
        />
      ) : error ? (
        <div
          style={{
            height: 330,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--nei-neg)",
            fontSize: 13,
          }}
        >
          Could not load historical data.
        </div>
      ) : currentData.length === 0 ? (
        <div
          style={{
            height: 330,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--nei-muted)",
            fontSize: 13,
          }}
        >
          No historical data yet — run the backfill script to populate history.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={330}>
            <ComposedChart
              data={currentData}
              margin={{ top: 16, right: 78, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="neiAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: "var(--nei-accent)", stopOpacity: 0.12 }} />
                  <stop offset="100%" style={{ stopColor: "var(--nei-accent)", stopOpacity: 0.01 }} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--nei-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "var(--nei-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-inter), system-ui",
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{
                  fill: "var(--nei-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                }
                width={54}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={INDEX_BASE_VALUE}
                stroke="var(--nei-grid-strong)"
                strokeDasharray="4 4"
                label={{
                  value: "Base 1,000",
                  position: "insideTopLeft",
                  fill: "var(--nei-muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-inter), system-ui",
                }}
              />

              {activeMode === "compare" ? (
                SECTORS.map((sector) => {
                  const focused = focusedSector ?? null;
                  const isMuted = Boolean(focused && focused !== sector);
                  return (
                    <Line
                      key={sector}
                      type="monotone"
                      dataKey={sector}
                      name={sector}
                      stroke={SECTOR_CHART_COLORS[sector]}
                      strokeWidth={focused === sector ? 2.7 : 1.7}
                      strokeOpacity={isMuted ? 0.18 : 1}
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                      activeDot={{
                        r: 4,
                        fill: SECTOR_CHART_COLORS[sector],
                        stroke: "#FFFFFF",
                        strokeWidth: 2,
                      }}
                      onMouseEnter={() => setFocusedSector(sector)}
                      onMouseLeave={() => setFocusedSector(null)}
                    />
                  );
                })
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="none"
                    fill="url(#neiAreaGrad)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={activeMode === "detail" ? selectedSector : "NEI"}
                    stroke={latestColor}
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                    activeDot={{
                      r: 4,
                      fill: latestColor,
                      stroke: "#FFFFFF",
                      strokeWidth: 2,
                    }}
                  />
                  {latestPoint && (
                    <ReferenceDot
                      x={latestPoint.label}
                      y={latestPoint.value}
                      r={5}
                      fill={latestColor}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      label={{
                        value: formatValue(latestPoint.value),
                        position: "right",
                        fill: "var(--nei-fg)",
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
                      }}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {!isReference && activeMode === "compare" && (
            <div className="nei-sector-tabs" role="group" aria-label="Sector focus">
              {SECTORS.map((sector) => {
                const isActive = selectedOrFocusedSector === sector;
                const isMuted = Boolean(focusedSector && focusedSector !== sector);
                return (
                  <LegendButton
                    key={sector}
                    sector={sector}
                    active={isActive}
                    muted={isMuted}
                    onClick={() =>
                      setFocusedSector((current) => (current === sector ? null : sector))
                    }
                    onMouseEnter={() => setFocusedSector(sector)}
                    onMouseLeave={() => setFocusedSector(null)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

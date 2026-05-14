"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { INDEX_BASE_VALUE, SECTOR_COLORS, SECTORS, type Sector } from "@/lib/companies";
import type { StockData } from "@/hooks/useIndexData";

type Range = "1W" | "1M" | "1Y" | "ALL";
type ChartMode = "index" | "compare" | "detail";

const RANGES: Range[] = ["1W", "1M", "1Y", "ALL"];
const CHART_MODES: { value: ChartMode; label: string }[] = [
  { value: "index", label: "Index" },
  { value: "compare", label: "Sector Compare" },
  { value: "detail", label: "Sector Detail" },
];

interface IndexDataPoint {
  date: string;
  value: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

interface SectorDataPoint {
  date: string;
  sector: Sector;
  value: number;
  numCompanies: number;
}

type ComparePoint = {
  date: string;
} & Partial<Record<Sector, number>>;

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
}

function formatDateLabel(date: string, range: Range) {
  const pattern = range === "1W" || range === "1M" ? "dd MMM" : "MMM ''yy";
  return format(parseISO(date), pattern);
}

function formatValue(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((item): item is { value: number; name?: string; color?: string } => (
      typeof item.value === "number"
    ))
    .sort((a, b) => b.value - a.value);

  if (!rows.length) return null;

  return (
    <div className="max-w-64 rounded-2xl border border-[rgba(255,255,255,0.13)] bg-[#0f1e41] px-3 py-2 text-sm shadow-2xl">
      <p className="mb-1 font-sans text-xs text-white/45">{label}</p>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.name ?? "value"} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2 font-sans text-white/70">
              {item.color && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="truncate">{item.name ?? "Value"}</span>
            </span>
            <span className="tr-heading font-semibold tabular-nums text-white">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tr-focus min-h-11 border px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:min-h-9 ${
        active
          ? "border-[#E24929]/45 bg-[#E24929]/10 text-white"
          : "border-white/10 text-white/45 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RangeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`tr-focus relative min-h-11 px-2 py-1.5 font-sans text-[11px] font-semibold tracking-[0.12em] transition-colors sm:min-h-9 ${
        active ? "text-white" : "text-white/45 hover:text-white"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-2 bottom-0 h-px bg-[#E24929]" />}
    </button>
  );
}

function buildCompareData(sectorData: SectorDataPoint[], range: Range): ComparePoint[] {
  const byDate = new Map<string, ComparePoint>();

  for (const point of sectorData) {
    const row = byDate.get(point.date) ?? { date: formatDateLabel(point.date, range) };
    row[point.sector] = point.value;
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

export function IndexChart({
  liveValue,
  stocks,
}: {
  liveValue: number | null;
  stocks: StockData[];
}) {
  const [range, setRange] = useState<Range>("1Y");
  const [mode, setMode] = useState<ChartMode>("index");
  const [selectedSector, setSelectedSector] = useState<Sector>("Platforms");
  const [historyData, setHistoryData] = useState<IndexDataPoint[]>([]);
  const [sectorData, setSectorData] = useState<SectorDataPoint[]>([]);
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
      date: formatDateLabel(point.date, range),
      value: Number(point.value),
    }));
    if (liveValue === null || points.length === 0) return points;
    return [...points, { date: "Now", value: liveValue }];
  }, [historyData, liveValue, range]);

  const compareData = useMemo<ComparePoint[]>(() => {
    const points = buildCompareData(sectorData, range);
    const hasLiveSectors = SECTORS.some((sector) => liveSectorValues[sector] !== undefined);
    if (!hasLiveSectors || points.length === 0) return points;
    return [...points, { date: "Now", ...liveSectorValues }];
  }, [liveSectorValues, range, sectorData]);

  const detailData = useMemo<ChartPoint[]>(() => {
    const points = sectorData
      .filter((point) => point.sector === selectedSector)
      .map((point) => ({
        date: formatDateLabel(point.date, range),
        value: point.value,
      }));
    const liveSectorValue = liveSectorValues[selectedSector];
    if (liveSectorValue === undefined || points.length === 0) return points;
    return [...points, { date: "Now", value: liveSectorValue }];
  }, [liveSectorValues, range, sectorData, selectedSector]);

  const currentData =
    mode === "index" ? indexData : mode === "detail" ? detailData : compareData;

  const singleSeriesData = mode === "detail" ? detailData : indexData;
  const baseline = singleSeriesData[0]?.value ?? INDEX_BASE_VALUE;
  const finalValue = singleSeriesData[singleSeriesData.length - 1]?.value ?? baseline;
  const indexLineColor = finalValue >= baseline ? "#E24929" : "#ef4444";
  const detailLineColor = "#E24929";
  const chartTitle =
    mode === "index"
      ? "NEI Performance"
      : mode === "compare"
        ? "Sector Compare"
        : `${selectedSector} Performance`;

  const selectRange = (nextRange: Range) => {
    if (nextRange === range) return;
    setLoading(true);
    setRange(nextRange);
  };

  return (
    <div className="tr-card p-5">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="tr-section-label">Performance</p>
          <h2 className="tr-heading mt-1 text-lg font-semibold text-white">{chartTitle}</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Chart mode"
          >
            {CHART_MODES.map((chartMode) => (
              <ModeButton
                key={chartMode.value}
                active={mode === chartMode.value}
                onClick={() => setMode(chartMode.value)}
              >
                {chartMode.label}
              </ModeButton>
            ))}
          </div>

          <div className="flex flex-wrap gap-1" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <RangeButton
                key={r}
                active={range === r}
                onClick={() => selectRange(r)}
              >
                {r}
              </RangeButton>
            ))}
          </div>
        </div>
      </div>

      {mode === "detail" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SECTORS.map((sector) => (
            <button
              key={sector}
              type="button"
              aria-pressed={selectedSector === sector}
              onClick={() => setSelectedSector(sector)}
              className={`tr-focus min-h-11 border px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors sm:min-h-9 ${
                selectedSector === sector
                  ? "border-transparent text-white"
                  : "border-white/10 text-white/45 hover:border-white/20 hover:text-white"
              }`}
              style={{
                backgroundColor:
                  selectedSector === sector ? SECTOR_COLORS[sector] : "transparent",
              }}
            >
              {sector}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/10" />
      ) : error ? (
        <div className="flex h-64 items-center justify-center font-sans text-sm text-red-300">
          Could not load historical data: {error}
        </div>
      ) : currentData.length === 0 ? (
        <div className="flex h-64 items-center justify-center font-sans text-sm text-white/35">
          No historical data yet — run the backfill to populate history.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={currentData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trIndexArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E24929" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#E24929" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "var(--font-inter)" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "var(--font-inter)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={INDEX_BASE_VALUE} stroke="rgba(255,255,255,0.13)" strokeDasharray="4 4" />

              {mode === "compare" ? (
                SECTORS.map((sector) => (
                  <Line
                    key={sector}
                    type="monotone"
                    dataKey={sector}
                    name={sector}
                    stroke={SECTOR_COLORS[sector]}
                    strokeWidth={1.8}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 3, fill: SECTOR_COLORS[sector] }}
                  />
                ))
              ) : (
                <>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="none"
                    fill="url(#trIndexArea)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={mode === "detail" ? selectedSector : "NEI"}
                    stroke={mode === "detail" ? detailLineColor : indexLineColor}
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: mode === "detail" ? detailLineColor : indexLineColor,
                    }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {mode === "compare" && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {SECTORS.map((sector) => (
                <div key={sector} className="flex items-center gap-2 font-sans text-xs text-white/45">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SECTOR_COLORS[sector] }}
                  />
                  <span>{sector}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState } from "react";
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
import { INDEX_BASE_VALUE, SECTORS, type Sector } from "@/lib/companies";
import { BENCHMARK_META, SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { getAxisTicks, getChartLayout } from "@/components/index-chart/data";
import { formatValue } from "@/components/index-chart/format";
import { ChartTooltip } from "@/components/index-chart/ChartTooltip";
import type { ChartMode, ChartPoint, ChartRow } from "@/components/index-chart/types";
import type { BenchmarkKey } from "@/lib/index-api";

type ChartCanvasProps = {
  activeMode: ChartMode;
  areaGradientId: string;
  data: ChartRow[];
  focusedSector: Sector | null;
  latestColor: string;
  latestPoint?: ChartPoint;
  onSectorFocus: (sector: Sector | null) => void;
  selectedSector: Sector;
  visibleBenchmarks?: Set<BenchmarkKey>;
  showTrifecta?: boolean;
  /** Draw the "Base 1,000" reference line — only meaningful when the range
   * starts at the index base (the NEI line shows its true level otherwise). */
  showBaseLine?: boolean;
};

export function ChartCanvas({
  activeMode,
  areaGradientId,
  data,
  focusedSector,
  latestColor,
  latestPoint,
  onSectorFocus,
  selectedSector,
  visibleBenchmarks,
  showTrifecta,
  showBaseLine,
}: ChartCanvasProps) {
  const [canvasWidth, setCanvasWidth] = useState(0);
  const layout = getChartLayout(canvasWidth);
  const axisTicks = getAxisTicks(data, layout.maxXTicks);
  const labelByDate = new Map(data.map((row) => [row.date, row.label]));

  return (
    <div className={`nei-chart-canvas is-${layout.size}`} data-chart-size={layout.size}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 360, height: 260 }}
        debounce={80}
        onResize={(width) => setCanvasWidth(width)}
      >
        <ComposedChart<ChartRow>
          data={data}
          margin={layout.margin}
        >
          <defs>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                style={{ stopColor: "var(--nei-fg)", stopOpacity: 0.08 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "var(--nei-fg)", stopOpacity: 0.01 }}
              />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--nei-grid)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{
              fill: "var(--nei-muted)",
              fontSize: layout.tickFontSize,
              fontFamily: "var(--font-inter), system-ui",
            }}
            axisLine={false}
            tickLine={false}
            ticks={axisTicks}
            tickFormatter={(value: string | number) =>
              labelByDate.get(String(value)) ?? String(value)
            }
            tickMargin={8}
            interval={0}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{
              fill: "var(--nei-muted)",
              fontSize: layout.tickFontSize,
              fontFamily: "var(--font-inter), ui-monospace, monospace",
            }}
            axisLine={false}
            tickLine={false}
            tickCount={layout.yTickCount}
            tickFormatter={(value: number) =>
              value.toLocaleString("en-IN", { maximumFractionDigits: 0 })
            }
            width={layout.yAxisWidth}
          />
          <Tooltip content={<ChartTooltip />} />
          {showBaseLine && (
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
          )}

          {activeMode === "compare" ? (
            <SectorLines
              focusedSector={focusedSector}
              onSectorFocus={onSectorFocus}
            />
          ) : (
            <>
              <BenchmarkLines visibleBenchmarks={visibleBenchmarks} />
              {showTrifecta && (
                <Line
                  type="monotone"
                  dataKey="TRIFECTA"
                  name="Trifecta Capital portfolio"
                  stroke="#E07A38"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                  activeDot={{ r: 3, fill: "#E07A38", stroke: "#FFFFFF", strokeWidth: 1.5 }}
                />
              )}
              <IndexLine
                activeMode={activeMode}
                areaGradientId={areaGradientId}
                latestColor={latestColor}
                latestPoint={latestPoint}
                showLatestLabel={layout.showLatestLabel}
                selectedSector={selectedSector}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorLines({
  focusedSector,
  onSectorFocus,
}: {
  focusedSector: Sector | null;
  onSectorFocus: (sector: Sector | null) => void;
}) {
  return SECTORS.map((sector) => {
    const isMuted = Boolean(focusedSector && focusedSector !== sector);

    return (
      <Line
        key={sector}
        type="monotone"
        dataKey={sector}
        name={sector}
        stroke={SECTOR_CHART_COLORS[sector]}
        strokeWidth={focusedSector === sector ? 2.7 : 1.7}
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
        onMouseEnter={() => onSectorFocus(sector)}
        onMouseLeave={() => onSectorFocus(null)}
      />
    );
  });
}

function BenchmarkLines({ visibleBenchmarks }: { visibleBenchmarks?: Set<BenchmarkKey> }) {
  if (!visibleBenchmarks) return null;
  return (
    <>
      {(Object.keys(BENCHMARK_META) as BenchmarkKey[])
        .filter((key) => visibleBenchmarks.has(key))
        .map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={BENCHMARK_META[key].label}
            stroke={BENCHMARK_META[key].color}
            strokeWidth={1.8}
            strokeDasharray={BENCHMARK_META[key].dash}
            strokeOpacity={0.95}
            dot={false}
            connectNulls
            isAnimationActive={false}
            activeDot={{ r: 3, fill: BENCHMARK_META[key].color, stroke: "#FFFFFF", strokeWidth: 1.5 }}
          />
        ))}
    </>
  );
}

function IndexLine({
  activeMode,
  areaGradientId,
  latestColor,
  latestPoint,
  showLatestLabel,
  selectedSector,
}: {
  activeMode: ChartMode;
  areaGradientId: string;
  latestColor: string;
  latestPoint?: ChartPoint;
  showLatestLabel: boolean;
  selectedSector: Sector;
}) {
  return (
    <>
      <Area
        type="monotone"
        dataKey="value"
        stroke="none"
        fill={`url(#${areaGradientId})`}
        isAnimationActive={false}
      />
      <Line
        type="monotone"
        dataKey="value"
        name={activeMode === "detail" ? selectedSector : "NEI Top 50"}
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
          x={latestPoint.date}
          y={latestPoint.value}
          r={5}
          fill={latestColor}
          stroke="#FFFFFF"
          strokeWidth={2}
          label={showLatestLabel
            ? {
              value: formatValue(latestPoint.value),
              position: "right",
              fill: "var(--nei-fg)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-inter), ui-monospace, monospace",
            }
            : undefined}
        />
      )}
    </>
  );
}

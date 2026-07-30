"use client";

import { useId, useMemo, useState } from "react";
import { INDEX_ANCHOR_DATE } from "@/lib/companies";
import type { BenchmarkKey } from "@/lib/index-api";
import { ChartCanvas } from "@/components/index-chart/ChartCanvas";
import { ChartState, ChartToolbar } from "@/components/index-chart/ChartControls";
import {
  BENCHMARK_KEYS,
  BENCHMARK_META,
  RANGE_OPTIONS,
  type RangeKey,
} from "@/components/index-chart/constants";
import { getSeriesReturn } from "@/components/index-chart/data";
import { formatSignedPct } from "@/components/index-chart/format";
import { useChartHistory, type CustomRange } from "@/components/index-chart/useChartHistory";
import { useIndexChartModel, type SeriesReturns } from "@/components/index-chart/useIndexChartModel";
import type { IndexChartProps } from "@/components/index-chart/types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function oneYearAgoISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

/** A legend entry showing the series' return over the selected window. */
function SeriesCard({
  label,
  color,
  swatchDash,
  ret,
  on,
  toggleable,
  onToggle,
}: {
  label: string;
  color: string;
  swatchDash?: boolean;
  ret: number | null;
  on: boolean;
  toggleable: boolean;
  onToggle?: () => void;
}) {
  const tone = (ret ?? 0) >= 0 ? "is-positive" : "is-negative";
  const inner = (
    <>
      <span className="nei-series-card-head">
        <span
          className={`nei-series-swatch${swatchDash ? " is-dash" : ""}`}
          style={{ color, background: on ? color : "transparent", borderColor: color }}
        />
        <span className="nei-series-name">{label}</span>
      </span>
      <span className={`nei-series-return nei-mono ${on ? tone : "is-off"}`}>
        {ret !== null ? formatSignedPct(ret) : "—"}
      </span>
    </>
  );

  if (!toggleable) {
    return <div className="nei-series-card is-static is-on">{inner}</div>;
  }
  return (
    <button
      type="button"
      className={`nei-series-card${on ? " is-on" : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {inner}
    </button>
  );
}

export function IndexChart({ liveValue, stocks, variant = "default" }: IndexChartProps) {
  const areaGradientId = `nei-area-${useId().replace(/:/g, "")}`;
  const [rangeKey, setRangeKey] = useState<RangeKey>("1Y");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [visibleBenchmarks, setVisibleBenchmarks] = useState<Set<BenchmarkKey>>(
    () => new Set(BENCHMARK_KEYS)
  );
  const [showTrifecta, setShowTrifecta] = useState(true);

  const maxDate = useMemo(() => todayISO(), []);
  const { historyData, sectorData, portfolioData, benchmarks, loading, error } = useChartHistory(
    rangeKey,
    customRange
  );

  const isReference = variant === "reference";
  const model = useIndexChartModel({
    activeMode: "index",
    focusedSector: null,
    historyData,
    portfolioData,
    benchmarks,
    liveValue,
    sectorData,
    selectedSector: "Platforms",
    stocks,
  });

  const hasTrifecta = portfolioData.length > 0;
  const availableBenchmarks = benchmarks.map((b) => b.symbol);
  const chartData = model.currentData;

  // Compute every series' return from the drawn rows, so the header %, the
  // legend cards, and the line always agree. The Max view runs from the base
  // (Dec 2020, 1,000), so its return matches the hero's "since inception".
  const returns = useMemo<SeriesReturns>(() => {
    const out: SeriesReturns = {
      NE50: getSeriesReturn(chartData, "value"),
      TRIFECTA: getSeriesReturn(chartData, "TRIFECTA"),
    };
    for (const key of BENCHMARK_KEYS) out[key] = getSeriesReturn(chartData, key);
    return out;
  }, [chartData]);

  const rangeLabel =
    rangeKey === "CUSTOM"
      ? "Custom Range"
      : `${RANGE_OPTIONS.find((o) => o.key === rangeKey)?.label} Range`;

  function handleRangeKeyChange(key: RangeKey) {
    if (key === "CUSTOM" && !customRange) {
      setCustomRange({ from: oneYearAgoISO(), to: maxDate });
    }
    setRangeKey(key);
  }

  function toggleBenchmark(key: BenchmarkKey) {
    setVisibleBenchmarks((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={isReference ? "nei-reference-chart" : "nei-chart-root"}>
      <ChartToolbar
        isReference={isReference}
        latestPoint={model.latestPoint}
        onRangeKeyChange={handleRangeKeyChange}
        rangeKey={rangeKey}
        rangeLabel={rangeLabel}
        rangeChangePct={returns.NE50}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        minDate={INDEX_ANCHOR_DATE}
        maxDate={maxDate}
        title={model.title}
      />

      {loading ? (
        <ChartState tone="loading" />
      ) : error ? (
        <ChartState tone="error">Could not load historical data.</ChartState>
      ) : model.currentData.length === 0 ? (
        <ChartState tone="empty">
          No historical data available for this range.
        </ChartState>
      ) : (
        <>
          <ChartCanvas
            activeMode="index"
            areaGradientId={areaGradientId}
            data={chartData}
            focusedSector={null}
            latestColor={model.latestColor}
            latestPoint={model.latestPoint}
            onSectorFocus={() => {}}
            selectedSector="Platforms"
            visibleBenchmarks={visibleBenchmarks}
            showTrifecta={showTrifecta && hasTrifecta}
            showBaseLine={rangeKey === "MAX"}
          />

          {(availableBenchmarks.length > 0 || hasTrifecta) && (
            <div className="nei-series-cards" role="group" aria-label="Series">
              <SeriesCard
                label="NEI Top 50"
                color={model.latestColor}
                ret={returns.NE50}
                on
                toggleable={false}
              />
              {availableBenchmarks.map((key) => (
                <SeriesCard
                  key={key}
                  label={BENCHMARK_META[key].label}
                  color={BENCHMARK_META[key].color}
                  swatchDash
                  ret={returns[key] ?? null}
                  on={visibleBenchmarks.has(key)}
                  toggleable
                  onToggle={() => toggleBenchmark(key)}
                />
              ))}
              {/* Trifecta Capital shown last — it's a portfolio, not an index. */}
              {hasTrifecta && (
                <SeriesCard
                  label="Trifecta Capital portfolio"
                  color="#E07A38"
                  ret={returns.TRIFECTA}
                  on={showTrifecta}
                  toggleable
                  onToggle={() => setShowTrifecta((v) => !v)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

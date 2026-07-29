"use client";

import { useId, useState } from "react";
import type { BenchmarkKey, HistoryRange } from "@/lib/index-api";
import { ChartCanvas } from "@/components/index-chart/ChartCanvas";
import { ChartState, ChartToolbar } from "@/components/index-chart/ChartControls";
import { BENCHMARK_KEYS, BENCHMARK_META } from "@/components/index-chart/constants";
import { useChartHistory } from "@/components/index-chart/useChartHistory";
import { useIndexChartModel } from "@/components/index-chart/useIndexChartModel";
import type { IndexChartProps } from "@/components/index-chart/types";

export function IndexChart({ liveValue, stocks, variant = "default" }: IndexChartProps) {
  const areaGradientId = `nei-area-${useId().replace(/:/g, "")}`;
  const [range, setRange] = useState<HistoryRange>("1Y");
  const [visibleBenchmarks, setVisibleBenchmarks] = useState<Set<BenchmarkKey>>(
    () => new Set(BENCHMARK_KEYS)
  );
  const [showTrifecta, setShowTrifecta] = useState(true);
  const { historyData, sectorData, portfolioData, benchmarks, loading, error } = useChartHistory(range);

  const isReference = variant === "reference";
  const model = useIndexChartModel({
    activeMode: "index",
    focusedSector: null,
    historyData,
    portfolioData,
    benchmarks,
    liveValue,
    range,
    sectorData,
    selectedSector: "Platforms",
    stocks,
  });

  const hasTrifecta = portfolioData.length > 0;

  const availableBenchmarks = benchmarks.map((b) => b.symbol);

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
        onRangeChange={setRange}
        range={range}
        rangeChangePct={model.rangeChangePct}
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
            data={model.currentData}
            focusedSector={null}
            latestColor={model.latestColor}
            latestPoint={model.latestPoint}
            onSectorFocus={() => {}}
            selectedSector="Platforms"
            visibleBenchmarks={visibleBenchmarks}
            showTrifecta={showTrifecta && hasTrifecta}
            showBaseLine={range === "ALL"}
          />

          {(availableBenchmarks.length > 0 || hasTrifecta) && (
            <div className="nei-benchmark-legend" role="group" aria-label="Benchmarks">
              <span className="nei-benchmark-chip is-nei">
                <span className="nei-benchmark-dot" style={{ background: "var(--nei-accent)" }} />
                New Economy 50
              </span>
              {hasTrifecta && (
                <button
                  type="button"
                  className={`nei-benchmark-chip${showTrifecta ? " is-on" : ""}`}
                  aria-pressed={showTrifecta}
                  onClick={() => setShowTrifecta((v) => !v)}
                >
                  <span
                    className="nei-benchmark-dot"
                    style={{ background: showTrifecta ? "#E07A38" : "transparent", borderColor: "#E07A38" }}
                  />
                  Trifecta portfolio
                </button>
              )}
              {availableBenchmarks.map((key) => {
                const on = visibleBenchmarks.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`nei-benchmark-chip${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggleBenchmark(key)}
                  >
                    <span
                      className="nei-benchmark-dot"
                      style={{ background: on ? BENCHMARK_META[key].color : "transparent", borderColor: BENCHMARK_META[key].color }}
                    />
                    {BENCHMARK_META[key].label}
                  </button>
                );
              })}
            </div>
          )}

          {showTrifecta && hasTrifecta && (
            <p className="nei-chart-note">
              Trifecta portfolio is rebased from each holding&apos;s IPO price, so it
              includes listing-day performance.
            </p>
          )}
        </>
      )}
    </div>
  );
}

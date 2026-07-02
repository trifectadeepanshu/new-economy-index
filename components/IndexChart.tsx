"use client";

import { useId, useState } from "react";
import type { HistoryRange } from "@/lib/index-api";
import { ChartCanvas } from "@/components/index-chart/ChartCanvas";
import { ChartState, ChartToolbar } from "@/components/index-chart/ChartControls";
import { useChartHistory } from "@/components/index-chart/useChartHistory";
import { useIndexChartModel } from "@/components/index-chart/useIndexChartModel";
import type { IndexChartProps } from "@/components/index-chart/types";

export function IndexChart({ liveValue, stocks, variant = "default" }: IndexChartProps) {
  const areaGradientId = `nei-area-${useId().replace(/:/g, "")}`;
  const [range, setRange] = useState<HistoryRange>("1Y");
  const { historyData, sectorData, loading, error } = useChartHistory(range);

  const isReference = variant === "reference";
  const model = useIndexChartModel({
    activeMode: "index",
    focusedSector: null,
    historyData,
    liveValue,
    range,
    sectorData,
    selectedSector: "Platforms",
    stocks,
  });

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
        <ChartCanvas
          activeMode="index"
          areaGradientId={areaGradientId}
          data={model.currentData}
          focusedSector={null}
          latestColor={model.latestColor}
          latestPoint={model.latestPoint}
          onSectorFocus={() => {}}
          selectedSector="Platforms"
        />
      )}
    </div>
  );
}

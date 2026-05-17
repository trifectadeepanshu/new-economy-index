"use client";

import { useId, useState } from "react";
import { type Sector } from "@/lib/companies";
import type { HistoryRange } from "@/lib/index-api";
import { ChartCanvas } from "@/components/index-chart/ChartCanvas";
import { ChartState, ChartToolbar, SectorTabs } from "@/components/index-chart/ChartControls";
import { useChartHistory } from "@/components/index-chart/useChartHistory";
import { useIndexChartModel } from "@/components/index-chart/useIndexChartModel";
import type { ChartMode, IndexChartProps } from "@/components/index-chart/types";

export function IndexChart({ liveValue, stocks, variant = "default" }: IndexChartProps) {
  const areaGradientId = `nei-area-${useId().replace(/:/g, "")}`;
  const [range, setRange] = useState<HistoryRange>("1Y");
  const [mode, setMode] = useState<ChartMode>("index");
  const [selectedSector, setSelectedSector] = useState<Sector>("Platforms");
  const [focusedSector, setFocusedSector] = useState<Sector | null>(null);
  const { historyData, sectorData, loading, error } = useChartHistory(range);

  const isReference = variant === "reference";
  const activeMode: ChartMode = isReference ? "index" : mode;
  const model = useIndexChartModel({
    activeMode,
    focusedSector,
    historyData,
    liveValue,
    range,
    sectorData,
    selectedSector,
    stocks,
  });

  return (
    <div className={isReference ? "nei-reference-chart" : "nei-chart-root"}>
      <ChartToolbar
        isReference={isReference}
        latestPoint={model.latestPoint}
        mode={mode}
        onModeChange={setMode}
        onRangeChange={setRange}
        range={range}
        rangeChangePct={model.rangeChangePct}
        title={model.title}
      />

      {!isReference && activeMode === "detail" && (
        <SectorTabs
          activeSector={selectedSector}
          label="Sector detail"
          onClick={setSelectedSector}
        />
      )}

      {loading ? (
        <ChartState tone="loading" />
      ) : error ? (
        <ChartState tone="error">Could not load historical data.</ChartState>
      ) : model.currentData.length === 0 ? (
        <ChartState tone="empty">
          No historical data yet - run the backfill script to populate history.
        </ChartState>
      ) : (
        <>
          <ChartCanvas
            activeMode={activeMode}
            areaGradientId={areaGradientId}
            data={model.currentData}
            focusedSector={focusedSector}
            latestColor={model.latestColor}
            latestPoint={model.latestPoint}
            onSectorFocus={setFocusedSector}
            selectedSector={selectedSector}
          />

          {!isReference && activeMode === "compare" && (
            <SectorTabs
              activeSector={model.selectedOrFocusedSector}
              focusedSector={focusedSector}
              label="Sector focus"
              onClick={(sector) =>
                setFocusedSector((current) => (current === sector ? null : sector))
              }
              onFocus={setFocusedSector}
            />
          )}
        </>
      )}
    </div>
  );
}

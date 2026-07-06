import { useMemo } from "react";
import { type Sector } from "@/lib/companies";
import type {
  BenchmarkKey,
  BenchmarkSeries,
  HistoryRange,
  IndexHistoryPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import {
  buildCompareData,
  getChartTitle,
  getLatestColor,
  getRangeChangePct,
  toChartPoint,
} from "@/components/index-chart/data";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

type ChartModelInput = {
  activeMode: ChartMode;
  focusedSector: Sector | null;
  historyData: IndexHistoryPoint[];
  benchmarks: BenchmarkSeries[];
  liveValue: number | null;
  range: HistoryRange;
  sectorData: SectorHistoryPoint[];
  selectedSector: Sector;
  stocks: StockData[];
};

export function useIndexChartModel({
  activeMode,
  focusedSector,
  historyData,
  benchmarks,
  liveValue,
  range,
  sectorData,
  selectedSector,
}: ChartModelInput) {
  const indexData = useMemo<ChartPoint[]>(() => {
    const benchByDate = new Map<string, Partial<Record<BenchmarkKey, number>>>();
    for (const b of benchmarks) {
      for (const pt of b.points) {
        const entry = benchByDate.get(pt.date) ?? {};
        entry[b.symbol] = pt.value;
        benchByDate.set(pt.date, entry);
      }
    }
    const points = historyData.map((point) => ({
      ...toChartPoint(point, range),
      ...benchByDate.get(point.date),
    }));
    return liveValue !== null && points.length
      ? [...points, { date: "now", label: "Now", value: liveValue }]
      : points;
  }, [historyData, benchmarks, liveValue, range]);

  // Sector sub-indices use the divisor engine; there's no client-side live
  // value for them, so the lines end at the latest close (no fake "Now" point).
  const compareData = useMemo<ComparePoint[]>(
    () => buildCompareData(sectorData, range),
    [range, sectorData]
  );

  const detailData = useMemo<ChartPoint[]>(
    () =>
      sectorData
        .filter((point) => point.sector === selectedSector)
        .map((point) => toChartPoint(point, range)),
    [range, sectorData, selectedSector]
  );

  const currentData: ChartRow[] =
    activeMode === "compare" ? compareData : activeMode === "detail" ? detailData : indexData;
  const singleSeriesData = activeMode === "detail" ? detailData : indexData;
  const latestPoint = singleSeriesData[singleSeriesData.length - 1];

  return {
    currentData,
    latestColor: getLatestColor(activeMode, selectedSector, latestPoint),
    latestPoint,
    rangeChangePct: getRangeChangePct(singleSeriesData),
    selectedOrFocusedSector: focusedSector ?? selectedSector,
    title: getChartTitle(activeMode, selectedSector),
  };
}

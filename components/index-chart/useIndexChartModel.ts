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
  portfolioData: IndexHistoryPoint[];
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
  portfolioData,
  benchmarks,
  liveValue,
  range,
  sectorData,
  selectedSector,
}: ChartModelInput) {
  const indexData = useMemo<ChartPoint[]>(() => {
    // Index every line to 1,000 at the first visible point of the range, so all
    // lines start together at 1,000 and the chart reads as relative performance.
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const neiFirst = historyData[0]?.value ?? null;
    const neiFactor = neiFirst ? 1000 / neiFirst : 1;

    const overlayByDate = new Map<string, Partial<Record<BenchmarkKey | "TRIFECTA", number>>>();
    const addOverlay = (key: BenchmarkKey | "TRIFECTA", pts: { date: string; value: number }[]) => {
      const first = pts[0];
      if (!first || !first.value) return;
      const factor = 1000 / first.value;
      for (const pt of pts) {
        const entry = overlayByDate.get(pt.date) ?? {};
        entry[key] = round2(pt.value * factor);
        overlayByDate.set(pt.date, entry);
      }
    };
    for (const b of benchmarks) addOverlay(b.symbol, b.points);
    addOverlay("TRIFECTA", portfolioData);

    const points = historyData.map((point) => {
      const cp = toChartPoint(point, range);
      return { ...cp, value: round2(cp.value * neiFactor), ...overlayByDate.get(point.date) };
    });
    return liveValue !== null && points.length
      ? [...points, { date: "now", label: "Now", value: round2(liveValue * neiFactor) }]
      : points;
  }, [historyData, portfolioData, benchmarks, liveValue, range]);

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

import { useMemo } from "react";
import { type Sector } from "@/lib/companies";
import type {
  BenchmarkKey,
  BenchmarkSeries,
  IndexHistoryPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import {
  buildCompareData,
  getChartTitle,
  getLatestColor,
  getRangeChangePct,
  getSeriesReturn,
  toChartPoint,
  useShortDayLabels,
} from "@/components/index-chart/data";
import { BENCHMARK_KEYS } from "@/components/index-chart/constants";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

export type SeriesReturns = {
  NE50: number | null;
  TRIFECTA: number | null;
} & Partial<Record<BenchmarkKey, number | null>>;

type ChartModelInput = {
  activeMode: ChartMode;
  focusedSector: Sector | null;
  historyData: IndexHistoryPoint[];
  portfolioData: IndexHistoryPoint[];
  benchmarks: BenchmarkSeries[];
  liveValue: number | null;
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
  sectorData,
  selectedSector,
}: ChartModelInput) {
  const shortDayIndex = useShortDayLabels(historyData);
  const shortDaySector = useShortDayLabels(sectorData);

  const indexData = useMemo<ChartPoint[]>(() => {
    // The NEI line keeps its true index level (so the chart headline matches the
    // index value shown elsewhere). Benchmarks and the Trifecta portfolio are
    // rebased to meet the NEI at the range start, so every line starts together
    // at that level and the chart reads as relative performance from there.
    const round2 = (v: number) => Math.round(v * 100) / 100;
    const neiFirst = historyData[0]?.value ?? null;

    const overlayByDate = new Map<string, Partial<Record<BenchmarkKey | "TRIFECTA", number>>>();
    const addOverlay = (key: BenchmarkKey | "TRIFECTA", pts: { date: string; value: number }[]) => {
      const first = pts[0];
      if (!first || !first.value || !neiFirst) return;
      const factor = neiFirst / first.value;
      for (const pt of pts) {
        const entry = overlayByDate.get(pt.date) ?? {};
        entry[key] = round2(pt.value * factor);
        overlayByDate.set(pt.date, entry);
      }
    };
    for (const b of benchmarks) addOverlay(b.symbol, b.points);
    addOverlay("TRIFECTA", portfolioData);

    const points = historyData.map((point) => {
      const cp = toChartPoint(point, shortDayIndex);
      return { ...cp, value: round2(cp.value), ...overlayByDate.get(point.date) };
    });
    return liveValue !== null && points.length
      ? [...points, { date: "now", label: "Now", value: round2(liveValue) }]
      : points;
  }, [historyData, portfolioData, benchmarks, liveValue, shortDayIndex]);

  // Sector sub-indices use the divisor engine; there's no client-side live
  // value for them, so the lines end at the latest close (no fake "Now" point).
  const compareData = useMemo<ComparePoint[]>(
    () => buildCompareData(sectorData, shortDaySector),
    [sectorData, shortDaySector]
  );

  const detailData = useMemo<ChartPoint[]>(
    () =>
      sectorData
        .filter((point) => point.sector === selectedSector)
        .map((point) => toChartPoint(point, shortDaySector)),
    [sectorData, selectedSector, shortDaySector]
  );

  // Per-series % change over the visible window, for the legend cards. Rebasing
  // preserves ratios, so returns read off the (rebased) chart rows are exact.
  const seriesReturns = useMemo<SeriesReturns>(() => {
    const rows: ChartRow[] = indexData;
    const out: SeriesReturns = {
      NE50: getSeriesReturn(rows, "value"),
      TRIFECTA: getSeriesReturn(rows, "TRIFECTA"),
    };
    for (const key of BENCHMARK_KEYS) out[key] = getSeriesReturn(rows, key);
    return out;
  }, [indexData]);

  const currentData: ChartRow[] =
    activeMode === "compare" ? compareData : activeMode === "detail" ? detailData : indexData;
  const singleSeriesData = activeMode === "detail" ? detailData : indexData;
  const latestPoint = singleSeriesData[singleSeriesData.length - 1];

  return {
    currentData,
    latestColor: getLatestColor(activeMode, selectedSector, latestPoint),
    latestPoint,
    rangeChangePct: getRangeChangePct(singleSeriesData),
    seriesReturns,
    selectedOrFocusedSector: focusedSector ?? selectedSector,
    title: getChartTitle(activeMode, selectedSector),
  };
}

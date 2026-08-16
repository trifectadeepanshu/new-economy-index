import { useMemo } from "react";
import { INDEX_ANCHOR_DATE, type Sector } from "@/lib/companies";
import { getISTDate } from "@/lib/market-hours";
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
  toChartPoint,
  useShortDayLabels,
} from "@/components/index-chart/data";
import { formatLabel } from "@/components/index-chart/format";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

// The base is the year-end 2020 close; we label it as the Jan 2021 inception
// so the axis/tooltip match the "Base 1,000, set in January 2021" copy.
const INCEPTION_LABEL_DATE = "2021-01-01";

export type SeriesReturns = {
  NE50: number | null;
  TRIFECTA: number | null;
} & Partial<Record<BenchmarkKey, number | null>>;

type ChartModelInput = {
  activeMode: ChartMode;
  focusedSector: Sector | null;
  historyData: IndexHistoryPoint[];
  includeLivePoint: boolean;
  portfolioData: IndexHistoryPoint[];
  benchmarks: BenchmarkSeries[];
  liveValue: number | null;
  sectorData: SectorHistoryPoint[];
  selectedSector: Sector;
  stocks: StockData[];
};

type OverlayKey = BenchmarkKey | "TRIFECTA";

export function buildIndexChartData({
  historyData,
  portfolioData,
  benchmarks,
  liveValue,
  shortDayIndex,
  includeLivePoint,
  todayDate = getISTDate(),
}: {
  historyData: IndexHistoryPoint[];
  portfolioData: IndexHistoryPoint[];
  benchmarks: BenchmarkSeries[];
  liveValue: number | null;
  shortDayIndex: boolean;
  includeLivePoint: boolean;
  todayDate?: string;
}): ChartPoint[] {
  const round2 = (value: number) => Math.round(value * 100) / 100;
  const neiByDate = new Map(historyData.map((point) => [point.date, Number(point.value)]));
  const overlayByDate = new Map<string, Partial<Record<OverlayKey, number>>>();
  const latestOverlayValues: Partial<Record<OverlayKey, number>> = {};

  const addOverlay = (key: OverlayKey, points: { date: string; value: number }[]) => {
    const firstShared = points.find((point) => {
      const neiValue = neiByDate.get(point.date);
      return (
        point.value > 0 &&
        Number.isFinite(point.value) &&
        typeof neiValue === "number" &&
        neiValue > 0
      );
    });
    if (!firstShared) return;

    const factor = neiByDate.get(firstShared.date)! / firstShared.value;
    for (const point of points) {
      if (!(point.value > 0) || !Number.isFinite(point.value)) continue;

      const scaled = round2(point.value * factor);
      latestOverlayValues[key] = scaled;
      if (!neiByDate.has(point.date)) continue;

      const entry = overlayByDate.get(point.date) ?? {};
      entry[key] = scaled;
      overlayByDate.set(point.date, entry);
    }
  };

  for (const benchmark of benchmarks) addOverlay(benchmark.symbol, benchmark.points);
  addOverlay("TRIFECTA", portfolioData);

  const points = historyData.map((point) => {
    const chartPoint = toChartPoint(point, shortDayIndex);
    const label =
      point.date === INDEX_ANCHOR_DATE
        ? formatLabel(INCEPTION_LABEL_DATE, shortDayIndex)
        : chartPoint.label;
    return {
      ...chartPoint,
      label,
      value: round2(chartPoint.value),
      ...overlayByDate.get(point.date),
    };
  });

  if (!includeLivePoint || liveValue === null || !points.length) return points;

  const live = round2(liveValue);
  const last = points[points.length - 1];
  if (last.date >= todayDate) {
    return [...points.slice(0, -1), { ...latestOverlayValues, ...last, value: live }];
  }

  return [...points, { date: "now", label: "Now", value: live, ...latestOverlayValues }];
}

export function useIndexChartModel({
  activeMode,
  focusedSector,
  historyData,
  includeLivePoint,
  portfolioData,
  benchmarks,
  liveValue,
  sectorData,
  selectedSector,
}: ChartModelInput) {
  const shortDayIndex = useShortDayLabels(historyData);
  const shortDaySector = useShortDayLabels(sectorData);

  const indexData = useMemo<ChartPoint[]>(
    () =>
      buildIndexChartData({
        historyData,
        portfolioData,
        benchmarks,
        liveValue,
        shortDayIndex,
        includeLivePoint,
      }),
    [historyData, portfolioData, benchmarks, liveValue, shortDayIndex, includeLivePoint]
  );

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

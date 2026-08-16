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
import { BENCHMARK_KEYS } from "@/components/index-chart/constants";
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
    // index value shown elsewhere). Benchmarks and the Trifecta Capital portfolio are
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
      const label =
        point.date === INDEX_ANCHOR_DATE ? formatLabel(INCEPTION_LABEL_DATE, shortDayIndex) : cp.label;
      return { ...cp, label, value: round2(cp.value), ...overlayByDate.get(point.date) };
    });

    if (liveValue === null || !points.length) return points;

    // Stitch the live value onto the right edge. If today's close is already the
    // last point (post-snapshot), update it in place instead of appending a
    // separate "Now" point — appending both left a duplicate dangling past the
    // real end date (the 1M "end date doesn't align" bug).
    const live = round2(liveValue);
    const last = points[points.length - 1];
    if (Math.abs(last.value - live) < 0.01) return points;
    if (last.date >= getISTDate()) {
      return [...points.slice(0, -1), { ...last, value: live }];
    }
    // Carry the benchmark/portfolio values forward to the "Now" point (their
    // last close) so every line reaches "Now" together — only the NEI has a
    // live intraday value; the others are end-of-day.
    const carried: Partial<Record<BenchmarkKey | "TRIFECTA", number>> = {};
    for (const key of [...BENCHMARK_KEYS, "TRIFECTA"] as (BenchmarkKey | "TRIFECTA")[]) {
      const v = last[key];
      if (typeof v === "number") carried[key] = v;
    }
    return [...points, { date: "now", label: "Now", value: live, ...carried }];
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

import { useMemo } from "react";
import { SECTORS, type Sector } from "@/lib/companies";
import type { HistoryRange, IndexHistoryPoint, SectorHistoryPoint, StockData } from "@/lib/index-api";
import {
  buildCompareData,
  getChartTitle,
  getLatestColor,
  getLiveSectorValues,
  getRangeChangePct,
  toChartPoint,
} from "@/components/index-chart/data";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

type ChartModelInput = {
  activeMode: ChartMode;
  focusedSector: Sector | null;
  historyData: IndexHistoryPoint[];
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
  liveValue,
  range,
  sectorData,
  selectedSector,
  stocks,
}: ChartModelInput) {
  const liveSectorValues = useMemo(() => getLiveSectorValues(stocks), [stocks]);

  const indexData = useMemo<ChartPoint[]>(() => {
    const points = historyData.map((point) => toChartPoint(point, range));
    return liveValue !== null && points.length
      ? [...points, { date: "now", label: "Now", value: liveValue }]
      : points;
  }, [historyData, liveValue, range]);

  const compareData = useMemo<ComparePoint[]>(() => {
    const points = buildCompareData(sectorData, range);
    const hasLiveValues = SECTORS.some((sector) => liveSectorValues[sector] !== undefined);

    return hasLiveValues && points.length
      ? [...points, { date: "now", label: "Now", ...liveSectorValues }]
      : points;
  }, [liveSectorValues, range, sectorData]);

  const detailData = useMemo<ChartPoint[]>(() => {
    const points = sectorData
      .filter((point) => point.sector === selectedSector)
      .map((point) => toChartPoint(point, range));
    const liveSectorValue = liveSectorValues[selectedSector];

    return liveSectorValue !== undefined && points.length
      ? [...points, { date: "now", label: "Now", value: liveSectorValue }]
      : points;
  }, [liveSectorValues, range, sectorData, selectedSector]);

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

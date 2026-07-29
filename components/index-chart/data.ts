import { INDEX_BASE_VALUE, SECTORS, type Sector } from "@/lib/companies";
import type {
  HistoryRange,
  IndexHistoryPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import { round } from "@/lib/index-math";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { formatLabel } from "@/components/index-chart/format";
import type { ChartMode, ChartPoint, ComparePoint } from "@/components/index-chart/types";

const SECTOR_SET = new Set<string>(SECTORS);

export function toChartPoint(
  point: IndexHistoryPoint | SectorHistoryPoint,
  range: HistoryRange
): ChartPoint {
  return {
    date: point.date,
    label: formatLabel(point.date, range),
    value: Number(point.value),
  };
}

export function getRangeChangePct(points: ChartPoint[]) {
  const first = points[0];
  const latest = points[points.length - 1];
  return first && latest ? ((latest.value - first.value) / first.value) * 100 : null;
}

export function getChartTitle(mode: ChartMode, sector: Sector) {
  if (mode === "detail") return `${sector} performance`;
  return mode === "compare" ? "Sector compare" : "New Economy 50 performance";
}

export function getLatestColor(mode: ChartMode, sector: Sector, latest?: ChartPoint) {
  if (mode === "detail") return SECTOR_CHART_COLORS[sector];
  return latest && latest.value < INDEX_BASE_VALUE ? "var(--nei-neg)" : "var(--nei-accent)";
}

export function buildCompareData(
  sectorData: SectorHistoryPoint[],
  range: HistoryRange
): ComparePoint[] {
  const byDate = new Map<string, ComparePoint>();

  for (const point of sectorData) {
    const row = byDate.get(point.date) ?? {
      date: point.date,
      label: formatLabel(point.date, range),
    };

    row[point.sector] = Number(point.value);
    byDate.set(point.date, row);
  }

  return Array.from(byDate.values());
}

export function getLiveSectorValues(stocks: StockData[]) {
  const totals = new Map<Sector, { ratioTotal: number; count: number }>();

  for (const { ratio, sector } of stocks) {
    if (typeof ratio !== "number" || !Number.isFinite(ratio) || !SECTOR_SET.has(sector)) {
      continue;
    }

    const typedSector = sector as Sector;
    const total = totals.get(typedSector) ?? { ratioTotal: 0, count: 0 };
    total.ratioTotal += ratio;
    total.count += 1;
    totals.set(typedSector, total);
  }

  const values: Partial<Record<Sector, number>> = {};
  for (const [sector, total] of totals) {
    values[sector] = round(INDEX_BASE_VALUE * (total.ratioTotal / total.count));
  }

  return values;
}

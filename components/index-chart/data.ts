import { INDEX_BASE_VALUE, type Sector } from "@/lib/companies";
import type {
  IndexHistoryPoint,
  SectorHistoryPoint,
} from "@/lib/index-api";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { formatLabel } from "@/components/index-chart/format";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

/** Day-level labels read well up to ~45 days; longer spans switch to months. */
export function useShortDayLabels(points: { date: string }[]): boolean {
  if (points.length < 2) return true;
  const first = new Date(points[0].date).getTime();
  const last = new Date(points[points.length - 1].date).getTime();
  const days = (last - first) / 86_400_000;
  return days <= 45;
}

export function toChartPoint(
  point: IndexHistoryPoint | SectorHistoryPoint,
  shortDay: boolean
): ChartPoint {
  return {
    date: point.date,
    label: formatLabel(point.date, shortDay),
    value: Number(point.value),
  };
}

export function getRangeChangePct(points: ChartPoint[]) {
  const first = points[0];
  const latest = points[points.length - 1];
  return first && latest ? ((latest.value - first.value) / first.value) * 100 : null;
}

/** First→last percentage change of one series key across the chart rows. */
export function getSeriesReturn(rows: ChartRow[], key: string): number | null {
  let first: number | null = null;
  let last: number | null = null;
  for (const row of rows) {
    const v = (row as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      if (first === null) first = v;
      last = v;
    }
  }
  return first !== null && last !== null && first !== 0 ? (last / first - 1) * 100 : null;
}

export type ChartSize = "small" | "medium" | "large";

export type ChartLayout = {
  size: ChartSize;
  maxXTicks: number;
  yTickCount: number;
  yAxisWidth: number;
  tickFontSize: number;
  showLatestLabel: boolean;
  margin: { top: number; right: number; bottom: number; left: number };
};

const CHART_LAYOUTS: Record<ChartSize, ChartLayout> = {
  small: {
    size: "small",
    maxXTicks: 4,
    yTickCount: 4,
    yAxisWidth: 42,
    tickFontSize: 10,
    showLatestLabel: false,
    margin: { top: 12, right: 10, bottom: 4, left: -6 },
  },
  medium: {
    size: "medium",
    maxXTicks: 7,
    yTickCount: 5,
    yAxisWidth: 50,
    tickFontSize: 10,
    showLatestLabel: true,
    margin: { top: 14, right: 58, bottom: 2, left: -2 },
  },
  large: {
    size: "large",
    maxXTicks: 11,
    yTickCount: 6,
    yAxisWidth: 58,
    tickFontSize: 11,
    showLatestLabel: true,
    margin: { top: 16, right: 42, bottom: 0, left: 0 },
  },
};

/** Chart density follows the rendered container, not the whole viewport. */
export function getChartLayout(width: number): ChartLayout {
  if (width <= 640) return CHART_LAYOUTS.small;
  if (width <= 1024) return CHART_LAYOUTS.medium;
  return CHART_LAYOUTS.large;
}

/**
 * Choose unique date keys for the x-axis while deduplicating their display
 * labels. Using labels as data keys collapses every day in a month onto the
 * same category and causes the mobile axis pile-up seen on long ranges.
 */
export function getAxisTicks(
  rows: { date: string; label: string }[],
  maxTicks = 14
): string[] {
  if (!rows.length || maxTicks <= 0) return [];
  const firstDateOfLabel = new Map<string, string>();
  const firstIndexOfLabel = new Map<string, number>();
  rows.forEach((row, i) => {
    if (!firstDateOfLabel.has(row.label)) {
      firstDateOfLabel.set(row.label, row.date);
      firstIndexOfLabel.set(row.label, i);
    }
  });
  const uniqueLabels = [...firstDateOfLabel.keys()];

  if (maxTicks === 1) {
    return [firstDateOfLabel.get(uniqueLabels[uniqueLabels.length - 1])!];
  }

  const picked =
    uniqueLabels.length <= maxTicks
      ? uniqueLabels
      : (() => {
          const step = (uniqueLabels.length - 1) / (maxTicks - 1);
          return Array.from({ length: maxTicks }, (_, i) => uniqueLabels[Math.round(i * step)]);
        })();

  // A pick like "Now" — appended as a single synthetic row right after the
  // last real trading day — can land almost on top of the preceding month's
  // tick. Walk back from the end (always keeping the last tick) and drop any
  // earlier pick whose row is too close to the nearest kept tick, rather than
  // letting their text overlap.
  const minGap = (rows.length / maxTicks) * 0.4;
  const kept = [picked[picked.length - 1]];
  for (let i = picked.length - 2; i >= 0; i--) {
    if (firstIndexOfLabel.get(kept[0])! - firstIndexOfLabel.get(picked[i])! >= minGap) {
      kept.unshift(picked[i]);
    }
  }
  return kept.map((label) => firstDateOfLabel.get(label)!);
}

export function getChartTitle(mode: ChartMode, sector: Sector) {
  if (mode === "detail") return `${sector} performance`;
  return mode === "compare" ? "Sector compare" : "NEI Top 50 performance";
}

export function getLatestColor(mode: ChartMode, sector: Sector, latest?: ChartPoint) {
  if (mode === "detail") return SECTOR_CHART_COLORS[sector];
  return latest && latest.value < INDEX_BASE_VALUE ? "var(--nei-neg)" : "var(--nei-accent)";
}

export function buildCompareData(
  sectorData: SectorHistoryPoint[],
  shortDay: boolean
): ComparePoint[] {
  const byDate = new Map<string, ComparePoint>();

  for (const point of sectorData) {
    const row = byDate.get(point.date) ?? {
      date: point.date,
      label: formatLabel(point.date, shortDay),
    };

    row[point.sector] = Number(point.value);
    byDate.set(point.date, row);
  }

  return Array.from(byDate.values());
}

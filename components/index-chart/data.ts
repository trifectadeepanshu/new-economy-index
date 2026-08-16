import { INDEX_BASE_VALUE, SECTORS, type Sector } from "@/lib/companies";
import type {
  IndexHistoryPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";
import { round } from "@/lib/index-math";
import { SECTOR_CHART_COLORS } from "@/components/index-chart/constants";
import { formatLabel } from "@/components/index-chart/format";
import type { ChartMode, ChartPoint, ChartRow, ComparePoint } from "@/components/index-chart/types";

const SECTOR_SET = new Set<string>(SECTORS);

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

/**
 * Which x-axis values should render as ticks. The chart uses unique `date`
 * values for positioning, while `label` is display text. For long ranges many
 * rows share the same month label, so choose one date per visible label.
 */
export function getAxisTicks(rows: { date: string; label: string }[], maxTicks = 14): string[] {
  if (!rows.length) return [];
  const firstDateOfLabel = new Map<string, string>();
  const firstIndexOfLabel = new Map<string, number>();
  rows.forEach((row, i) => {
    if (!firstDateOfLabel.has(row.label)) {
      firstDateOfLabel.set(row.label, row.date);
      firstIndexOfLabel.set(row.label, i);
    }
  });
  const uniqueLabels = [...firstDateOfLabel.keys()];

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

import { INDEX_BASE_VALUE } from "@/lib/companies";
import type { IndexHistoryPoint } from "@/lib/index-api";

export type HeroSparkPoint = Pick<IndexHistoryPoint, "date" | "value">;

export function buildHeroSeries(
  sparkPoints: HeroSparkPoint[],
  indexValue: number | null,
  todayDate: string
) {
  const values = sparkPoints.map((point) => point.value);

  if (!values.length) {
    return indexValue === null ? [] : [INDEX_BASE_VALUE, indexValue];
  }

  if (indexValue === null) return values;

  const latestPoint = sparkPoints[sparkPoints.length - 1];
  if (Math.abs(latestPoint.value - indexValue) < 0.01) return values;

  if (latestPoint.date >= todayDate) {
    return [...values.slice(0, -1), indexValue];
  }

  return [...values, indexValue];
}

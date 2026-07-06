import type { Sector } from "@/lib/companies";
import type {
  BenchmarkKey,
  BenchmarkSeries,
  HistoryRange,
  IndexHistoryPoint,
  SectorHistoryPoint,
  StockData,
} from "@/lib/index-api";

export type ChartMode = "index" | "compare" | "detail";
export type ChartVariant = "default" | "reference";

export type ChartPoint = {
  date: string;
  label: string;
  value: number;
} & Partial<Record<BenchmarkKey, number>>;

export type ComparePoint = {
  date: string;
  label: string;
} & Partial<Record<Sector, number>>;

export type ChartRow = ChartPoint | ComparePoint;

export type HistoryState = {
  range: HistoryRange | null;
  historyData: IndexHistoryPoint[];
  sectorData: SectorHistoryPoint[];
  benchmarks: BenchmarkSeries[];
  error: string | null;
};

export type IndexChartProps = {
  liveValue: number | null;
  stocks: StockData[];
  variant?: ChartVariant;
};

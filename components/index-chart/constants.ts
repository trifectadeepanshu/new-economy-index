import type { Sector } from "@/lib/companies";
import type { BenchmarkKey } from "@/lib/index-api";

export const BENCHMARK_META: Record<BenchmarkKey, { label: string; color: string; dash: string }> = {
  NIFTY50: { label: "Nifty 50", color: "#8678F2", dash: "2 3" },
  NIFTY500: { label: "Nifty 500", color: "#748196", dash: "5 4" },
};

export const BENCHMARK_KEYS: BenchmarkKey[] = ["NIFTY50", "NIFTY500"];

/** Range selector options: presets + Max (all history) + Custom date window. */
export const RANGE_OPTIONS = [
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "1Y", label: "1Y" },
  { key: "MAX", label: "Max" },
  { key: "CUSTOM", label: "Custom" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

/** Map a range selector key to the preset window the API understands. */
export const RANGE_KEY_TO_API: Record<Exclude<RangeKey, "CUSTOM">, "1W" | "1M" | "1Y" | "ALL"> = {
  "1W": "1W",
  "1M": "1M",
  "1Y": "1Y",
  MAX: "ALL",
};

export const CHART_HEIGHT = 330;

export const CHART_MODES = [
  { value: "index", label: "Index" },
  { value: "compare", label: "Sector Compare" },
  { value: "detail", label: "Sector Detail" },
] as const;

// Brighter, more saturated categorical palette for readability on the light
// sector section (dots, weight bars, sparklines, sector sub-index lines).
export const SECTOR_CHART_COLORS: Record<Sector, string> = {
  Platforms: "#2B62C4",
  "Consumer Brands": "#E36A3C",
  Fintech: "#1E9E54",
  B2B: "#1C9BC7",
  SaaS: "#7B5AD1",
  Healthcare: "#12A386",
  "Deep Tech": "#707A8C",
};

import type { Sector } from "@/lib/companies";

export const CHART_HEIGHT = 330;

export const CHART_MODES = [
  { value: "index", label: "Index" },
  { value: "compare", label: "Sector Compare" },
  { value: "detail", label: "Sector Detail" },
] as const;

export const SECTOR_CHART_COLORS: Record<Sector, string> = {
  Platforms: "#1E3A5F",
  "Consumer Brands": "#B45A2E",
  Fintech: "#2C6E3C",
  B2B: "#346C8C",
  BFSI: "#8B5D77",
  Software: "#5E5A8A",
  Others: "#747B86",
};

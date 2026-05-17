import { INDEX_BASE_DATE } from "@/lib/companies";
export { formatMarketCap } from "@/lib/formatters";

export const INCEPTION_LABEL = new Date(`${INDEX_BASE_DATE}T00:00:00+05:30`).toLocaleString(
  "en-IN",
  { month: "short", year: "numeric", timeZone: "Asia/Kolkata" }
);

export function formatNumber(value: number | null, digits = 2) {
  if (value === null || Number.isNaN(value)) return "—";

  return value.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

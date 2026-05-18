export { formatMarketCap } from "@/lib/formatters";

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

import { format, parseISO } from "date-fns";
import { INDEX_BASE_VALUE } from "@/lib/companies";
import type { HistoryRange } from "@/lib/index-api";

export function formatLabel(date: string, range: HistoryRange) {
  return format(parseISO(date), range === "1W" || range === "1M" ? "dd MMM" : "MMM ''yy");
}

export function formatValue(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatSignedPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatPctFromBase(value: number) {
  return formatSignedPct(((value - INDEX_BASE_VALUE) / INDEX_BASE_VALUE) * 100);
}
